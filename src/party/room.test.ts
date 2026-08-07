import { isErr, isOk } from '@pacote/result'
import { describe, expect, test } from 'vitest'
import { allConfirmed, canJoin, canStart, MAX_PLAYERS, upsertPlayer } from './room'

const player = (sid: string, avatar: string, connected = true, confirmed = false) => ({
  sid,
  avatar,
  connected,
  confirmed,
})

describe('canJoin', () => {
  test('allows a new avatar into a room that has not started', () => {
    expect(isOk(canJoin([player('a', '🐵')], '🐶', 'b', false))).toBe(true)
  })

  test('allows a reconnecting sid even if the room is full', () => {
    const players = [player('a', '🐵'), player('b', '🐶'), player('c', '🦊')]
    expect(isOk(canJoin(players, '🐶', 'b', false))).toBe(true)
  })

  test('rejects a reconnecting sid claiming an avatar another player holds', () => {
    const players = [player('a', '🐵'), player('b', '🐶')]
    expect(isErr(canJoin(players, '🐵', 'b', false))).toBe(true)
  })

  test('rejects a new join once the room is full', () => {
    const players = [player('a', '🐵'), player('b', '🐶'), player('c', '🦊')]
    expect(isErr(canJoin(players, '🐱', 'd', false))).toBe(true)
  })

  test('rejects a duplicate avatar', () => {
    expect(isErr(canJoin([player('a', '🐵')], '🐵', 'b', false))).toBe(true)
  })

  test('rejects a new join once the game has started', () => {
    expect(isErr(canJoin([player('a', '🐵')], '🐶', 'b', true))).toBe(true)
  })

  test('allows a reconnecting sid after the game has started', () => {
    expect(isOk(canJoin([player('a', '🐵', false)], '🐵', 'a', true))).toBe(true)
  })

  test('MAX_PLAYERS is 3', () => {
    expect(MAX_PLAYERS).toBe(3)
  })
})

describe('canStart', () => {
  test('rejects fewer than 2 connected players', () => {
    expect(isErr(canStart([player('a', '🐵')]))).toBe(true)
  })

  test('allows 2 connected players', () => {
    expect(isOk(canStart([player('a', '🐵'), player('b', '🐶')]))).toBe(true)
  })
})

describe('allConfirmed', () => {
  test('ignores disconnected players', () => {
    const players = [player('a', '🐵', true, true), player('b', '🐶', false, false)]
    expect(allConfirmed(players)).toBe(true)
  })

  test('is false while a connected player has not confirmed', () => {
    const players = [player('a', '🐵', true, true), player('b', '🐶', true, false)]
    expect(allConfirmed(players)).toBe(false)
  })

  test('is false when nobody is connected', () => {
    expect(allConfirmed([player('a', '🐵', false, false)])).toBe(false)
  })
})

describe('upsertPlayer', () => {
  test('appends a brand new player', () => {
    expect(upsertPlayer([player('a', '🐵')], player('b', '🐶'))).toEqual([player('a', '🐵'), player('b', '🐶')])
  })

  test('replaces a returning sid, preserving seat position', () => {
    const players = [player('a', '🐵'), player('b', '🐶', false)]
    expect(upsertPlayer(players, player('b', '🐶', true))).toEqual([player('a', '🐵'), player('b', '🐶', true)])
  })
})
