import { Err, Ok, type Result } from '@pacote/result'

export interface LobbyPlayer {
  readonly sid: string
  readonly avatar: string
  readonly connected: boolean
  readonly confirmed: boolean
  readonly joinedAt: number
}

export type Seats = readonly (LobbyPlayer | null)[]

// A disconnected seat is still claimable: mobile browsers close the socket on
// backgrounding, so holding it forever would let one abandoned tab brick a room.
const isOpen = (seat: LobbyPlayer | null): boolean => seat === null || !seat.connected

const isConnected = (seat: LobbyPlayer | null): seat is LobbyPlayer => seat?.connected === true

export function canJoin(seats: Seats, avatar: string, sid: string, started: boolean): Result<void, Error> {
  if (seats.some((seat) => seat?.avatar === avatar && seat.sid !== sid)) return Err(new Error('Avatar already taken.'))
  if (seats.some((seat) => seat?.sid === sid)) return Ok(undefined)
  if (started) return Err(new Error('Game has already started.'))
  if (!seats.some(isOpen)) return Err(new Error('Room is full.'))
  return Ok(undefined)
}

export function canSit(seats: Seats, sid: string, seat: number, started: boolean): Result<void, Error> {
  if (started) return Err(new Error('Game has already started.'))
  if (!seats.some((occupant) => occupant?.sid === sid)) return Err(new Error('Join before choosing a seat.'))
  if (!Number.isInteger(seat) || seat < 0 || seat >= seats.length) return Err(new Error('No such seat.'))
  if (!isOpen(seats[seat])) return Err(new Error('Seat taken.'))
  return Ok(undefined)
}

export function canStart(seats: Seats, sid: string, hostSid: string): Result<void, Error> {
  if (sid !== hostSid) return Err(new Error('Only the host can start.'))
  if (!seats.every(isConnected)) return Err(new Error('Every seat must be filled to start.'))
  return Ok(undefined)
}

export function allConfirmed(seats: Seats): boolean {
  const connected = seats.filter(isConnected)
  return connected.length > 0 && connected.every((seat) => seat.confirmed)
}

export function seatPlayer(seats: Seats, player: LobbyPlayer): Seats {
  const held = seats.findIndex((seat) => seat?.sid === player.sid)
  const free = seats.indexOf(null)
  const target = held >= 0 ? held : free >= 0 ? free : seats.findIndex(isOpen)
  return seats.map((seat, index) => (index === target ? player : seat))
}

export function sitPlayer(seats: Seats, sid: string, seat: number): Seats {
  const from = seats.findIndex((occupant) => occupant?.sid === sid)
  const mover = from >= 0 ? seats[from] : null
  if (mover === null) return seats
  return seats.map((occupant, index) => (index === seat ? mover : index === from ? null : occupant))
}

// Disconnecting never costs the host their room - only losing the seat does.
export function nextHost(seats: Seats, hostSid: string): string {
  if (seats.some((seat) => seat?.sid === hostSid)) return hostSid
  const longest = seats
    .filter(isConnected)
    .reduce<LobbyPlayer | null>((best, seat) => (best === null || seat.joinedAt < best.joinedAt ? seat : best), null)
  return longest?.sid ?? hostSid
}
