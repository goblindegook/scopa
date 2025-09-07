import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { bastoni, coppe, denari, type Pile, spade } from './cards'
import { move } from './opponent'
import type { State } from './state'

function testGame(table: Pile, hand: Pile): State {
  return {
    state: 'play',
    turn: 0,
    table,
    players: [
      { id: 0, hand, pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    pile: [],
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
    const game = testGame([bastoni(2), denari(1)], [coppe(3), coppe(1)])

    const { card, capture } = await runMove(game)

    expect(card).toEqual(coppe(3))
    expect(capture).toEqual([bastoni(2), denari(1)])
  })

  test('prefer sweeping the table with a settebello', async () => {
    const game = testGame([coppe(5), coppe(2)], [denari(7), coppe(7)])

    const { card, capture } = await runMove(game)

    expect(card).toEqual(denari(7))
    expect(capture).toEqual([coppe(5), coppe(2)])
  })

  test('prefer sweeping the table with the coins suit', async () => {
    const game = testGame([coppe(4), coppe(2)], [denari(6), coppe(6)])

    const { card, capture } = await runMove(game)

    expect(card).toEqual(denari(6))
    expect(capture).toEqual([coppe(4), coppe(2)])
  })

  test('must pick the least number of cards when multiple combinations exist', async () => {
    const game = testGame([coppe(5), coppe(3), coppe(2)], [spade(5)])

    const { capture } = await runMove(game)

    expect(capture).toEqual([coppe(5)])
  })

  test('capture settebello when possible', async () => {
    const game = testGame([denari(7), bastoni(7), denari(2)], [coppe(7)])

    const { card, capture } = await runMove(game)

    expect(card).toEqual(coppe(7))
    expect(capture).toEqual([denari(7)])
  })

  test('capture settebello as part of a group', async () => {
    const game = testGame([denari(7), bastoni(7), denari(2)], [coppe(9)])

    const { card, capture } = await runMove(game)

    expect(card).toEqual(coppe(9))
    expect(capture).toEqual([denari(7), denari(2)])
  })

  test('prefer coins suit among equal single-card captures', async () => {
    const game = testGame([denari(1), spade(1)], [coppe(1)])

    const { card, capture } = await runMove(game)

    expect(card).toEqual(coppe(1))
    expect(capture).toEqual([denari(1)])
  })

  test('prefer to capture with coins suit', async () => {
    const game = testGame([coppe(1), spade(1)], [bastoni(1), denari(1)])

    const { card } = await runMove(game)

    expect(card).toEqual(denari(1))
  })

  test('discard least valuable suit when no captures are available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(bastoni, spade, coppe),
        async (suitToDiscard) => {
          const game = testGame([], [denari(1), suitToDiscard(1)])

          const { card, capture } = await runMove(game)

          expect(card).toEqual(suitToDiscard(1))
          expect(capture).toHaveLength(0)
        },
      ),
    )
  })

  test('discard least valuable card when no captures are available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(1, 2, 3, 4, 5, 6, 8, 9, 10),
        fc.constantFrom(denari, coppe, bastoni, spade),
        async (valueToDiscard, suit) => {
          const game = testGame([], [suit(7), suit(valueToDiscard)])

          const { card, capture } = await runMove(game)

          expect(card).toEqual(suit(valueToDiscard))
          expect(capture).toHaveLength(0)
        },
      ),
    )
  })
})
