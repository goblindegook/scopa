import assert from 'node:assert'
import { Err, Ok, type Result, isErr, isOk } from '@pacote/result'
import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { type Card, type Deck, Suit, deck } from './cards'
import { deal, play } from './scopa'
import type { State } from './state'

function getGameState(game: Result<State, Error>): State {
  assert(isOk(game))
  return game.value
}

describe('deal', () => {
  test('deal sets state', () => {
    expect(deal(deck())).toMatchObject(Ok({ state: 'play' }))
  })

  test('deal four cards on the table', () => {
    expect(getGameState(deal(deck())).table).toHaveLength(4)
  })

  test('reshuffle cards and deal again if three or more kings are on the table', () => {
    const game = deal([
      [10, Suit.BASTONI],
      [10, Suit.COPPE],
      [10, Suit.SPADE],
      [7, Suit.DENARI],
    ])

    expect(game).toMatchObject(
      Err({
        message: 'More than two kings on the table. Deal again.',
      }),
    )
  })

  test('Scopa is a game for 2, 3, 4 or 6 players', () => {
    fc.assert(
      fc.property(fc.constantFrom<(2 | 3 | 4 | 6)[]>(2, 3, 4, 6), (players) => {
        const game = getGameState(deal(deck(), { players }))
        return game.players.length === players
      }),
    )
  })

  test('deal three cards to each player', () => {
    const game = getGameState(deal(deck()))
    for (const p of game.players) {
      expect(p.hand).toHaveLength(3)
    }
  })

  test('each player begins with an empty pile', () => {
    const game = getGameState(deal(deck()))
    for (const p of game.players) {
      expect(p.pile).toHaveLength(0)
    }
  })

  test('each player begins with no score', () => {
    const game = getGameState(deal(deck()))
    for (const p of game.players) {
      expect(p.scope).toEqual(0)
    }
  })

  test('table pile contains remaining cards', () => {
    const cards = deck()
    const game = getGameState(deal(cards))
    const hands = game.players.reduce<Deck>((all, p) => all.concat(p.hand), [])
    expect(game.pile).toHaveLength(30)
    expect([...game.table, ...hands, ...game.pile]).toEqual(cards)
  })

  test('random player begins', () => {
    const game = getGameState(deal(deck()))
    expect(game.players[game.turn]).toBeDefined()
  })
})

describe('play', () => {
  test('player one plays a card from their hand on the table', () => {
    const card: Card = [1, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[3, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [[4, Suit.DENARI]],
    }

    const next = getGameState(play({ card, targets: [] }, game))

    expect(next.table).toContain(card)
    expect(next.players[0].hand).not.toContain(card)
    expect(next.turn).toBe(1)
    expect(next.state).toBe('play')
  })

  test('player two plays a card from their hand on the table', () => {
    const card: Card = [2, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 1,
      players: [
        { id: 0, hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [card, [3, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [[4, Suit.DENARI]],
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchObject(Ok({ state: 'play', turn: 0 }))
  })

  test(`a player cannot play a card they don't have`, () => {
    const card: Card = [1, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [[2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[3, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [[4, Suit.DENARI]],
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchObject(Err({ message: 'Not your turn.' }))
  })

  test(`a player captures a card from the table if it's the same value as the card played`, () => {
    const card: Card = [1, Suit.DENARI]
    const target: Card = [1, Suit.COPPE]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[3, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [[4, Suit.DENARI], target],
    }

    const next = getGameState(play({ card, targets: [] }, game))

    expect(next.table).not.toContain(card)
    expect(next.table).not.toContain(target)
    expect(next.players[0].pile).toContain(card)
    expect(next.players[0].pile).toContain(target)
    expect(next.state).toBe('play')
  })

  test('a player must choose a card from the table if more than one possible capture exists', () => {
    const card: Card = [1, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[3, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [
        [1, Suit.BASTONI],
        [1, Suit.COPPE],
      ],
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchObject(Err({ message: 'Choose the cards to capture.' }))
  })

  test('a player must choose a valid capture', () => {
    const card: Card = [4, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[3, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [
        [1, Suit.BASTONI],
        [1, Suit.COPPE],
      ],
    }

    const next = play({ card, targets: [[1, Suit.BASTONI]] }, game)

    expect(next).toMatchObject(
      Err({
        message: 'The targetted cards may not be captured.',
      }),
    )
  })

  test('a player chooses a card from the table that is the same value as the card played', () => {
    const card: Card = [1, Suit.DENARI]
    const target: Card = [1, Suit.COPPE]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[3, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [[1, Suit.BASTONI], target],
    }

    const next = getGameState(play({ card, targets: [target] }, game))

    expect(next.table).not.toContain(card)
    expect(next.table).not.toContain(target)
    expect(next.players[0].pile).toContain(card)
    expect(next.players[0].pile).toContain(target)
    expect(next.state).toBe('play')
  })

  test('a player captures multiple cards from the table if their cumulative value is the same as the card played', () => {
    const card: Card = [3, Suit.DENARI]
    const targets: Deck = [
      [1, Suit.COPPE],
      [1, Suit.BASTONI],
      [1, Suit.SPADE],
    ]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[5, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [[4, Suit.DENARI], ...targets],
    }

    const next = getGameState(play({ card, targets: [] }, game))

    expect(next.table).not.toContain(card)
    for (const target of targets) {
      expect(next.table).not.toContain(target)
    }
    expect(next.players[0].pile).toContain(card)
    for (const target of targets) {
      expect(next.players[0].pile).toContain(target)
    }
    expect(next.state).toBe('play')
  })

  test('a player may only capture the least number of cards when multiple combinations exist', () => {
    const card: Card = [2, Suit.DENARI]
    const targets: Deck = [
      [1, Suit.COPPE],
      [1, Suit.BASTONI],
    ]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card], pile: [], scope: 0 },
        { id: 1, hand: [[10, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table: [[2, Suit.COPPE], ...targets],
    }

    expect(isErr(play({ card, targets }, game))).toBe(true)
  })

  test('target order should not be considered when playing', () => {
    const card: Card = [2, Suit.DENARI]
    const targets: Deck = [
      [1, Suit.COPPE],
      [1, Suit.BASTONI],
    ]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card], pile: [], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: [],
      table: [
        [1, Suit.BASTONI],
        [1, Suit.SPADE],
        [1, Suit.COPPE],
      ],
    }

    expect(isOk(play({ card, targets }, game))).toBe(true)
  })

  test('a player scores a scopa when they capture all the cards on the table', () => {
    const card: Card = [3, Suit.DENARI]
    const table: Deck = [
      [1, Suit.COPPE],
      [1, Suit.BASTONI],
      [1, Suit.SPADE],
    ]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[5, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [],
      table,
    }

    const next = play({ card, targets: [] }, game)

    expect(getGameState(next).players[0].scope).toBe(1)
    expect(next).toMatchObject(Ok({ state: 'play' }))
  })

  test('four cards are drawn from the pile when the table is empty', () => {
    const card: Card = [3, Suit.DENARI]

    const topOfPile: Deck = [
      [4, Suit.COPPE],
      [4, Suit.BASTONI],
      [4, Suit.SPADE],
      [4, Suit.DENARI],
    ]

    const restOfPile: Deck = [[8, Suit.COPPE]]

    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { id: 1, hand: [[5, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [...topOfPile, ...restOfPile],
      table: [
        [1, Suit.COPPE],
        [1, Suit.BASTONI],
        [1, Suit.SPADE],
      ],
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchObject(
      Ok({
        table: topOfPile,
        pile: restOfPile,
        state: 'play',
      }),
    )
  })

  test(`three cards are drawn from the pile when a player's hand is empty`, () => {
    const card: Card = [3, Suit.DENARI]

    const topOfPile: Deck = [
      [4, Suit.COPPE],
      [4, Suit.BASTONI],
      [4, Suit.SPADE],
    ]

    const restOfPile: Deck = [[8, Suit.COPPE]]

    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card], pile: [], scope: 0 },
        { id: 1, hand: [[5, Suit.DENARI]], pile: [], scope: 0 },
      ],
      pile: [...topOfPile, ...restOfPile],
      table: [[1, Suit.COPPE]],
    }

    const next = play({ card, targets: [] }, game)

    expect(getGameState(next).players[0].hand).toEqual(topOfPile)
    expect(next).toMatchObject(
      Ok({
        pile: restOfPile,
        state: 'play',
      }),
    )
  })

  test(`the game ends when the next player's hand is empty and they can't draw any more cards`, () => {
    const card: Card = [3, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 1,
      players: [
        { id: 0, hand: [], pile: [], scope: 0 },
        { id: 1, hand: [card], pile: [], scope: 0 },
      ],
      pile: [],
      table: [],
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchObject(Ok({ state: 'stop' }))
  })
})
