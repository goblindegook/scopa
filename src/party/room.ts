import { Err, Ok, type Result } from '@pacote/result'

export const MAX_PLAYERS = 3
export const MIN_PLAYERS_TO_START = 2

export interface LobbyPlayer {
  readonly sid: string
  readonly avatar: string
  readonly connected: boolean
  readonly confirmed: boolean
}

export function canJoin(
  players: readonly LobbyPlayer[],
  avatar: string,
  sid: string,
  started: boolean,
): Result<void, Error> {
  // Avatar uniqueness is checked before the reconnect path, so a returning
  // player cannot claim a seat-mate's avatar (spec decision 13).
  if (players.some((p) => p.avatar === avatar && p.sid !== sid)) return Err(new Error('Avatar already taken.'))
  if (players.some((p) => p.sid === sid)) return Ok(undefined)
  if (started) return Err(new Error('Game has already started.'))
  if (players.length >= MAX_PLAYERS) return Err(new Error('Room is full.'))
  return Ok(undefined)
}

export function canStart(players: readonly LobbyPlayer[]): Result<void, Error> {
  const connected = players.filter((p) => p.connected).length
  return connected >= MIN_PLAYERS_TO_START ? Ok(undefined) : Err(new Error('Need at least 2 players to start.'))
}

export function allConfirmed(players: readonly LobbyPlayer[]): boolean {
  const connected = players.filter((p) => p.connected)
  return connected.length > 0 && connected.every((p) => p.confirmed)
}

export function upsertPlayer(players: readonly LobbyPlayer[], player: LobbyPlayer): readonly LobbyPlayer[] {
  const index = players.findIndex((p) => p.sid === player.sid)
  if (index === -1) return [...players, player]
  return players.map((p, i) => (i === index ? player : p))
}
