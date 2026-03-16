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

  test('deal starts with zero wins', () => {
    expect(getGameState(deal(deck())).wins).toEqual([0, 0])
  })

  test('deal carries over wins from a previous hand', () => {
    expect(getGameState(deal(deck(), { wins: [3, 5] })).wins).toEqual([3, 5])
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
      wins: [0, 0],
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
      wins: [0, 0],
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
      wins: [0, 0],
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
      wins: [0, 0],
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
      wins: [0, 0],
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
      wins: [0, 0],
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
      wins: [0, 0],
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
      wins: [0, 0],
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
      wins: [0, 0],
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
      wins: [0, 0],
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

  test('a scopa is not awarded when clearing the table with the last card of the game', () => {
    const card = denari(3)
    const table = [coppe(1), bastoni(1), spade(1)]
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      players: [
        { id: 0, hand: [card], pile: [], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: [],
      table,
      lastCaptured: [],
    }

    const next = play({ card, capture: [] }, game)

    expect(getGameState(next).players[0].scope).toBe(0)
    expect(next).toMatchObject(Ok({ state: 'stop' }))
  })

  test('a player scores a scopa when they capture all the cards on the table', () => {
    const card = denari(3)
    const table = [coppe(1), bastoni(1), spade(1)]
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
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

  test('when the table is swept, it stays empty', () => {
    const card = denari(3)
    const pile = [coppe(4), bastoni(4), spade(4), denari(4)]
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      players: [
        { id: 0, hand: [card, denari(2)], pile: [], scope: 0 },
        { id: 1, hand: [denari(5)], pile: [], scope: 0 },
      ],
      pile,
      table: [coppe(1), bastoni(1), spade(1)],
      lastCaptured: [],
    }

    const next = play({ card, capture: [] }, game)

    expect(next).toMatchObject(
      Ok({
        table: [],
        pile,
        state: 'play',
      }),
    )
  })

  test(`a player's hand stays empty while other players still have cards`, () => {
    const card = denari(3)
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      players: [
        { id: 0, hand: [card], pile: [], scope: 0 },
        { id: 1, hand: [denari(5)], pile: [], scope: 0 },
      ],
      pile: [coppe(4), bastoni(4), spade(4), coppe(8)],
      table: [coppe(1)],
      lastCaptured: [],
    }

    const next = getGameState(play({ card, capture: [] }, game))

    expect(next.players[0].hand).toHaveLength(0)
    expect(next.pile).toHaveLength(4)
  })

  test('cards are dealt to all players simultaneously when all hands are empty', () => {
    const player0Card = denari(3)
    const player1Card = denari(5)
    const topOfPile = [coppe(4), bastoni(4), spade(4), denari(4), bastoni(5), spade(5)]
    const restOfPile = [coppe(8)]
    const afterPlayer0 = getGameState(
      play(
        { card: player0Card, capture: [] },
        {
          state: 'play',
          turn: 0,
          wins: [0, 0],
          players: [
            { id: 0, hand: [player0Card], pile: [], scope: 0 },
            { id: 1, hand: [player1Card], pile: [], scope: 0 },
          ],
          pile: [...topOfPile, ...restOfPile],
          table: [coppe(1)],
          lastCaptured: [],
        },
      ),
    )

    const afterPlayer1 = getGameState(play({ card: player1Card, capture: [] }, afterPlayer0))

    expect(afterPlayer1.players[0].hand).toEqual([coppe(4), bastoni(4), spade(4)])
    expect(afterPlayer1.players[1].hand).toEqual([denari(4), bastoni(5), spade(5)])
    expect(afterPlayer1.pile).toEqual(restOfPile)
  })

  test('cards are dealt equally when the pile has fewer than 3 cards per player', () => {
    const player0Card = denari(3)
    const player1Card = denari(5)
    const pile = [coppe(4), bastoni(4), spade(4), denari(4)]
    const afterPlayer0 = getGameState(
      play(
        { card: player0Card, capture: [] },
        {
          state: 'play',
          turn: 0,
          wins: [0, 0],
          players: [
            { id: 0, hand: [player0Card], pile: [], scope: 0 },
            { id: 1, hand: [player1Card], pile: [], scope: 0 },
          ],
          pile,
          table: [coppe(1)],
          lastCaptured: [],
        },
      ),
    )

    const afterPlayer1 = getGameState(play({ card: player1Card, capture: [] }, afterPlayer0))

    expect(afterPlayer1.players[0].hand).toHaveLength(2)
    expect(afterPlayer1.players[1].hand).toHaveLength(2)
    expect(afterPlayer1.pile).toHaveLength(0)
  })

  test(`the game ends when the next player's hand is empty and they can't draw any more cards`, () => {
    const card = denari(3)
    const game: State = {
      state: 'play',
      turn: 1,
      wins: [0, 0],
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

  test('when the game ends, any cards left on the table go to the player who made the last capture', () => {
    const card = denari(3)
    const tableCards = [coppe(1), bastoni(1)]
    const game: State = {
      state: 'play',
      turn: 1,
      wins: [0, 0],
      players: [
        { id: 0, hand: [], pile: [denari(7)], scope: 0 },
        { id: 1, hand: [card], pile: [], scope: 0 },
      ],
      pile: [],
      table: tableCards,
      lastCaptured: [],
      lastCapturer: 0,
    }

    const next = getGameState(play({ card, capture: [] }, game))

    expect(next.state).toBe('stop')
    expect(next.table).toHaveLength(0)
    expect(next.players[0].pile).toEqual([denari(7), ...tableCards, card])
  })

  test('the last capturer is tracked across turns and gets remaining table cards at game end', () => {
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [0, 0],
      players: [
        { id: 0, hand: [denari(1)], pile: [], scope: 0 },
        { id: 1, hand: [denari(3)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [coppe(1), bastoni(2)],
      lastCaptured: [],
    }

    const afterCapture = getGameState(play({ card: denari(1), capture: [coppe(1)] }, game))
    const finalState = getGameState(play({ card: denari(3), capture: [] }, afterCapture))

    expect(finalState.state).toBe('stop')
    expect(finalState.table).toEqual([])
    expect(finalState.players[0].pile).toEqual([coppe(1), denari(1), bastoni(2), denari(3)])
  })

  test('wins are updated when the hand ends with a clear winner', () => {
    const game: State = {
      state: 'play',
      turn: 1,
      wins: [2, 1],
      players: [
        {
          id: 0,
          hand: [],
          pile: [denari(7), denari(1), coppe(7), bastoni(7), spade(7)],
          scope: 0,
        },
        { id: 1, hand: [spade(1)], pile: [], scope: 0 },
      ],
      pile: [],
      table: [denari(2)],
      lastCaptured: [],
      lastCapturer: 0,
    }

    const next = getGameState(play({ card: spade(1), capture: [] }, game))

    expect(next.state).toBe('stop')
    expect(next.wins).toEqual([3, 1])
  })

  test('wins are not updated when the hand ends in a tie', () => {
    const game: State = {
      state: 'play',
      turn: 0,
      wins: [1, 2],
      players: [
        { id: 0, hand: [denari(1)], pile: [], scope: 0 },
        { id: 1, hand: [], pile: [], scope: 0 },
      ],
      pile: [],
      table: [coppe(3)],
      lastCaptured: [],
    }

    const next = getGameState(play({ card: denari(1), capture: [] }, game))

    expect(next.state).toBe('stop')
    expect(next.wins).toEqual([1, 2])
  })
})
