import { shuffle } from '@pacote/shuffle'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { bastoni, coppe, deck, denari, isSame, type Pile, spade } from './cards'
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

async function runMove(game: State, canCountCards = false, canLookAhead = false) {
  const promisedMove = move(game, { canCountCards, canLookAhead })
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

  test('avoid capture that leaves the table fully sweepable', async () => {
    const game = setupGame([coppe(3), spade(5), bastoni(4), denari(6)], [bastoni(6), bastoni(9)])

    const { card, take } = await runMove(game)

    expect(card).toEqual(bastoni(6))
    expect(take).toEqual([denari(6)])
  })

  test('avoid gifting a scopa even when the alternative takes three denari', async () => {
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      table: [denari(1), denari(2), denari(3), bastoni(7), coppe(2)],
      players: [
        { id: 0, hand: [coppe(6), spade(2)], pile: [coppe(7), denari(7), spade(7)], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: [denari(4)],
      lastTaken: [],
    }

    const { card, take } = await runMove(game)

    expect(card).toEqual(spade(2))
    expect(take).toEqual([denari(2)])
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

describe('next-player pressure', () => {
  test('weighs denari pressure from the next player, not any other opponent', async () => {
    const myPile = [denari(7)]
    const base: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0, 0],
      table: [bastoni(2), denari(9)],
      players: [
        { id: 0, hand: [coppe(2), coppe(9)], pile: myPile, scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
        { id: 2, hand: [], pile: [], scope: 0 },
      ],
      pile: [coppe(1)],
      lastTaken: [],
    }
    const manyDenari = [denari(1), denari(2), denari(3), denari(4), denari(5)]

    // player 2 (next) leads on denari → urgently take denari(9)
    const whenNextLeads = await runMove(
      { ...base, players: [base.players[0], base.players[1], { ...base.players[2], pile: manyDenari }] },
      true,
    )
    // player 1 (not next) leads on denari → no urgency, take bastoni(2) for better primes
    const whenOtherLeads = await runMove(
      { ...base, players: [base.players[0], { ...base.players[1], pile: manyDenari }, base.players[2]] },
      true,
    )

    expect(whenNextLeads.take).toEqual([denari(9)])
    expect(whenOtherLeads.take).toEqual([bastoni(2)])
  })

  test('doubles prime gain for suits where the next player leads, not any other opponent', async () => {
    const base: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0, 0],
      table: [bastoni(6), coppe(6)],
      players: [
        { id: 0, hand: [spade(6)], pile: [], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
        { id: 2, hand: [], pile: [], scope: 0 },
      ],
      pile: [coppe(1)],
      lastTaken: [],
    }

    // player 2 (next) leads in COPPE → doubled coppe gain → take coppe(6)
    const whenNextLeads = await runMove(
      { ...base, players: [base.players[0], base.players[1], { ...base.players[2], pile: [coppe(7)] }] },
      true,
    )
    // player 1 (not next) leads in COPPE → no doubling → tie broken by table order → bastoni(6)
    const whenOtherLeads = await runMove(
      { ...base, players: [base.players[0], { ...base.players[1], pile: [coppe(7)] }, base.players[2]] },
      true,
    )

    expect(whenNextLeads.take).toEqual([coppe(6)])
    expect(whenOtherLeads.take).toEqual([bastoni(6)])
  })
})

describe('last table', () => {
  test('captures when draw pile is exhausted, even when it would otherwise discard', async () => {
    const state: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      table: [coppe(3), bastoni(3)],
      players: [
        { id: 0, hand: [spade(3), bastoni(9)], pile: [coppe(7), bastoni(7), denari(7)], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: [denari(2)],
      lastTaken: [],
    }

    const normalPlay = await runMove(state)
    const atLastTable = await runMove({ ...state, pile: [] })

    expect(normalPlay.take).toHaveLength(0)
    expect(atLastTable.take).not.toHaveLength(0)
  })

  test('prefers larger capture at last table', async () => {
    const playerPile = [coppe(6), spade(6), denari(6), bastoni(6)]
    const state: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      table: [denari(1), coppe(2), bastoni(3), spade(2), coppe(9), spade(8)],
      players: [
        { id: 0, hand: [coppe(1), bastoni(7)], pile: playerPile, scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: [denari(3)],
      lastTaken: [],
    }

    const normalPlay = await runMove(state)
    const atLastTable = await runMove({ ...state, pile: [] })

    expect(normalPlay.card).toEqual(coppe(1))
    expect(normalPlay.take).toEqual([denari(1)])
    expect(atLastTable.card).toEqual(bastoni(7))
    expect(atLastTable.take).toEqual(expect.arrayContaining([coppe(2), spade(2), bastoni(3)]))
  })
})

describe('card counting', () => {
  test('doubles prime weight for suits where any opponent leads', async () => {
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      table: [bastoni(6), coppe(6)],
      players: [
        { id: 0, hand: [spade(6)], pile: [], scope: 0 },
        { id: 1, hand: [], pile: [coppe(7)], scope: 0 },
      ],
      pile: [],
      lastTaken: [],
    }

    const withoutCounting = await runMove(game)
    const withCounting = await runMove(game, true)

    // Without counting: coppe(6) and bastoni(6) both give 18 prime pts — tie broken by table order (bastoni first)
    expect(withoutCounting.take).toEqual([bastoni(6)])
    // With counting: opponent leads in coppe (21 > 0), so coppe gain is doubled → 36 vs 18
    expect(withCounting.take).toEqual([coppe(6)])
  })

  test('increases denari weight when trailing an opponent on denari', async () => {
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      table: [bastoni(2), denari(9)],
      players: [
        { id: 0, hand: [coppe(2), coppe(9)], pile: [denari(7)], scope: 0 },
        { id: 1, hand: [], pile: [denari(1), denari(2), denari(3), denari(4), denari(5)], scope: 0 },
      ],
      pile: [],
      lastTaken: [],
    }

    const withoutCounting = await runMove(game)
    const withCounting = await runMove(game, true)

    // Without counting:
    //   coppe(2) takes bastoni(2): prime COPPE=12+BASTONI=12=24, cards=2, denari=0 → 26
    //   coppe(9) takes denari(9): prime COPPE=10+DENARI=0 (own pile already has 21)=10, cards=2, denari=10 → 22
    //   bastoni(2) wins (26 > 22)
    expect(withoutCounting.take).toEqual([bastoni(2)])
    // With counting (denariUnit=15, no prime doubling since own DENARI best 21 > opponent best 16):
    //   coppe(2) takes bastoni(2): prime=24, cards=2, denari=0 → 26
    //   coppe(9) takes denari(9): prime=10, cards=2, denari=15 → 27
    //   denari(9) wins (27 > 26)
    expect(withCounting.take).toEqual([denari(9)])
  })

  test('prefers larger capture when trailing on card count', async () => {
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      table: [bastoni(6), coppe(5), coppe(2), coppe(3)],
      players: [
        { id: 0, hand: [spade(6), coppe(10)], pile: [bastoni(7)], scope: 0 },
        { id: 1, hand: [], pile: [denari(1), denari(2), denari(3), denari(4)], scope: 0 },
      ],
      pile: [denari(3)],
      lastTaken: [],
    }

    const withCounting = await runMove(game, true)

    const withoutCounting = await runMove(game)
    expect(withCounting.take.length).toBeGreaterThan(withoutCounting.take.length)
    expect(withCounting.take).toEqual(expect.arrayContaining([coppe(5), coppe(2), coppe(3)]))
    expect(withCounting.card).toEqual(coppe(10))
  })
})

describe('canLookAhead', () => {
  test('can switch from immediate take to discard when lookahead sees a better follow-up', async () => {
    const table: Pile = [denari(7), coppe(2)]
    const hand: Pile = [denari(1), denari(2)]
    const knownCards = [...table, ...hand]
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      table,
      players: [
        { id: 0, hand, pile: [], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: deck().filter((card) => !knownCards.some((k) => isSame(k, card))),
      lastTaken: [],
    }

    const withoutLookahead = await runMove(game)
    const withLookahead = await runMove(game, false, true)

    expect(withoutLookahead.card).toEqual(denari(2))
    expect(withoutLookahead.take).toEqual([coppe(2)])
    expect(withLookahead.card).toEqual(denari(2))
    expect(withLookahead.take).toHaveLength(0)
  })

  test('discounts setup when opponent can plausibly disrupt it', async () => {
    const table: Pile = [denari(3), denari(9)]
    const hand: Pile = [denari(1), denari(2)]
    const knownCards = [...table, ...hand]
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      table,
      players: [
        { id: 0, hand, pile: [], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: deck().filter((card) => !knownCards.some((k) => isSame(k, card))),
      lastTaken: [],
    }

    const naiveLookahead = await runMove(game, false, true)
    const countingLookahead = await runMove(game, true, true)

    expect(naiveLookahead.take).toHaveLength(0)
    expect(countingLookahead.take).toHaveLength(0)
    expect(naiveLookahead.card).toEqual(denari(2))
    expect(countingLookahead.card).toEqual(denari(1))
  })
})
