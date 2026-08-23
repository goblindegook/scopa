import { isErr, isOk } from '@pacote/result'
import { describe, expect, test } from 'vitest'
import { allConfirmed, canJoin, canSit, canStart, nextHost, type Seats, seatPlayer, sitPlayer } from './room'

const player = (sid: string, avatar: string, connected = true, confirmed = false, joinedAt = 0) => ({
  sid,
  avatar,
  connected,
  confirmed,
  joinedAt,
})

const empty = (size: number): Seats => Array.from({ length: size }, () => null)

describe('canJoin', () => {
  test('admits a newcomer while a seat is free', () => {
    expect(isOk(canJoin([player('a', '🐵'), null, null, null], '🐶', 'b', false))).toBe(true)
  })

  test('admits a newcomer when every seat is filled but one occupant is disconnected', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false), player('c', '🦊'), player('d', '🐱')]
    expect(isOk(canJoin(seats, '🦁', 'e', false))).toBe(true)
  })

  test('refuses a newcomer when every seat is filled and connected', () => {
    const seats = [player('a', '🐵'), player('b', '🐶'), player('c', '🦊'), player('d', '🐱')]
    expect(isErr(canJoin(seats, '🦁', 'e', false))).toBe(true)
  })

  test('readmits a known sid after the game has started', () => {
    expect(isOk(canJoin([player('a', '🐵', false), player('b', '🐶')], '🐵', 'a', true))).toBe(true)
  })

  test('refuses a newcomer once the game has started', () => {
    expect(isErr(canJoin([player('a', '🐵'), null], '🐶', 'b', true))).toBe(true)
  })

  test('refuses an avatar another seat already holds', () => {
    expect(isErr(canJoin([player('a', '🐵'), null], '🐵', 'b', false))).toBe(true)
  })
})

describe('canSit', () => {
  test('allows moving into a free seat', () => {
    expect(isOk(canSit([player('a', '🐵'), null, null, null], 'a', 2, false))).toBe(true)
  })

  test('allows claiming a disconnected occupant seat', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false), null, null]
    expect(isOk(canSit(seats, 'a', 1, false))).toBe(true)
  })

  test('refuses a seat held by a connected player', () => {
    expect(isErr(canSit([player('a', '🐵'), player('b', '🐶'), null, null], 'a', 1, false))).toBe(true)
  })

  test('refuses a seat index outside the room', () => {
    expect(isErr(canSit([player('a', '🐵'), null], 'a', 4, false))).toBe(true)
  })

  test('refuses a sid that holds no seat', () => {
    expect(isErr(canSit([player('a', '🐵'), null], 'z', 1, false))).toBe(true)
  })

  test('refuses once the game has started', () => {
    expect(isErr(canSit([player('a', '🐵'), null], 'a', 1, true))).toBe(true)
  })
})

describe('canStart', () => {
  test('allows the host once every seat is filled and connected', () => {
    const seats = [player('a', '🐵'), player('b', '🐶'), player('c', '🦊'), player('d', '🐱')]
    expect(isOk(canStart(seats, 'a', 'a'))).toBe(true)
  })

  test('refuses anyone who is not the host', () => {
    const seats = [player('a', '🐵'), player('b', '🐶')]
    expect(isErr(canStart(seats, 'b', 'a'))).toBe(true)
  })

  test('refuses while a seat is empty', () => {
    expect(isErr(canStart([player('a', '🐵'), null, null, null], 'a', 'a'))).toBe(true)
  })

  test('refuses while a seated player is disconnected', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false)]
    expect(isErr(canStart(seats, 'a', 'a'))).toBe(true)
  })
})

describe('seatPlayer', () => {
  test('places a newcomer in the first free seat', () => {
    expect(seatPlayer([player('a', '🐵'), null, null, null], player('b', '🐶'))).toEqual([
      player('a', '🐵'),
      player('b', '🐶'),
      null,
      null,
    ])
  })

  test('returns a known sid to the seat it already holds', () => {
    const seats = [null, player('a', '🐵', false), null, null]
    expect(seatPlayer(seats, player('a', '🐵'))).toEqual([null, player('a', '🐵'), null, null])
  })

  test('evicts a disconnected occupant when no seat is free', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false)]
    expect(seatPlayer(seats, player('c', '🦊'))).toEqual([player('a', '🐵'), player('c', '🦊')])
  })
})

describe('sitPlayer', () => {
  test('vacates the old seat and occupies the new one', () => {
    const seats = [player('a', '🐵'), null, null, null]
    expect(sitPlayer(seats, 'a', 2)).toEqual([null, null, player('a', '🐵'), null])
  })

  test('displaces a disconnected occupant', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false), null, null]
    expect(sitPlayer(seats, 'a', 1)).toEqual([null, player('a', '🐵'), null, null])
  })
})

describe('nextHost', () => {
  test('keeps the host while they still hold a seat', () => {
    expect(nextHost([player('a', '🐵'), player('b', '🐶', true, false, 5)], 'a')).toBe('a')
  })

  test('hands the room to the longest-present connected player once the host seat is claimed', () => {
    const seats = [player('c', '🦊', true, false, 9), player('b', '🐶', true, false, 3)]
    expect(nextHost(seats, 'a')).toBe('b')
  })

  test('skips disconnected players when inheriting', () => {
    const seats = [player('b', '🐶', false, false, 1), player('c', '🦊', true, false, 7)]
    expect(nextHost(seats, 'a')).toBe('c')
  })
})

describe('allConfirmed', () => {
  test('is true when every connected seat has confirmed', () => {
    const seats = [player('a', '🐵', true, true), player('b', '🐶', false), player('c', '🦊', true, true)]
    expect(allConfirmed(seats)).toBe(true)
  })

  test('is false while a connected seat has not confirmed', () => {
    expect(allConfirmed([player('a', '🐵', true, true), player('b', '🐶')])).toBe(false)
  })

  test('is false in an empty room', () => {
    expect(allConfirmed(empty(4))).toBe(false)
  })
})
