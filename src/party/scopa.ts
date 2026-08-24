import { isErr } from '@pacote/result'
import { shuffle } from '@pacote/shuffle'
import type * as Party from 'partykit/server'
import { DIFFICULTIES, type Difficulty } from '../engine/ai'
import { deck } from '../engine/cards'
import { deal, play, randomFirstPlayer } from '../engine/scopa'
import { isPlayerCount, type PlayerCount } from '../engine/sides'
import type { Move, State } from '../engine/state'
import { autoplay } from './autoplay'
import {
  allConfirmed,
  canJoin,
  canSit,
  canStart,
  fillVacantWithAi,
  hasConnectedHuman,
  nextHost,
  type Seats,
  seatPlayer,
  sitPlayer,
} from './room'

const INACTIVITY_MS = 10 * 60 * 1000

const DEFAULT_SIZE: PlayerCount = 2
const DEFAULT_DIFFICULTY: Difficulty = 'normal'

const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)

type ClientMessage =
  | { type: 'join'; avatar: string; size?: PlayerCount; difficulty?: Difficulty }
  | { type: 'sit'; seat: number }
  | { type: 'start' }
  | { type: 'move'; move: Move }
  | { type: 'confirm' }

type ServerMessage =
  | { type: 'seated'; index: number }
  | {
      type: 'lobby'
      size: PlayerCount
      host: number | null
      seats: ({ avatar: string; connected: boolean; confirmed: boolean; ai?: boolean } | null)[]
    }
  | { type: 'move'; move: Move }
  | { type: 'state'; state: State }
  | { type: 'error'; message: string }
  | { type: 'ended' }

interface SeatState {
  readonly sid: string
}

// No firstPlayer here — it rides on State, so the next round seeds itself.
interface RoomData {
  readonly size: PlayerCount
  readonly difficulty: Difficulty
  readonly hostSid: string
  readonly seats: Seats
  readonly game: State | null
}

const createRoom = (size: PlayerCount, difficulty: Difficulty, hostSid: string): RoomData => ({
  size,
  difficulty,
  hostSid,
  seats: Array.from({ length: size }, () => null),
  game: null,
})

const sidOf = (connection: Party.Connection): string => (connection.state as SeatState | null)?.sid ?? ''

// deal() rejects >2 kings and expects the caller to retry; surfacing it would hang the game.
function dealRound(players: PlayerCount, previousFirstPlayer: number, score?: readonly number[]): State {
  const options = { players, score, previousFirstPlayer }
  let result = deal(shuffle(deck()), options)
  while (isErr(result)) result = deal(shuffle(deck()), options)
  return result.value
}

const lobbyMessage = (store: RoomData): ServerMessage => {
  const host = store.seats.findIndex((seat) => seat?.sid === store.hostSid)
  return {
    type: 'lobby',
    size: store.size,
    host: host >= 0 ? host : null,
    seats: store.seats.map((seat) =>
      seat === null ? null : { avatar: seat.avatar, connected: seat.connected, confirmed: seat.confirmed, ai: seat.ai },
    ),
  }
}

export default class ScopaServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Safe because nothing lives in instance fields: state is in storage, identity in
  // connection.state, the timeout is an alarm.
  readonly options = { hibernate: true }

  static async onBeforeConnect(request: Party.Request, lobby: Party.Lobby): Promise<Party.Request | Response> {
    const url = new URL(request.url)
    // An Origin header carries no trailing slash, so a configured one would match nothing.
    const allowed = String(lobby.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean)

    // Nuisance filter, not a boundary: the room id and sid are what gate access.
    if (allowed.length && !allowed.includes(request.headers.get('Origin') ?? '')) {
      return new Response('Forbidden', { status: 403 })
    }
    // `ai:` sids are minted server-side for AI seats; a client presenting one would
    // be claiming a robot's identity and playing its turns.
    const sid = url.searchParams.get('sid')
    if (!sid || sid.startsWith('ai:')) return new Response('Unauthorized', { status: 401 })
    return request
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext): Promise<void> {
    const sid = new URL(ctx.request.url).searchParams.get('sid') ?? ''
    connection.setState({ sid } satisfies SeatState)
    // No arm() here: setAlarm is a storage write, so a bare connect-and-vanish would
    // cost four billable events. onMessage and onClose cover every path that matters.
    const store = await this.load()
    if (store) this.send(connection, lobbyMessage(store))
  }

  async onMessage(message: string, sender: Party.Connection): Promise<void> {
    await this.arm()

    const data = JSON.parse(message) as ClientMessage
    const sid = sidOf(sender)
    const existing = await this.load()

    if (data.type === 'join') {
      const store =
        existing ??
        createRoom(
          typeof data.size === 'number' && isPlayerCount(data.size) ? data.size : DEFAULT_SIZE,
          isDifficulty(data.difficulty) ? data.difficulty : DEFAULT_DIFFICULTY,
          sid,
        )
      const guard = canJoin(store.seats, data.avatar, sid, store.game != null)
      if (isErr(guard)) return this.send(sender, { type: 'error', message: guard.value.message })

      const previous = store.seats.find((seat) => seat?.sid === sid)
      const seats = seatPlayer(
        store.seats,
        {
          sid,
          avatar: data.avatar,
          connected: true,
          confirmed: previous?.confirmed ?? false,
          joinedAt: previous?.joinedAt ?? Date.now(),
        },
        store.game != null,
      )
      const next = { ...store, seats, hostSid: nextHost(seats, store.hostSid) }
      await this.save(next)

      this.send(sender, { type: 'seated', index: seats.findIndex((seat) => seat?.sid === sid) })
      // Also the sole lockstep repair path: a disconnected client missed every move broadcast.
      if (next.game) this.send(sender, { type: 'state', state: next.game })
      return this.broadcast(lobbyMessage(next))
    }

    if (existing === null) return
    const store = existing

    switch (data.type) {
      case 'sit': {
        const guard = canSit(store.seats, sid, data.seat, store.game != null)
        if (isErr(guard)) return this.send(sender, { type: 'error', message: guard.value.message })

        const seats = sitPlayer(store.seats, sid, data.seat)
        // Claiming the host's abandoned seat is the only thing that moves the room.
        const next = { ...store, seats, hostSid: nextHost(seats, store.hostSid) }
        await this.save(next)
        // The mover's own client only ever learns its seat from a 'seated' message
        // (mirroring 'join'); without this, its local seat index goes stale.
        this.send(sender, { type: 'seated', index: data.seat })
        return this.broadcast(lobbyMessage(next))
      }

      case 'start': {
        if (store.game) return
        const guard = canStart(store.seats, sid, store.hostSid)
        if (isErr(guard)) return this.send(sender, { type: 'error', message: guard.value.message })

        // The lobby broadcast lands first so clients know the AI avatars before the table renders.
        const seats = fillVacantWithAi(store.seats, Date.now())
        const game = dealRound(store.size, randomFirstPlayer(store.size))
        const next = { ...store, seats, game }
        await this.save(next)
        this.broadcast(lobbyMessage(next))
        this.broadcast({ type: 'state', state: game })
        return this.advance(next)
      }

      case 'move': {
        if (!store.game) return
        const seat = store.seats.findIndex((occupant) => occupant?.sid === sid)
        if (seat !== store.game.turn) {
          return this.send(sender, { type: 'error', message: 'Not your turn.' })
        }

        const result = play(data.move, store.game)
        if (isErr(result)) {
          this.send(sender, { type: 'error', message: result.value.message })
          return this.send(sender, { type: 'state', state: store.game })
        }

        const next = { ...store, game: result.value }
        await this.save(next)
        // Echoing to the sender would double-apply and skip their animation.
        this.room.broadcast(JSON.stringify({ type: 'move', move: data.move } satisfies ServerMessage), [sender.id])
        return this.advance(next)
      }

      case 'confirm': {
        if (store.game?.state !== 'stop') return

        const seats = store.seats.map((seat) => (seat?.sid === sid ? { ...seat, confirmed: true } : seat))
        if (!allConfirmed(seats)) {
          const next = { ...store, seats }
          await this.save(next)
          return this.broadcast(lobbyMessage(next))
        }

        if (!hasConnectedHuman(seats)) return
        const game = dealRound(store.size, store.game.firstPlayer, store.game.score)
        const next = {
          ...store,
          seats: seats.map((seat) => (seat === null || seat.ai ? seat : { ...seat, confirmed: false })),
          game,
        }
        await this.save(next)
        this.broadcast({ type: 'state', state: game })
        return this.advance(next)
      }
    }
  }

  async onClose(connection: Party.Connection): Promise<void> {
    const store = await this.load()
    if (store === null) return

    const sid = sidOf(connection)
    // Held, not vacated: backgrounding a mobile browser closes the socket, and
    // vacating would silently move the player to another team on reconnect. The hold is
    // best-effort — a newcomer can still claim the seat if no other seat is free.
    const seats = store.seats.map((seat) => (seat?.sid === sid ? { ...seat, connected: false } : seat))
    const next = { ...store, seats }

    await this.save(next)
    this.broadcast(lobbyMessage(next))

    if (store.game?.state === 'stop' && allConfirmed(seats) && hasConnectedHuman(seats)) {
      const game = dealRound(store.size, store.game.firstPlayer, store.game.score)
      const redealt = {
        ...next,
        seats: seats.map((seat) => (seat === null || seat.ai ? seat : { ...seat, confirmed: false })),
        game,
      }
      await this.save(redealt)
      this.broadcast({ type: 'state', state: game })
      await this.advance(redealt)
    }

    await this.arm()
  }

  // At-least-once delivery, so this must stay idempotent. room.id throws inside an alarm.
  async onAlarm(): Promise<void> {
    if ([...this.room.getConnections()].length > 0) return this.arm()
    this.broadcast({ type: 'ended' })
    await this.room.storage.deleteAll()
  }

  // Every AI move goes to everyone - unlike a human move, there is no sender to exclude.
  private async advance(store: RoomData): Promise<void> {
    if (!store.game) return
    const { game, moves } = autoplay(store.seats, store.game, store.difficulty)
    if (moves.length === 0) return

    await this.save({ ...store, game })
    for (const move of moves) this.broadcast({ type: 'move', move })
  }

  private arm(): Promise<void> {
    return this.room.storage.setAlarm(Date.now() + INACTIVITY_MS)
  }

  private send(connection: Party.Connection, message: ServerMessage): void {
    connection.send(JSON.stringify(message))
  }

  private broadcast(message: ServerMessage): void {
    this.room.broadcast(JSON.stringify(message))
  }

  private async load(): Promise<RoomData | null> {
    const data = await this.room.storage.get<RoomData>('room')
    return Array.isArray(data?.seats) ? data : null
  }

  private async save(data: RoomData): Promise<void> {
    await this.room.storage.put('room', data)
  }
}

ScopaServer satisfies Party.Worker
