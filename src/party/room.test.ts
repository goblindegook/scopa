import { isErr, isOk } from '@pacote/result'
import { describe, expect, test } from 'vitest'
import { AI_AVATARS } from '../engine/ai'
import {
  allConfirmed,
  canJoin,
  canSit,
  canStart,
  fillVacantWithAi,
  hasConnectedHuman,
  isAutoplayed,
  nextHost,
  type Seats,
  seatPlayer,
  sitPlayer,
} from './room'

const player = (sid: string, avatar: string, connected = true, confirmed = false, joinedAt = 0) => ({
  sid,
  avatar,
  connected,
  confirmed,
  joinedAt,
})

const robot = (sid: string, avatar: string, joinedAt = 0) => ({
  sid,
  avatar,
  connected: true,
  confirmed: true,
  joinedAt,
  ai: true,
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

  test('admits a newcomer into an AI seat after the game has started', () => {
    expect(isOk(canJoin([player('a', '🐵'), robot('ai:1', '🤖')], '🐶', 'b', true))).toBe(true)
  })

  test('refuses a newcomer when the only free-looking seat is a disconnected human', () => {
    expect(isErr(canJoin([player('a', '🐵'), player('b', '🐶', false)], '🦊', 'c', true))).toBe(true)
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
  test('refuses anyone who is not the host', () => {
    expect(isErr(canStart([player('a', '🐵'), player('b', '🐶')], 'b', 'a'))).toBe(true)
  })

  test('allows the host with two connected humans and empty seats', () => {
    const seats = [player('a', '🐵'), player('b', '🐶'), null, null, null, null]
    expect(isOk(canStart(seats, 'a', 'a'))).toBe(true)
  })

  test('refuses the host with only one connected human', () => {
    const seats = [player('a', '🐵'), null, null, null]
    expect(isErr(canStart(seats, 'a', 'a'))).toBe(true)
  })

  test('refuses the host when the second human is disconnected', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false), null, null]
    expect(isErr(canStart(seats, 'a', 'a'))).toBe(true)
  })

  test('does not count AI seats towards the human floor', () => {
    const seats = [player('a', '🐵'), robot('ai:1', '🤖'), robot('ai:2', '👾'), robot('ai:3', '👽')]
    expect(isErr(canStart(seats, 'a', 'a'))).toBe(true)
  })

  test('lets a disconnected third human not block the start', () => {
    const seats = [player('a', '🐵'), player('b', '🐶'), player('c', '🦊', false), null, null, null]
    expect(isOk(canStart(seats, 'a', 'a'))).toBe(true)
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

  test('seats a mid-game joiner in the AI seat, not the disconnected human seat', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false), robot('ai:1', '🤖')]
    const seated = seatPlayer(seats, player('c', '🦊'), true)
    expect(seated.map((seat) => seat?.sid)).toEqual(['a', 'b', 'c'])
  })

  test('returns a known sid to its own seat rather than an AI seat', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false), robot('ai:1', '🤖')]
    const seated = seatPlayer(seats, player('b', '🐶'), true)
    expect(seated.map((seat) => seat?.sid)).toEqual(['a', 'b', 'ai:1'])
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

  test('never hands the room to an AI seat', () => {
    const seats = [robot('ai:1', '🤖', 0), player('b', '🐶', true, false, 5)]
    expect(nextHost(seats, 'gone')).toBe('b')
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

describe('isAutoplayed', () => {
  test('classifies a vacant seat, an AI seat and a disconnected human as autoplayed', () => {
    expect([null, robot('ai:1', '🤖'), player('b', '🐶', false)].map(isAutoplayed)).toEqual([true, true, true])
  })

  test('leaves a connected human to play for themselves', () => {
    expect(isAutoplayed(player('a', '🐵'))).toBe(false)
  })
})

describe('hasConnectedHuman', () => {
  test('is true while one human is connected among robots', () => {
    expect(hasConnectedHuman([player('a', '🐵'), robot('ai:1', '🤖')])).toBe(true)
  })

  test('is false when every human has dropped and only robots remain', () => {
    expect(hasConnectedHuman([player('a', '🐵', false), robot('ai:1', '🤖')])).toBe(false)
  })
})

describe('fillVacantWithAi', () => {
  test('fills only vacant seats, leaving a disconnected human their seat', () => {
    const seats = [player('a', '🐵'), player('b', '🐶', false), null, null]
    const filled = fillVacantWithAi(seats, 1000)
    expect(filled.map((seat) => [seat?.ai === true, seat?.sid.startsWith('ai:') === true])).toEqual([
      [false, false],
      [false, false],
      [true, true],
      [true, true],
    ])
  })

  test('gives every filled seat a distinct avatar from the AI pool', () => {
    const filled = fillVacantWithAi([null, null, null, null], 1000)
    const avatars = filled.map((seat) => seat?.avatar ?? '')
    expect([
      new Set(avatars).size,
      avatars.every((avatar) => AI_AVATARS.some((candidate) => candidate === avatar)),
    ]).toEqual([4, true])
  })

  test('marks filled seats connected and confirmed so they never block a round', () => {
    const filled = fillVacantWithAi([player('a', '🐵'), null], 1000)
    expect([filled[1]?.connected, filled[1]?.confirmed, filled[1]?.joinedAt]).toEqual([true, true, 1000])
  })

  test('leaves a room with no vacancies untouched', () => {
    const seats = [player('a', '🐵'), player('b', '🐶')]
    expect(fillVacantWithAi(seats, 1000)).toEqual(seats)
  })
})
