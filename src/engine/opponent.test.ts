import { shuffle } from '@pacote/shuffle'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { bastoni, coppe, denari, type Pile, spade } from './cards'
import { move } from './opponent'
import type { State } from './state'

function setupGame(table: Pile, hand: Pile, pile: Pile = []): State {
  return {
    state: 'play',
    turn: 0,
    wins: [0, 0],
    table,
    players: [
      { id: 0, hand, pile, scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    pile: [],
    lastTaken: [],
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

describe('taking moves', () => {
  test('prefer to sweep the table when possible', async () => {
    const game = setupGame([bastoni(2), denari(1)], [coppe(3), coppe(1)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(coppe(3))
    expect(take).toEqual([bastoni(2), denari(1)])
  })

  test('prefer sweeping the table with a settebello', async () => {
    const game = setupGame([coppe(5), coppe(2)], [denari(7), coppe(7)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(denari(7))
    expect(take).toEqual([coppe(5), coppe(2)])
  })

  test.each([
    [[denari(6), coppe(6)]],
    [[coppe(6), denari(6)]],
  ])('prefer sweeping the table with the coins suit', async (hand) => {
    const game = setupGame([coppe(4), coppe(2)], hand)

    const { card, take } = await runMove(game)

    expect(card).toEqual(denari(6))
    expect(take).toEqual([coppe(4), coppe(2)])
  })

  test('must pick the least number of cards when multiple combinations exist', async () => {
    const game = setupGame([coppe(5), coppe(3), coppe(2)], [spade(5)])

    const { take } = await runMove(game)

    expect(take).toEqual([coppe(5)])
  })

  test('take settebello when possible', async () => {
    const game = setupGame([denari(7), bastoni(7), denari(2)], [coppe(7)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(coppe(7))
    expect(take).toEqual([denari(7)])
  })

  test('take settebello as part of a group', async () => {
    const game = setupGame([denari(7), bastoni(7), denari(2)], [coppe(9)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(coppe(9))
    expect(take).toEqual([denari(7), denari(2)])
  })

  test('prefer taking coins suit among equal single-card options', async () => {
    const game = setupGame([denari(1), spade(1)], [coppe(1)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(coppe(1))
    expect(take).toEqual([denari(1)])
  })

  test('prefer to take with coins suit', async () => {
    const game = setupGame([coppe(1)], [bastoni(1), denari(1), spade(1)])

    const { card } = await runMove(game)

    expect(card).toEqual(denari(1))
  })

  test('prefer taking the most valuable cards when multiple combinations exist', async () => {
    const game = setupGame([bastoni(1), bastoni(2), bastoni(3), bastoni(4)], [coppe(5)])

    const { take } = await runMove(game)

    expect(take).toEqual([bastoni(1), bastoni(4)])
  })

  test('if all options are equal, take with the first available suit', async () => {
    const game = setupGame([coppe(1)], [bastoni(1), spade(1)])

    const { card } = await runMove(game)

    expect(card).toEqual(bastoni(1))
  })

  test('prefer taking with higher marginal primiera gain', async () => {
    const game = setupGame([bastoni(5), bastoni(2), bastoni(4)], [coppe(5), coppe(6)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(coppe(6))
    expect(take).toEqual([bastoni(2), bastoni(4)])
  })

  test('prefer taking in a new suit over one that does not improve an already-covered suit', async () => {
    const game = setupGame([denari(1), coppe(1)], [bastoni(1)], [denari(7)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(bastoni(1))
    expect(take).toEqual([coppe(1)])
  })

  test('deprioritise taking coins suit cards when already taken more than half', async () => {
    const manyDenari = [denari(1), denari(2), denari(4), denari(5), denari(6), denari(8)]
    const game = setupGame([denari(3), bastoni(7)], [coppe(3), spade(7)], manyDenari)

    const { card, take } = await runMove(game)

    expect(card).toEqual(spade(7))
    expect(take).toEqual([bastoni(7)])
  })

  test('still take settebello when already taken more than half of all coins suit cards', async () => {
    const manyDenari = [denari(1), denari(2), denari(4), denari(5), denari(6), denari(8)]
    const game = setupGame([denari(7), bastoni(3)], [coppe(7), coppe(3)], manyDenari)

    const { card, take } = await runMove(game)

    expect(card).toEqual(coppe(7))
    expect(take).toEqual([denari(7)])
  })
})

describe('discard moves', () => {
  test('discard least valuable suit when taking is not possible', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(bastoni, spade, coppe), async (suitToDiscard) => {
        const game = setupGame([], shuffle([denari(1), suitToDiscard(1)]))

        const { card, take } = await runMove(game)

        expect(card).toEqual(suitToDiscard(1))
        expect(take).toHaveLength(0)
      }),
    )
  })

  test('discard least valuable card when taking is not possible', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(1, 2, 3, 4, 5, 6, 8, 9, 10),
        fc.constantFrom(denari, coppe, bastoni, spade),
        async (valueToDiscard, suit) => {
          const game = setupGame([], shuffle([suit(7), suit(valueToDiscard)]))

          const { card, take } = await runMove(game)

          expect(card).toEqual(suit(valueToDiscard))
          expect(take).toHaveLength(0)
        },
      ),
    )
  })

  test('if all options are equal, discard the first available suit', async () => {
    const game = setupGame([], [bastoni(1), spade(1)])

    const { card } = await runMove(game)

    expect(card).toEqual(bastoni(1))
  })

  test('avoid discarding a card that enables the opponent to sweep the table', async () => {
    const game = setupGame([denari(5)], [coppe(2), spade(7)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(spade(7))
    expect(take).toHaveLength(0)
  })
})
