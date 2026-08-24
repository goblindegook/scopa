import type * as Party from 'partykit/server'
import { describe, expect, test } from 'vitest'
import { move } from '../engine/opponent'
import type { State } from '../engine/state'
import ScopaServer from './scopa'
import { createTestRoom, send } from './testRoom'

// The contract of the AI chain: when the Worker finishes handling a message, nobody is
// waiting on a seat that cannot act. Holds for every deal, so no seeding is needed.
// Returns a description rather than a boolean so a failure names the stuck seat instead
// of reporting "expected false to be true".
type TurnRest = 'human' | 'round over' | 'no humans left' | `stuck on seat ${number}`

const whoIsTheTurnWaitingOn = (stored: unknown): TurnRest => {
  const room = stored as {
    seats: ({ connected: boolean; ai?: boolean } | null)[]
    game: { state: string; turn: number } | null
  }
  if (!room.game || room.game.state !== 'play') return 'round over'
  if (!room.seats.some((seat) => seat?.connected === true && seat.ai !== true)) return 'no humans left'
  const seat = room.seats[room.game.turn]
  return seat?.connected === true && seat.ai !== true ? 'human' : `stuck on seat ${room.game.turn}`
}

const startedRoom = async () => {
  const testRoom = createTestRoom()
  const server = new ScopaServer(testRoom.room)
  const host = await testRoom.open(server, 'sid-a')
  await send(server, host.connection, { type: 'join', avatar: '🐵', size: 2 })
  const guest = await testRoom.open(server, 'sid-b')
  await send(server, guest.connection, { type: 'join', avatar: '🐶' })
  return { testRoom, server, host, guest }
}

const roomOfFour = async () => {
  const testRoom = createTestRoom()
  const server = new ScopaServer(testRoom.room)
  const host = await testRoom.open(server, 'sid-a')
  await send(server, host.connection, { type: 'join', avatar: '🐵', size: 4 })
  const guest = await testRoom.open(server, 'sid-b')
  await send(server, guest.connection, { type: 'join', avatar: '🐶' })
  return { testRoom, server, host, guest }
}

const lastOfType = (messages: readonly unknown[], type: string) =>
  messages.filter((message) => (message as { type: string }).type === type).at(-1)

const forceStopRoom = async (
  testRoom: ReturnType<typeof createTestRoom>,
  confirmed: readonly [boolean, boolean, boolean, boolean],
) => {
  const room = testRoom.stored() as {
    size: number
    difficulty: string
    hostSid: string
    seats: readonly ({ confirmed: boolean } | null)[]
    game: State
  }
  await testRoom.room.storage.put('room', {
    ...room,
    seats: room.seats.map((seat, index) => (seat === null ? null : { ...seat, confirmed: confirmed[index] })),
    game: { ...room.game, state: 'stop' },
  })
}

describe('joining', () => {
  test('seats the creator at index 0 and tells them so', async () => {
    const testRoom = createTestRoom()
    const server = new ScopaServer(testRoom.room)
    const host = await testRoom.open(server, 'sid-a')

    await send(server, host.connection, { type: 'join', avatar: '🐵', size: 2 })

    expect(lastOfType(host.received, 'seated')).toEqual({ type: 'seated', index: 0 })
  })

  test('broadcasts a lobby holding both players', async () => {
    const { testRoom } = await startedRoom()

    expect(lastOfType(testRoom.broadcasts, 'lobby')).toEqual({
      type: 'lobby',
      size: 2,
      host: 0,
      seats: [
        { avatar: '🐵', connected: true, confirmed: false },
        { avatar: '🐶', connected: true, confirmed: false },
      ],
    })
  })
})

describe('starting', () => {
  test('broadcasts a playable state when the host starts a full room', async () => {
    const { testRoom, server, host } = await startedRoom()

    await send(server, host.connection, { type: 'start' })

    const state = lastOfType(testRoom.broadcasts, 'state') as { state: { state: string; players: unknown[] } }
    expect([state.state.state, state.state.players.length]).toEqual(['play', 2])
  })

  test('refuses a start from anyone but the host', async () => {
    const { server, guest } = await startedRoom()

    await send(server, guest.connection, { type: 'start' })

    expect(lastOfType(guest.received, 'error')).toEqual({ type: 'error', message: 'Only the host can start.' })
  })
})

describe('moving', () => {
  test('refuses a move from a seat whose turn it is not', async () => {
    const { testRoom, server, host, guest } = await startedRoom()
    await send(server, host.connection, { type: 'start' })
    const state = lastOfType(testRoom.broadcasts, 'state') as {
      state: { turn: number; players: { hand: unknown[] }[] }
    }
    const waiting = state.state.turn === 0 ? guest : host
    const waitingSeat = state.state.turn === 0 ? 1 : 0

    await send(server, waiting.connection, {
      type: 'move',
      move: { card: state.state.players[waitingSeat].hand[0], take: [] },
    })

    expect(lastOfType(waiting.received, 'error')).toEqual({ type: 'error', message: 'Not your turn.' })
  })

  test('returns the turn to a human after a human moves', async () => {
    const { testRoom, server, host } = await roomOfFour()
    await send(server, host.connection, { type: 'start' })
    const started = testRoom.stored() as {
      size: number
      difficulty: string
      hostSid: string
      seats: readonly ({ confirmed: boolean } | null)[]
      game: State
    }
    await testRoom.room.storage.put('room', { ...started, game: { ...started.game, turn: 0 } })

    const room = testRoom.stored() as { game: State }
    await send(server, host.connection, { type: 'move', move: move(room.game, {}) })

    expect(whoIsTheTurnWaitingOn(testRoom.stored())).toBe('human')
  })
})

describe('closing', () => {
  test('holds the seat and flags it disconnected', async () => {
    const { testRoom, server, guest } = await startedRoom()

    await testRoom.close(server, guest)

    const lobby = lastOfType(testRoom.broadcasts, 'lobby') as { seats: { connected: boolean }[] }
    expect(lobby.seats.map((seat) => seat.connected)).toEqual([true, false])
  })
})

describe('latecomers', () => {
  test('seats a joiner arriving mid-game in the AI seat and sends them the state', async () => {
    const testRoom = createTestRoom()
    const server = new ScopaServer(testRoom.room)
    const host = await testRoom.open(server, 'sid-a')
    await send(server, host.connection, { type: 'join', avatar: '🐵', size: 4 })
    const guest = await testRoom.open(server, 'sid-b')
    await send(server, guest.connection, { type: 'join', avatar: '🐶' })
    await send(server, host.connection, { type: 'start' })

    const latecomer = await testRoom.open(server, 'sid-c')
    await send(server, latecomer.connection, { type: 'join', avatar: '🦊' })

    expect([
      lastOfType(latecomer.received, 'seated'),
      (lastOfType(latecomer.received, 'state') as { type: string }).type,
    ]).toEqual([{ type: 'seated', index: 2 }, 'state'])
  })
})

describe('starting with empty seats', () => {
  test('fills the empty seats with AI players on start', async () => {
    const { testRoom, server, host } = await roomOfFour()

    await send(server, host.connection, { type: 'start' })

    const lobby = lastOfType(testRoom.broadcasts, 'lobby') as { seats: { ai?: boolean }[] }
    expect(lobby.seats.map((seat) => seat.ai === true)).toEqual([false, false, true, true])
  })

  test('leaves the turn with a human once the opening AI turns have played', async () => {
    const { testRoom, server, host } = await roomOfFour()

    await send(server, host.connection, { type: 'start' })

    expect(whoIsTheTurnWaitingOn(testRoom.stored())).toBe('human')
  })

  test('refuses to start with a single human', async () => {
    const testRoom = createTestRoom()
    const server = new ScopaServer(testRoom.room)
    const host = await testRoom.open(server, 'sid-a')
    await send(server, host.connection, { type: 'join', avatar: '🐵', size: 4 })

    await send(server, host.connection, { type: 'start' })

    expect(lastOfType(host.received, 'error')).toEqual({ type: 'error', message: 'Two players are needed to start.' })
  })
})

describe('onBeforeConnect', () => {
  const lobby = { env: {} } as unknown as Party.Lobby

  test('rejects a client presenting a server-minted AI sid', async () => {
    const request = new Request('https://example.com/parties/main/r?sid=ai:1') as unknown as Party.Request
    const response = await ScopaServer.onBeforeConnect(request, lobby)

    expect((response as Response).status).toBe(401)
  })

  test('admits a client presenting an ordinary sid', async () => {
    const request = new Request('https://example.com/parties/main/r?sid=sid-a') as unknown as Party.Request
    const response = await ScopaServer.onBeforeConnect(request, lobby)

    expect(response).toBe(request)
  })
})

describe('redealing', () => {
  test('keeps AI seats confirmed after every human confirms a new round', async () => {
    const { testRoom, server, host, guest } = await roomOfFour()
    await send(server, host.connection, { type: 'start' })
    await forceStopRoom(testRoom, [true, false, true, true])

    await send(server, guest.connection, { type: 'confirm' })

    const room = testRoom.stored() as { seats: readonly { confirmed: boolean }[] }
    expect(room.seats.map((seat) => seat.confirmed)).toEqual([false, false, true, true])
  })

  test('deals no further round once every human has left', async () => {
    const { testRoom, server, host, guest } = await roomOfFour()
    await send(server, host.connection, { type: 'start' })
    await testRoom.close(server, host)
    await forceStopRoom(testRoom, [true, true, true, true])

    await testRoom.close(server, guest)

    const room = testRoom.stored() as { game: State }
    expect(room.game.state).toBe('stop')
  })
})
