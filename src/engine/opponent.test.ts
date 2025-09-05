import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type Pile, Suit } from './cards'
import { move } from './opponent'
import type { State } from './state'

function testGame(table: Pile, hand: Pile): State {
  return {
    state: 'play',
    turn: 0,
    players: [
      { id: 0, hand, pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    pile: [],
    table,
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
  test('prefer to sweep the table when possible', async () => {
    const game = testGame(
      [
        [2, Suit.BASTONI],
        [1, Suit.DENARI],
      ],
      [
        [1, Suit.COPPE],
        [3, Suit.COPPE],
      ],
    )

    const { card, capture } = await runMove(game)

    expect(card).toEqual([3, Suit.COPPE])
    expect(capture).toEqual([
      [2, Suit.BASTONI],
      [1, Suit.DENARI],
    ])
  })

  test('prefer sweeping the table with a settebello', async () => {
    const game = testGame(
      [
        [5, Suit.COPPE],
        [2, Suit.COPPE],
      ],
      [
        [7, Suit.COPPE],
        [7, Suit.DENARI],
      ],
    )

    const { card, capture } = await runMove(game)

    expect(card).toEqual([7, Suit.DENARI])
    expect(capture).toEqual([
      [5, Suit.COPPE],
      [2, Suit.COPPE],
    ])
  })

  test('prefer sweeping the table with the coins suit', async () => {
    const game = testGame(
      [
        [4, Suit.COPPE],
        [2, Suit.COPPE],
      ],
      [
        [6, Suit.COPPE],
        [6, Suit.DENARI],
      ],
    )

    const { card, capture } = await runMove(game)

    expect(card).toEqual([6, Suit.DENARI])
    expect(capture).toEqual([
      [4, Suit.COPPE],
      [2, Suit.COPPE],
    ])
  })

  test('capture settebello when possible', async () => {
    const game = testGame(
      [
        [7, Suit.DENARI],
        [7, Suit.BASTONI],
        [2, Suit.DENARI],
      ],
      [[7, Suit.COPPE]],
    )

    const { card, capture } = await runMove(game)

    expect(card).toEqual([7, Suit.COPPE])
    expect(capture).toEqual([[7, Suit.DENARI]])
  })

  test('capture settebello as part of a group', async () => {
    const game = testGame(
      [
        [7, Suit.DENARI],
        [7, Suit.BASTONI],
        [2, Suit.DENARI],
      ],
      [[9, Suit.COPPE]],
    )

    const { card, capture } = await runMove(game)

    expect(card).toEqual([9, Suit.COPPE])
    expect(capture).toEqual([
      [7, Suit.DENARI],
      [2, Suit.DENARI],
    ])
  })

  test('prefer coins suit among equal single-card captures', async () => {
    const game = testGame(
      [
        [1, Suit.DENARI],
        [1, Suit.SPADE],
      ],
      [[1, Suit.COPPE]],
    )

    const { card, capture } = await runMove(game)

    expect(card).toEqual([1, Suit.COPPE])
    expect(capture).toHaveLength(1)
    expect(capture[0]).toEqual([1, Suit.DENARI])
  })

  test('discard least valuable suit when no captures are available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(Suit.BASTONI, Suit.SPADE, Suit.COPPE),
        async (suitToDiscard) => {
          const game = testGame(
            [],
            [
              [1, Suit.DENARI],
              [1, suitToDiscard],
            ],
          )

          const { card, capture } = await runMove(game)

          expect(capture).toHaveLength(0)
          expect(card).toEqual([1, suitToDiscard])
        },
      ),
    )
  })

  test('discard least valuable coins card when no captures are available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(1, 2, 3, 4, 5, 6, 8, 9, 10),
        async (valueToDiscard) => {
          const game = testGame(
            [],
            [
              [7, Suit.DENARI],
              [valueToDiscard, Suit.DENARI],
            ],
          )

          const { card, capture } = await runMove(game)

          expect(capture).toHaveLength(0)
          expect(card).toEqual([valueToDiscard, Suit.DENARI])
        },
      ),
    )
  })
})
