import { isOk } from '@pacote/result'
import { shuffle } from '@pacote/shuffle'
import { describe, expect, test } from 'vitest'
import { deck } from '../engine/cards'
import { deal, play } from '../engine/scopa'
import type { State } from '../engine/state'
import { autoplay } from './autoplay'
import type { Seats } from './room'

const player = (sid: string, avatar: string, connected = true) => ({
  sid,
  avatar,
  connected,
  confirmed: false,
  joinedAt: 0,
})

const robot = (sid: string, avatar: string) => ({
  sid,
  avatar,
  connected: true,
  confirmed: true,
  joinedAt: 0,
  ai: true,
})

const dealt = (players: 2 | 3 | 4 | 6): State => {
  let result = deal(shuffle(deck()), { players, previousFirstPlayer: 1 })
  while (!isOk(result)) result = deal(shuffle(deck()), { players, previousFirstPlayer: 1 })
  return result.value
}

// previousFirstPlayer: 1 puts turn on seat 0, so the chain's start is deterministic.
const seatedAt = (game: State, turn: number): State => ({ ...game, turn })

describe('autoplay', () => {
  test('plays nothing when a connected human is to move', () => {
    const game = seatedAt(dealt(2), 0)
    const seats: Seats = [player('a', '🐵'), robot('ai:1', '🤖')]
    expect(autoplay(seats, game, 'normal')).toEqual({ game, moves: [] })
  })

  test('plays one move when a single AI seat is to move', () => {
    const game = seatedAt(dealt(2), 1)
    const seats: Seats = [player('a', '🐵'), robot('ai:1', '🤖')]
    const result = autoplay(seats, game, 'normal')
    expect([result.moves.length, result.game.turn]).toEqual([1, 0])
  })

  test('plays every consecutive AI seat and stops on the human', () => {
    const game = seatedAt(dealt(6), 4)
    const seats: Seats = [
      player('a', '🐵'),
      robot('ai:1', '🤖'),
      robot('ai:2', '👾'),
      robot('ai:3', '👽'),
      robot('ai:4', '😈'),
      player('b', '🐶'),
    ]
    const result = autoplay(seats, game, 'normal')
    expect([result.moves.length, result.game.turn]).toEqual([4, 0])
  })

  test('covers a disconnected human seat', () => {
    const game = seatedAt(dealt(2), 1)
    const seats: Seats = [player('a', '🐵'), player('b', '🐶', false)]
    expect(autoplay(seats, game, 'normal').moves.length).toBe(1)
  })

  test('plays nothing once every human has disconnected', () => {
    const game = seatedAt(dealt(2), 1)
    const seats: Seats = [player('a', '🐵', false), robot('ai:1', '🤖')]
    expect(autoplay(seats, game, 'normal')).toEqual({ game, moves: [] })
  })

  test('every move it reports is the move that produced the state it returns', () => {
    const game = seatedAt(dealt(4), 3)
    const seats: Seats = [player('a', '🐵'), robot('ai:1', '🤖'), robot('ai:2', '👾'), robot('ai:3', '👽')]
    const result = autoplay(seats, game, 'normal')
    const replayed = result.moves.reduce((state, move) => {
      const next = play(move, state)
      return isOk(next) ? next.value : state
    }, game)
    expect(replayed).toEqual(result.game)
  })
})
