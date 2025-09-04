import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Suit } from './cards'
import { move } from './opponent'
import type { State } from './state'

function testGame(overrides: Partial<State> = {}): State {
  return {
    state: 'play',
    turn: 0,
    players: [
      { id: 0, hand: [], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    pile: [],
    table: [],
    ...overrides,
  }
}

async function runMove(game: State) {
  const promisedMove = move(game)
  await vi.runAllTimersAsync()
  return promisedMove
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('opponent move', () => {
  test('prefer scopa when available', async () => {
    const game = testGame({
      table: [
        [1, Suit.DENARI],
        [2, Suit.BASTONI],
      ],
      players: [
        {
          id: 0,
          hand: [
            [3, Suit.COPPE],
            [1, Suit.COPPE],
          ],
          pile: [],
          scope: 0,
        },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
    })

    const { card, targets } = await runMove(game)

    expect(card).toEqual([3, Suit.COPPE])
    expect(targets).toEqual([
      [1, Suit.DENARI],
      [2, Suit.BASTONI],
    ])
  })

  test('capture settebello when possible', async () => {
    const game = testGame({
      table: [
        [7, Suit.DENARI],
        [7, Suit.BASTONI],
        [2, Suit.DENARI],
      ],
      players: [
        {
          id: 0,
          hand: [[7, Suit.COPPE]],
          pile: [],
          scope: 0,
        },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
    })

    const { card, targets } = await runMove(game)

    expect(card).toEqual([7, Suit.COPPE])
    expect(targets).toEqual([[7, Suit.DENARI]])
  })

  test('capture settebello as part of a group', async () => {
    const game = testGame({
      table: [
        [7, Suit.DENARI],
        [7, Suit.BASTONI],
        [2, Suit.DENARI],
      ],
      players: [
        {
          id: 0,
          hand: [[9, Suit.COPPE]],
          pile: [],
          scope: 0,
        },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
    })

    const { card, targets } = await runMove(game)

    expect(card).toEqual([9, Suit.COPPE])
    expect(targets).toEqual([
      [7, Suit.DENARI],
      [2, Suit.DENARI],
    ])
  })

  test('prefer denari among equal single-card captures', async () => {
    const game = testGame({
      table: [
        [1, Suit.DENARI],
        [1, Suit.SPADE],
      ],
      players: [
        { id: 0, hand: [[1, Suit.COPPE]], pile: [], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
    })

    const { card, targets } = await runMove(game)

    expect(card).toEqual([1, Suit.COPPE])
    expect(targets).toHaveLength(1)
    expect(targets[0]).toEqual([1, Suit.DENARI])
  })

  test('discard least valuable non-denari when no captures are available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(Suit.BASTONI, Suit.SPADE, Suit.COPPE),
        async (suitToDiscard) => {
          const game = testGame({
            table: [[10, Suit.BASTONI]],
            players: [
              {
                id: 0,
                hand: [
                  [7, Suit.DENARI],
                  [7, suitToDiscard],
                ],
                pile: [],
                scope: 0,
              },
              { id: 1, hand: [], pile: [], scope: 0 },
            ],
          })

          const { card, targets } = await runMove(game)

          expect(targets).toHaveLength(0)
          expect(card).toEqual([7, suitToDiscard])
        },
      ),
    )
  })

  test('discard least valuable denari when no captures are available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(1, 2, 3, 4, 5, 6, 8, 9),
        async (valueToDiscard) => {
          const game = testGame({
            table: [[10, Suit.BASTONI]],
            players: [
              {
                id: 0,
                hand: [
                  [7, Suit.DENARI],
                  [valueToDiscard, Suit.DENARI],
                ],
                pile: [],
                scope: 0,
              },
              { id: 1, hand: [], pile: [], scope: 0 },
            ],
          })

          const { card, targets } = await runMove(game)

          expect(targets).toHaveLength(0)
          expect(card).toEqual([valueToDiscard, Suit.DENARI])
        },
      ),
    )
  })
})
