import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Card } from '../engine/cards'
import { bastoni, coppe, denari, spade } from '../engine/cards'
import type { Move, State } from '../engine/state'
import { useMultiplayerSession } from './useMultiplayerSession'

type SocketOptions = {
  readonly enabled?: boolean
  readonly query?: { readonly sid?: string }
  readonly onOpen?: () => void
  readonly onMessage?: (event: MessageEvent<string>) => void
}

const mockedSocket = vi.hoisted(() => ({
  options: null as SocketOptions | null,
  calls: [] as SocketOptions[],
  send: vi.fn(),
}))

vi.mock('partysocket/react', () => ({
  usePartySocket: vi.fn((options: SocketOptions) => {
    mockedSocket.options = options
    mockedSocket.calls.push(options)
    return { send: mockedSocket.send }
  }),
}))

const baseState: State = {
  state: 'play',
  turn: 0,
  firstPlayer: 0,
  pile: [],
  players: [
    { id: 0, hand: [denari(1)], pile: [], scope: 0 },
    { id: 1, hand: [coppe(2)], pile: [], scope: 0 },
  ],
  table: [spade(3)],
  lastTaken: [],
  score: [0, 0],
}

function move(card: Card = bastoni(4)): Move {
  return { card, take: [] }
}

function renderSession() {
  window.sessionStorage.setItem('scopa:mp-sid-room', 'sid')
  window.sessionStorage.setItem('scopa:mp-avatar-room', 'avatar')
  return renderHook(() => useMultiplayerSession({ roomId: 'room' }))
}

function receive(message: unknown) {
  act(() => {
    mockedSocket.options?.onMessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))
  })
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
  mockedSocket.options = null
  mockedSocket.calls = []
  mockedSocket.send.mockReset()
  vi.restoreAllMocks()
})

describe('useMultiplayerSession', () => {
  test('persists a session id and enables the socket with it', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000000')

    renderHook(() => useMultiplayerSession({ roomId: 'room', initialAvatar: 'avatar' }))

    expect(mockedSocket.calls[0]?.enabled).toBe(false)

    await waitFor(() => {
      expect(mockedSocket.options?.enabled).toBe(true)
    })

    expect(window.sessionStorage.getItem('scopa:mp-sid-room')).toBe('00000000-0000-0000-0000-000000000000')
    expect(mockedSocket.options?.query).toEqual({ sid: '00000000-0000-0000-0000-000000000000' })
  })

  test('captures an avatar from the initial seed and persists it', async () => {
    window.history.replaceState({}, '', '/?room=room&avatar=avatar')

    const { result } = renderHook(() => useMultiplayerSession({ roomId: 'room', initialAvatar: 'avatar' }))

    await waitFor(() => {
      expect(result.current.avatar).toBe('avatar')
    })

    expect(window.sessionStorage.getItem('scopa:mp-avatar-room')).toBe('avatar')
  })

  test('joins with the avatar after the socket opens', async () => {
    renderSession()

    act(() => {
      mockedSocket.options?.onOpen?.()
    })

    expect(mockedSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'join', avatar: 'avatar' }))
  })

  test('resolves immediately with a move received before the hook asks for one', async () => {
    const { result } = renderSession()
    const firstMove = move()

    receive({ type: 'move', move: firstMove })

    await expect(result.current.nextMove()).resolves.toEqual(firstMove)
  })

  test('stays pending until a move arrives', async () => {
    const { result } = renderSession()
    const settled = vi.fn()
    const firstMove = move()

    const asked = result.current.nextMove().then(settled)
    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()

    receive({ type: 'move', move: firstMove })
    await asked

    expect(settled).toHaveBeenCalledWith(firstMove)
  })

  test('serves buffered moves in arrival order', async () => {
    const { result } = renderSession()
    const firstMove = move(denari(5))
    const secondMove = move(coppe(6))
    const thirdMove = move(spade(7))

    receive({ type: 'move', move: firstMove })
    receive({ type: 'move', move: secondMove })
    receive({ type: 'move', move: thirdMove })

    await expect(result.current.nextMove()).resolves.toEqual(firstMove)
    await expect(result.current.nextMove()).resolves.toEqual(secondMove)
    await expect(result.current.nextMove()).resolves.toEqual(thirdMove)
  })

  test('gives the next move to the most recent ask when an earlier ask was abandoned', async () => {
    const { result } = renderSession()
    const current = result.current.nextMove()
    const replacement = result.current.nextMove()
    const firstMove = move()

    void current
    receive({ type: 'move', move: firstMove })

    await expect(replacement).resolves.toEqual(firstMove)
  })

  test('serves later asks in order after a superseded ask is discarded', async () => {
    const { result } = renderSession()
    const current = result.current.nextMove()
    const firstMove = move(denari(8))
    const secondMove = move(coppe(9))

    void current
    const replacement = result.current.nextMove()
    receive({ type: 'move', move: firstMove })
    receive({ type: 'move', move: secondMove })

    await expect(replacement).resolves.toEqual(firstMove)
    await expect(result.current.nextMove()).resolves.toEqual(secondMove)
  })

  test('serves a waiting ask before buffering later moves', async () => {
    const { result } = renderSession()
    const asked = result.current.nextMove()
    const firstMove = move(denari(10))
    const secondMove = move(coppe(1))

    receive({ type: 'move', move: firstMove })
    receive({ type: 'move', move: secondMove })

    await expect(asked).resolves.toEqual(firstMove)
    await expect(result.current.nextMove()).resolves.toEqual(secondMove)
  })

  test('drops buffered moves when a state snapshot arrives', async () => {
    const { result } = renderSession()
    const staleMove = move(denari(2))
    const freshMove = move(coppe(3))

    receive({ type: 'move', move: staleMove })
    receive({ type: 'state', state: baseState })
    receive({ type: 'move', move: freshMove })

    await expect(result.current.nextMove()).resolves.toEqual(freshMove)
  })

  test('keeps a pending ask alive across a state snapshot', async () => {
    const { result } = renderSession()
    const settled = vi.fn()
    const firstMove = move(spade(4))

    const asked = result.current.nextMove().then(settled)
    receive({ type: 'state', state: baseState })
    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()

    receive({ type: 'move', move: firstMove })
    await asked

    expect(settled).toHaveBeenCalledWith(firstMove)
  })

  test('remembers the room once seated, so the title screen can offer to resume it', () => {
    renderSession()

    receive({
      type: 'lobby',
      size: 2,
      host: 0,
      seats: [
        { avatar: '🦊', connected: true, confirmed: false },
        { avatar: '🐵', connected: true, confirmed: false },
      ],
    })
    receive({ type: 'seated', index: 0 })
    receive({ type: 'state', state: { ...baseState, score: [3, 1] } })

    expect(JSON.parse(window.sessionStorage.getItem('scopa:mp-active-room') ?? 'null')).toEqual({
      roomId: 'room',
      avatars: ['🦊', '🐵'],
      score: [3, 1],
      size: 2,
    })
  })

  test('forgets the room once the server ends it', () => {
    renderSession()

    receive({ type: 'seated', index: 0 })
    receive({ type: 'ended' })

    expect(window.sessionStorage.getItem('scopa:mp-active-room')).toBeNull()
  })

  test('forgets the room when the session is explicitly cleared', () => {
    const { result } = renderSession()

    receive({ type: 'seated', index: 0 })
    act(() => result.current.clearSession())

    expect(window.sessionStorage.getItem('scopa:mp-active-room')).toBeNull()
  })

  test('sends the requested room size when joining', async () => {
    renderHook(() => useMultiplayerSession({ roomId: 'r', initialAvatar: '🐵', size: 4 }))

    await waitFor(() => expect(mockedSocket.options?.enabled).toBe(true))
    act(() => mockedSocket.options?.onOpen?.())

    expect(mockedSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'join', avatar: '🐵', size: 4 }))
  })

  test('sends the requested difficulty when creating a room', async () => {
    renderHook(() => useMultiplayerSession({ roomId: 'r', initialAvatar: '🐵', size: 4, difficulty: 'expert' }))

    await waitFor(() => expect(mockedSocket.options?.enabled).toBe(true))
    act(() => mockedSocket.options?.onOpen?.())

    expect(mockedSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'join', avatar: '🐵', size: 4, difficulty: 'expert' }),
    )
  })

  test('exposes vacant seats as nulls', async () => {
    const { result } = renderHook(() => useMultiplayerSession({ roomId: 'r', initialAvatar: '🐵' }))

    await waitFor(() => expect(mockedSocket.options?.enabled).toBe(true))
    act(() =>
      mockedSocket.options?.onMessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'lobby',
            size: 4,
            host: 0,
            seats: [{ avatar: '🐵', connected: true, confirmed: false }, null, null, null],
          }),
        }),
      ),
    )

    expect(result.current.seats).toEqual([{ avatar: '🐵', connected: true, confirmed: false }, null, null, null])
    expect(result.current.size).toBe(4)
    expect(result.current.host).toBe(0)
  })

  test('asks the room for a seat', async () => {
    const { result } = renderHook(() => useMultiplayerSession({ roomId: 'r', initialAvatar: '🐵' }))

    await waitFor(() => expect(mockedSocket.options?.enabled).toBe(true))
    act(() => result.current.sit(2))

    expect(mockedSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'sit', seat: 2 }))
  })
})
