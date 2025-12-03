import { Err, isErr, isOk, Ok, type Result } from '@pacote/result'
import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { bastoni, coppe, deck, denari, type Pile, spade } from './cards'
import { deal, play } from './scopa'
import type { State } from './state'

function getGameState(game: Result<State, Error>): State {
  expect(isOk(game)).toBeTruthy()
  if (isOk(game)) {
    return game.value
  }
  throw new Error('invalid game state')
}

describe('deal', () => {
  test('deal sets state', () => {
    expect(deal(deck())).toMatchObject(Ok({ state: 'play' }))
  })

  test('deal four cards on the table', () => {
    expect(getGameState(deal(deck())).table).toHaveLength(4)
  })

  test('can deal up to two kings', () => {
    const game = deal([bastoni(10), coppe(10), spade(7), denari(7)])

    expect(getGameState(game).table).toHaveLength(4)
  })

  test('reshuffle cards and deal again if three or more kings are on the table', () => {
    const game = deal([bastoni(10), coppe(10), spade(10), denari(7)])

    expect(game).toMatchObject(
      Err({
        message: 'More than two kings on the table. Deal again.',
      }),
    )
  })

  test('Scopa is a game for 2, 3, 4 or 6 players', () => {
    fc.assert(
      fc.property(fc.constantFrom(2, 3, 4, 6), (players) => {
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
    const hands = game.players.reduce<Pile>((all, p) => all.concat(p.hand), [])
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
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [denari(1), denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(3)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [denari(4)],
      lastCaptured: [],
    }

    const next = play({ card: denari(1), capture: [] }, game)

    expect(next).toMatchObject(
      Ok({
        state: 'play',
        turn: 1,
        players: [
          { id: 0, hand: [denari(2)], pile: [], scope: 0 },
          { id: 1, hand: [denari(3)], pile: [], scope: 0 },
        ],
        pile: [],
        table: [denari(4), denari(1)],
        lastCaptured: [],
      }),
    )
  })

  test('player two plays a card from their hand on the table', () => {
    const game: State = {
      state: 'play',
      turn: 1,
      players: [
        { id: 0, hand: [denari(1)], pile: [], scope: 0 },
        { id: 1, hand: [denari(2), denari(3)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [denari(4)],
      lastCaptured: [],
    }

    const next = play({ card: denari(2), capture: [] }, game)

    expect(next).toMatchObject(
      Ok({
        state: 'play',
        turn: 0,
        players: [
          { id: 0, hand: [denari(1)], pile: [], scope: 0 },
          { id: 1, hand: [denari(3)], pile: [], scope: 0 },
        ],
        pile: [],
        table: [denari(4), denari(2)],
        lastCaptured: [],
      }),
    )
  })

  test(`a player cannot play a card they don't have`, () => {
    const card = denari(1)
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(3)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [denari(4)],
      lastCaptured: [],
    }

    const next = play({ card, capture: [] }, game)

    expect(next).toMatchObject(Err({ message: 'Not your turn.' }))
  })

  test(`a player captures a card from the table if it's the same value as the card played`, () => {
    const card = denari(1)
    const capture = coppe(1)
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(3)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [denari(4), capture],
      lastCaptured: [],
    }

    const next = getGameState(play({ card, capture: [] }, game))

    expect(next.table).not.toContain(card)
    expect(next.table).not.toContain(capture)
    expect(next.players[0].pile).toContain(card)
    expect(next.players[0].pile).toContain(capture)
    expect(next.lastCaptured).toEqual([capture])
    expect(next.state).toBe('play')
  })

  test('a player must choose a card from the table if more than one possible capture exists', () => {
    const card = denari(1)
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(3)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [bastoni(1), coppe(1)],
      lastCaptured: [],
    }

    const next = play({ card, capture: [] }, game)

    expect(next).toMatchObject(Err({ message: 'Choose the cards to capture.' }))
  })

  test('a player must choose a valid capture', () => {
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [denari(4), denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(3)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [bastoni(1), coppe(1)],
      lastCaptured: [],
    }

    const next = play({ card: denari(4), capture: [bastoni(1)] }, game)

    expect(next).toMatchObject(
      Err({
        message: 'The chosen cards may not be captured.',
      }),
    )
  })

  test('a player chooses a card from the table that is the same value as the card played', () => {
    const card = denari(1)
    const capture = [coppe(1)]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(3)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [bastoni(1), ...capture],
      lastCaptured: [],
    }

    const next = getGameState(play({ card, capture }, game))

    expect(next.table).not.toContain(card)
    expect(next.table).not.toContain(capture)
    expect(next.players[0].pile).toEqual([...capture, card])
    expect(next.lastCaptured).toEqual(capture)
    expect(next.state).toBe('play')
  })

  test('a player captures multiple cards from the table if their cumulative value is the same as the card played', () => {
    const card = denari(3)
    const capture = [coppe(1), bastoni(1), spade(1)]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(5)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [denari(4), ...capture],
      lastCaptured: [],
    }

    const next = getGameState(play({ card, capture: [] }, game))

    expect(next.table).not.toContain(card)
    for (const capturedCard of capture) {
      expect(next.table).not.toContain(capturedCard)
    }
    expect(next.players[0].pile).toContain(card)
    for (const capturedCard of capture) {
      expect(next.players[0].pile).toContain(capturedCard)
    }
    expect(next.lastCaptured).toEqual(expect.arrayContaining(capture))
    expect(next.state).toBe('play')
  })

  test('a player may only capture the least number of cards when multiple combinations exist', () => {
    const card = denari(2)
    const capture = [coppe(1), bastoni(1)]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card], pile: [], scope: 0 },
        { id: 1, hand: [denari(10)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [coppe(2), ...capture],
      lastCaptured: [],
    }

    expect(isErr(play({ card, capture }, game))).toBe(true)
  })

  test('capture order should not be considered when playing', () => {
    const card = denari(2)
    const capture = [coppe(1), bastoni(1)]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card], pile: [], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: [],
      table: [bastoni(1), spade(1), coppe(1)],
      lastCaptured: [],
    }

    expect(isOk(play({ card, capture }, game))).toBe(true)
  })

  test('a player scores a scopa when they capture all the cards on the table', () => {
    const card = denari(3)
    const table = [coppe(1), bastoni(1), spade(1)]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(5)], pile: [], scope: 0 },
      ],
      pile: [],
      table,
      lastCaptured: [],
    }

    const next = play({ card, capture: [] }, game)

    expect(getGameState(next).players[0].scope).toBe(1)
    expect(next).toMatchObject(Ok({ state: 'play' }))
  })

  test('four cards are drawn from the pile when the table is empty', () => {
    const card = denari(3)

    const topOfPile = [coppe(4), bastoni(4), spade(4), denari(4)]

    const restOfPile = [coppe(8)]

    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card, denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(5)], pile: [], scope: 0 },
      ],
      pile: [...topOfPile, ...restOfPile],
      table: [coppe(1), bastoni(1), spade(1)],
      lastCaptured: [],
    }

    const next = play({ card, capture: [] }, game)

    expect(next).toMatchObject(
      Ok({
        table: topOfPile,
        pile: restOfPile,
        state: 'play',
      }),
    )
  })

  test(`three cards are drawn from the pile when a player's hand is empty`, () => {
    const card = denari(3)
    const topOfPile = [coppe(4), bastoni(4), spade(4)]
    const restOfPile = [coppe(8)]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { id: 0, hand: [card], pile: [], scope: 0 },
        { id: 1, hand: [denari(5)], pile: [], scope: 0 },
      ],
      pile: [...topOfPile, ...restOfPile],
      table: [coppe(1)],
      lastCaptured: [],
    }

    const next = play({ card, capture: [] }, game)

    expect(getGameState(next).players[0].hand).toEqual(topOfPile)
    expect(next).toMatchObject(
      Ok({
        pile: restOfPile,
        state: 'play',
      }),
    )
  })

  test(`the game ends when the next player's hand is empty and they can't draw any more cards`, () => {
    const card = denari(3)
    const game: State = {
      state: 'play',
      turn: 1,
      players: [
        { id: 0, hand: [], pile: [], scope: 0 },
        { id: 1, hand: [card], pile: [], scope: 0 },
      ],
      pile: [],
      table: [],
      lastCaptured: [],
    }

    const next = play({ card, capture: [] }, game)

    expect(next).toMatchObject(Ok({ state: 'stop' }))
  })
})
