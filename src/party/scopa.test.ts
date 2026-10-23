import { describe, expect, test } from 'vitest'
import { move } from '../engine/opponent'
import type { State } from '../engine/state'
import { arrival, type Client, connect, lastOfType, runAlarm, store, stored, upgrade } from './testRoom'

interface StoredRoom {
  readonly size: number
  readonly difficulty: string
  readonly hostSid: string
  readonly seats: readonly ({ connected: boolean; confirmed: boolean; ai?: boolean } | null)[]
  readonly game: State | null
}

type Lobby = { seats: ({ connected: boolean; ai?: boolean } | null)[] }

// The contract of the AI chain: when the Worker finishes handling a message, nobody is
// waiting on a seat that cannot act. Holds for every deal, so no seeding is needed.
// Returns a description rather than a boolean so a failure names the stuck seat instead
// of reporting "expected false to be true".
type TurnRest = 'human' | 'round over' | 'no humans left' | `stuck on seat ${number}`

const whoIsTheTurnWaitingOn = (stored: unknown): TurnRest => {
  const room = stored as StoredRoom
  if (!room.game || room.game.state !== 'play') return 'round over'
  if (!room.seats.some((seat) => seat?.connected === true && seat.ai !== true)) return 'no humans left'
  const seat = room.seats[room.game.turn]
  return seat?.connected === true && seat.ai !== true ? 'human' : `stuck on seat ${room.game.turn}`
}

const storedRoom = async (room: string) => (await stored(room)) as StoredRoom
const storedGame = async (room: string) => (await storedRoom(room)).game as State

const seated = async (room: string, sid: string, join: Record<string, unknown>): Promise<Client> => {
  const client = await connect(room, sid)
  client.send({ type: 'join', ...join })
  await arrival(client, 'seated')
  return client
}

const roomOf = async (size: 2 | 4) => {
  const room = crypto.randomUUID()
  const host = await seated(room, 'sid-a', { avatar: '🐵', size })
  const guest = await seated(room, 'sid-b', { avatar: '🐶' })
  return { room, host, guest }
}

const startedRoomOf = async (size: 2 | 4) => {
  const opened = await roomOf(size)
  opened.host.send({ type: 'start' })
  await arrival(opened.host, 'state')
  return opened
}

const withTurn = async (room: string, turn: number) => {
  const current = await storedRoom(room)
  await store(room, { ...current, game: { ...current.game, turn } })
}

const forceStopRoom = async (room: string, confirmed: readonly [boolean, boolean, boolean, boolean]) => {
  const current = await storedRoom(room)
  await store(room, {
    ...current,
    seats: current.seats.map((seat, index) => (seat === null ? null : { ...seat, confirmed: confirmed[index] })),
    game: { ...current.game, state: 'stop' },
  })
}

const lobbyOf = (client: Client) => lastOfType(client.received, 'lobby') as Lobby | undefined

describe('connecting', () => {
  test('rejects a client presenting a server-minted AI sid', async () => {
    const response = await upgrade(crypto.randomUUID(), 'ai:1')

    expect(response.status).toBe(401)
  })

  test('rejects a client from an origin that is not allowed', async () => {
    const response = await upgrade(crypto.randomUUID(), 'sid-a', 'https://elsewhere.example')

    expect(response.status).toBe(403)
  })

  test('admits a client presenting an ordinary sid from an allowed origin', async () => {
    const response = await upgrade(crypto.randomUUID(), 'sid-a')

    expect(response.status).toBe(101)
  })
})

describe('joining', () => {
  test('seats the creator at index 0 and tells them so', async () => {
    const host = await connect(crypto.randomUUID(), 'sid-a')

    host.send({ type: 'join', avatar: '🐵', size: 2 })

    expect(await arrival(host, 'seated')).toEqual({ type: 'seated', index: 0 })
  })

  test('broadcasts a lobby holding both players', async () => {
    const { host } = await roomOf(2)

    await expect
      .poll(() => lastOfType(host.received, 'lobby'))
      .toEqual({
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
    const { host, guest } = await roomOf(2)

    host.send({ type: 'start' })

    const { state } = (await arrival(guest, 'state')) as { state: State }
    expect([state.state, state.players.length]).toEqual(['play', 2])
  })

  test('refuses a start from anyone but the host', async () => {
    const { guest } = await roomOf(2)

    guest.send({ type: 'start' })

    expect(await arrival(guest, 'error')).toEqual({ type: 'error', message: 'Only the host can start.' })
  })
})

describe('moving', () => {
  test('refuses a move from a seat whose turn it is not', async () => {
    const { room, guest } = await startedRoomOf(2)
    await withTurn(room, 0)
    const game = await storedGame(room)

    guest.send({ type: 'move', move: { card: game.players[1].hand[0], take: [] } })

    expect(await arrival(guest, 'error')).toEqual({ type: 'error', message: 'Not your turn.' })
  })

  test('returns the turn to a human after a human moves', async () => {
    const { room, host } = await startedRoomOf(4)
    await withTurn(room, 0)
    const game = await storedGame(room)

    host.send({ type: 'move', move: move(game, {}) })

    await expect
      .poll(async () => {
        const after = await storedRoom(room)
        return [(after.game as State).players[0].hand.length, whoIsTheTurnWaitingOn(after)]
      })
      .toEqual([game.players[0].hand.length - 1, 'human'])
  })
})

describe('closing', () => {
  test('holds the seat and flags it disconnected', async () => {
    const { host, guest } = await roomOf(2)

    guest.close()

    await expect.poll(() => lobbyOf(host)?.seats.map((seat) => seat?.connected)).toEqual([true, false])
  })
})

describe('latecomers', () => {
  test('seats a joiner arriving mid-game in the AI seat and sends them the state', async () => {
    const { room } = await startedRoomOf(4)
    const latecomer = await connect(room, 'sid-c')

    latecomer.send({ type: 'join', avatar: '🦊' })

    await expect
      .poll(() => [
        lastOfType(latecomer.received, 'seated'),
        (lastOfType(latecomer.received, 'state') as { type: string } | undefined)?.type,
      ])
      .toEqual([{ type: 'seated', index: 2 }, 'state'])
  })
})

describe('starting with empty seats', () => {
  test('fills the empty seats with AI players on start', async () => {
    const { host } = await roomOf(4)

    host.send({ type: 'start' })

    await expect.poll(() => lobbyOf(host)?.seats.map((seat) => seat?.ai === true)).toEqual([false, false, true, true])
  })

  test('leaves the turn with a human once the opening AI turns have played', async () => {
    const { room, host } = await roomOf(4)

    host.send({ type: 'start' })

    await expect.poll(async () => whoIsTheTurnWaitingOn(await stored(room))).toBe('human')
  })

  test('refuses to start with a single human', async () => {
    const host = await seated(crypto.randomUUID(), 'sid-a', { avatar: '🐵', size: 4 })

    host.send({ type: 'start' })

    expect(await arrival(host, 'error')).toEqual({ type: 'error', message: 'Two players are needed to start.' })
  })
})

describe('redealing', () => {
  test('keeps AI seats confirmed after every human confirms a new round', async () => {
    const { room, guest } = await startedRoomOf(4)
    await forceStopRoom(room, [true, false, true, true])

    guest.send({ type: 'confirm' })

    await expect
      .poll(async () => (await storedRoom(room)).seats.map((seat) => seat?.confirmed))
      .toEqual([false, false, true, true])
  })

  test('deals no further round once every human has left', async () => {
    const { room, host, guest } = await startedRoomOf(4)
    host.close()
    await expect.poll(() => lobbyOf(guest)?.seats[0]?.connected).toBe(false)
    await forceStopRoom(room, [true, true, true, true])

    guest.close()

    await expect
      .poll(async () => {
        const after = await storedRoom(room)
        return [after.seats[1]?.connected, after.game?.state]
      })
      .toEqual([false, 'stop'])
  })
})

describe('expiring', () => {
  test('clears a room once its inactivity alarm fires with nobody connected', async () => {
    const room = crypto.randomUUID()
    const host = await seated(room, 'sid-a', { avatar: '🐵', size: 2 })
    host.close()
    await expect.poll(async () => (await storedRoom(room)).seats[0]?.connected).toBe(false)

    await runAlarm(room)

    expect(await stored(room)).toBeUndefined()
  })
})
