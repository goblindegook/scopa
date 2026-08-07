import { isErr } from '@pacote/result'
import { shuffle } from '@pacote/shuffle'
import type * as Party from 'partykit/server'
import { deck } from '../engine/cards'
import { deal, play, randomFirstPlayer } from '../engine/scopa'
import type { Move, State } from '../engine/state'
import { allConfirmed, canJoin, canStart, type LobbyPlayer, upsertPlayer } from './room'

const INACTIVITY_MS = 10 * 60 * 1000

type ClientMessage =
  | { type: 'join'; avatar: string }
  | { type: 'start' }
  | { type: 'move'; move: Move }
  | { type: 'confirm' }

type ServerMessage =
  | { type: 'seated'; index: number }
  | { type: 'lobby'; players: { avatar: string; connected: boolean; confirmed: boolean }[] }
  | { type: 'move'; move: Move }
  | { type: 'state'; state: State }
  | { type: 'error'; message: string }
  | { type: 'ended' }

interface SeatState {
  readonly sid: string
}

// No firstPlayer here — it rides on State, so the next round seeds itself.
interface RoomData {
  readonly players: readonly LobbyPlayer[]
  readonly game: State | null
}

const EMPTY: RoomData = { players: [], game: null }

const sidOf = (connection: Party.Connection): string => (connection.state as SeatState | null)?.sid ?? ''

// deal() rejects >2 kings and expects the caller to retry; surfacing it would hang the game.
function dealRound(players: number, previousFirstPlayer: number, score?: readonly number[]): State {
  const options = { players: players as 2 | 3, score, previousFirstPlayer }
  let result = deal(shuffle(deck()), options)
  while (isErr(result)) result = deal(shuffle(deck()), options)
  return result.value
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
    if (!url.searchParams.get('sid')) return new Response('Unauthorized', { status: 401 })
    return request
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext): Promise<void> {
    const sid = new URL(ctx.request.url).searchParams.get('sid') ?? ''
    connection.setState({ sid } satisfies SeatState)
    // No arm() here: setAlarm is a storage write, so a bare connect-and-vanish would
    // cost four billable events. onMessage and onClose cover every path that matters.
    this.send(connection, await this.lobbyMessage())
  }

  async onMessage(message: string, sender: Party.Connection): Promise<void> {
    await this.arm()

    const data = JSON.parse(message) as ClientMessage
    const sid = sidOf(sender)
    const store = await this.load()

    switch (data.type) {
      case 'join': {
        const guard = canJoin(store.players, data.avatar, sid, store.game != null)
        if (isErr(guard)) return this.send(sender, { type: 'error', message: guard.value.message })

        const existing = store.players.find((player) => player.sid === sid)
        const players = upsertPlayer(store.players, {
          sid,
          avatar: data.avatar,
          connected: true,
          confirmed: existing?.confirmed ?? false,
        })
        await this.save({ ...store, players })

        this.send(sender, { type: 'seated', index: players.findIndex((player) => player.sid === sid) })
        // Also the sole lockstep repair path: a disconnected client missed every move broadcast.
        if (store.game) this.send(sender, { type: 'state', state: store.game })
        this.broadcast(await this.lobbyMessage(players))
        return
      }

      case 'start': {
        if (store.game) return
        if (store.players[0]?.sid !== sid) {
          return this.send(sender, { type: 'error', message: 'Only the creator can start.' })
        }
        const guard = canStart(store.players)
        if (isErr(guard)) return this.send(sender, { type: 'error', message: guard.value.message })

        const count = store.players.length
        const game = dealRound(count, randomFirstPlayer(count))
        await this.save({ ...store, game })
        this.broadcast({ type: 'state', state: game })
        return
      }

      case 'move': {
        if (!store.game) return
        const seat = store.players.findIndex((player) => player.sid === sid)
        if (seat !== store.game.turn) {
          return this.send(sender, { type: 'error', message: 'Not your turn.' })
        }

        const result = play(data.move, store.game)
        if (isErr(result)) {
          this.send(sender, { type: 'error', message: result.value.message })
          return this.send(sender, { type: 'state', state: store.game })
        }

        await this.save({ ...store, game: result.value })
        // Echoing to the sender would double-apply and skip their animation.
        this.room.broadcast(JSON.stringify({ type: 'move', move: data.move } satisfies ServerMessage), [sender.id])
        return
      }

      case 'confirm': {
        if (store.game?.state !== 'stop') return

        const players = store.players.map((player) => (player.sid === sid ? { ...player, confirmed: true } : player))
        if (!allConfirmed(players)) {
          await this.save({ ...store, players })
          return this.broadcast(await this.lobbyMessage(players))
        }

        const game = dealRound(players.length, store.game.firstPlayer, store.game.score)
        await this.save({ players: players.map((player) => ({ ...player, confirmed: false })), game })
        this.broadcast({ type: 'state', state: game })
        return
      }
    }
  }

  async onClose(connection: Party.Connection): Promise<void> {
    const store = await this.load()
    const sid = sidOf(connection)

    // No seat to hold before the deal, so removal keeps a lobby-sitter out of the deal.
    const players = store.game
      ? store.players.map((player) => (player.sid === sid ? { ...player, connected: false } : player))
      : store.players.filter((player) => player.sid !== sid)

    await this.save({ ...store, players })
    this.broadcast(await this.lobbyMessage(players))

    if (store.game?.state === 'stop' && allConfirmed(players)) {
      const game = dealRound(players.length, store.game.firstPlayer, store.game.score)
      await this.save({ players: players.map((player) => ({ ...player, confirmed: false })), game })
      this.broadcast({ type: 'state', state: game })
    }

    await this.arm()
  }

  // At-least-once delivery, so this must stay idempotent. room.id throws inside an alarm.
  async onAlarm(): Promise<void> {
    if ([...this.room.getConnections()].length > 0) return this.arm()
    this.broadcast({ type: 'ended' })
    await this.room.storage.deleteAll()
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

  private async load(): Promise<RoomData> {
    return (await this.room.storage.get<RoomData>('room')) ?? EMPTY
  }

  private async save(data: RoomData): Promise<void> {
    await this.room.storage.put('room', data)
  }

  private async lobbyMessage(players?: readonly LobbyPlayer[]): Promise<ServerMessage> {
    const list = players ?? (await this.load()).players
    return {
      type: 'lobby',
      players: list.map(({ avatar, connected, confirmed }) => ({ avatar, connected, confirmed })),
    }
  }
}

ScopaServer satisfies Party.Worker
