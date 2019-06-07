import { deck, Suit, Deck, Card } from './cards'
import { deal, play } from './scopa'
import { State } from './state'
import { assert, property, constantFrom, integer, Arbitrary } from 'fast-check'
import { Either } from 'fp-ts/lib/Either'
import matchers from '@pacote/jest-either'

expect.extend(matchers)

const expectMatchAll = <T extends any>(
  superset: ReadonlyArray<T>,
  actual: ReadonlyArray<T>
) => expect(superset).toMatchObject(expect.arrayContaining(actual as T[]))

const expectMatchNone = <T extends any>(
  superset: ReadonlyArray<T>,
  actual: ReadonlyArray<T>
) => expect(superset).not.toMatchObject(expect.arrayContaining(actual as T[]))

describe('deal', () => {
  test(`deal sets state`, () => {
    expect(deal(deck())).toMatchRight({ state: 'play' })
  })

  test(`deal four cards on the table`, () => {
    const game = deal(deck()).value as State
    expect(game.table).toHaveLength(4)
  })

  test(`reshuffle cards and deal again if three or more kings are on the table`, () => {
    const game = deal([
      [10, Suit.BASTONI],
      [10, Suit.COPPE],
      [10, Suit.SPADE],
      [7, Suit.DENARI]
    ])

    expect(game).toMatchLeft({
      message: 'More than two kings on the table. Deal again.'
    })
  })

  test(`Scopa is a game for 2, 3, 4 or 6 players`, () => {
    assert(
      property(
        constantFrom<2 | 3 | 4 | 6>(2, 3, 4, 6),
        players => {
          const game = deal(deck(), { players }).value as State
          return game.players.length === players
        }
      )
    )
  })

  test(`deal three cards to each player`, () => {
    const game = deal(deck()).value as State
    game.players.forEach(p => expect(p.hand).toHaveLength(3))
  })

  test(`each player begins with an empty pile`, () => {
    const game = deal(deck()).value as State
    game.players.forEach(p => expect(p.pile).toHaveLength(0))
  })

  test(`each player begins with no score`, () => {
    const game = deal(deck()).value as State
    game.players.forEach(p => expect(p.scope).toBe(0))
  })

  test(`table pile contains remaining cards`, () => {
    const cards = deck()
    const game = deal(cards).value as State
    const hands = game.players.reduce<Deck>((all, p) => all.concat(p.hand), [])
    expect(game.pile).toHaveLength(30)
    expect([...game.table, ...hands, ...game.pile]).toEqual(cards)
  })

  test(`random player begins`, () => {
    const game = deal(deck()).value as State
    expect(game.players[game.turn]).toBeDefined()
  })
})

describe('play', () => {
  test(`player one plays a card from their hand on the table`, () => {
    const card: Card = [1, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI]]
    }

    const next = play({ card, targets: [] }, game).value as State

    expect(next.table).toContain(card)
    expect(next.players[0].hand).not.toContain(card)
    expect(next.turn).toBe(1)
    expect(next.state).toBe('play')
  })

  test(`player two plays a card from their hand on the table`, () => {
    const card: Card = [2, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 1,
      players: [
        { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [card, [3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI]]
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchRight({ state: 'play', turn: 0 })
  })

  test(`a player cannot play a card they don't have`, () => {
    const card: Card = [1, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [[2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI]]
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchLeft({ message: 'Not your turn.' })
  })

  test(`a player captures a card from the table if it's the same value as the card played`, () => {
    const card: Card = [1, Suit.DENARI]
    const target: Card = [1, Suit.COPPE]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI], target]
    }

    const next = play({ card, targets: [] }, game).value as State

    expect(next.table).not.toContain(card)
    expect(next.table).not.toContain(target)
    expect(next.players[0].pile).toContain(card)
    expect(next.players[0].pile).toContain(target)
    expect(next.state).toBe('play')
  })

  test(`a player must choose a card from the table if more than one possible capture exists`, () => {
    const card: Card = [1, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[1, Suit.BASTONI], [1, Suit.COPPE]]
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchLeft({ message: 'Choose the cards to capture.' })
  })

  test(`a player must choose a valid capture`, () => {
    const card: Card = [4, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[1, Suit.BASTONI], [1, Suit.COPPE]]
    }

    const next = play({ card, targets: [[1, Suit.BASTONI]] }, game)

    expect(next).toMatchLeft({
      message: 'The targetted cards may not be captured.'
    })
  })

  test(`a player chooses a card from the table that is the same value as the card played`, () => {
    const card: Card = [1, Suit.DENARI]
    const target: Card = [1, Suit.COPPE]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[1, Suit.BASTONI], target]
    }

    const next = play({ card, targets: [target] }, game).value as State

    expect(next.table).not.toContain(card)
    expect(next.table).not.toContain(target)
    expect(next.players[0].pile).toContain(card)
    expect(next.players[0].pile).toContain(target)
    expect(next.state).toBe('play')
  })

  test(`a player captures multiple cards from the table if their cumulative value is the same as the card played`, () => {
    const card: Card = [3, Suit.DENARI]
    const targets: Deck = [[1, Suit.COPPE], [1, Suit.BASTONI], [1, Suit.SPADE]]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[5, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI], ...targets]
    }

    const next = play({ card, targets: [] }, game).value as State

    expect(next.table).not.toContain(card)
    targets.forEach(expect(next.table).not.toContain)
    expect(next.players[0].pile).toContain(card)
    targets.forEach(expect(next.players[0].pile).toContain)
    expect(next.state).toBe('play')
  })

  test(`a player may only capture the least number of cards when multiple combinations exist`, () => {
    const card: Card = [2, Suit.DENARI]
    const targets: Deck = [[1, Suit.COPPE], [1, Suit.BASTONI]]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card], pile: [], scope: 0 },
        { hand: [[10, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[2, Suit.COPPE], ...targets]
    }

    expect(play({ card, targets }, game)).toBeLeft()
  })

  test(`target order should not be considered when playing`, () => {
    const card: Card = [2, Suit.DENARI]
    const targets: Deck = [[1, Suit.COPPE], [1, Suit.BASTONI]]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card], pile: [], scope: 0 },
        { hand: [], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[1, Suit.BASTONI], [1, Suit.SPADE], [1, Suit.COPPE]]
    }

    expect(play({ card, targets }, game)).toBeRight()
  })

  test(`a player scores a scopa when they capture all the cards on the table`, () => {
    const card: Card = [3, Suit.DENARI]
    const table: Deck = [[1, Suit.COPPE], [1, Suit.BASTONI], [1, Suit.SPADE]]
    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[5, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table
    }

    const next = play({ card, targets: [] }, game).value as State
    expect(next.players[0].scope).toBe(1)
    expect(next.state).toBe('play')
  })

  test(`four cards are drawn from the pile when the table is empty`, () => {
    const card: Card = [3, Suit.DENARI]

    const topOfPile: Deck = [
      [4, Suit.COPPE],
      [4, Suit.BASTONI],
      [4, Suit.SPADE],
      [4, Suit.DENARI]
    ]

    const restOfPile: Deck = [[8, Suit.COPPE]]

    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[5, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [...topOfPile, ...restOfPile],
      table: [[1, Suit.COPPE], [1, Suit.BASTONI], [1, Suit.SPADE]]
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchRight({
      table: topOfPile,
      pile: restOfPile,
      state: 'play'
    })
  })

  test(`three cards are drawn from the pile when a player's hand is empty`, () => {
    const card: Card = [3, Suit.DENARI]

    const topOfPile: Deck = [
      [4, Suit.COPPE],
      [4, Suit.BASTONI],
      [4, Suit.SPADE]
    ]

    const restOfPile: Deck = [[8, Suit.COPPE]]

    const game: State = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card], pile: [], scope: 0 },
        { hand: [[5, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [...topOfPile, ...restOfPile],
      table: [[1, Suit.COPPE]]
    }

    const next = play({ card, targets: [] }, game)

    expect((next.value as State).players[0].hand).toEqual(topOfPile)
    expect(next).toMatchRight({
      pile: restOfPile,
      state: 'play'
    })
  })

  test(`the game ends when the next player's hand is empty and they can't draw any more cards`, () => {
    const card: Card = [3, Suit.DENARI]
    const game: State = {
      state: 'play',
      turn: 1,
      players: [
        { hand: [], pile: [], scope: 0 },
        { hand: [card], pile: [], scope: 0 }
      ],
      pile: [],
      table: []
    }

    const next = play({ card, targets: [] }, game)

    expect(next).toMatchRight({ state: 'stop' })
  })
})
