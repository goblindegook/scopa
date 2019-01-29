import { deck, Suit, Deck, Card } from './cards'
import { deal, play } from './scopa'
import { State } from './state'
import { assert, property, constantFrom, integer, Arbitrary } from 'fast-check'
import { Either } from 'fp-ts/lib/Either'

const expectMatchAll = <T extends any>(
  superset: ReadonlyArray<T>,
  actual: ReadonlyArray<T>
) => expect(superset).toMatchObject(expect.arrayContaining(actual as T[]))

const expectMatchNone = <T extends any>(
  superset: ReadonlyArray<T>,
  actual: ReadonlyArray<T>
) => expect(superset).not.toMatchObject(expect.arrayContaining(actual as T[]))

const rightOf = <L, R>(actual: Either<L, R>): R => {
  return actual.getOrElseL(() => {
    throw Error()
  })
}

const leftOf = <L, R>(actual: Either<L, R>): L => {
  return actual.swap().getOrElseL(() => {
    throw Error()
  })
}

describe('deal', () => {
  test(`deal sets state`, () => {
    const game = rightOf(deal(deck()))
    expect(game.state).toBe('play')
  })

  test(`deal four cards on the table`, () => {
    const game = rightOf(deal(deck()))
    expect(game.table).toHaveLength(4)
  })

  test(`reshuffle cards and deal again if three or more kings are on the table`, () => {
    const game = deal([
      [10, Suit.BASTONI],
      [10, Suit.COPPE],
      [10, Suit.SPADE],
      [7, Suit.DENARI]
    ])

    expect(leftOf(game).message).toBe(
      'More than two kings on the table. Deal again.'
    )
  })

  test(`Scopa is a game for 2, 3, 4 or 6 players`, () => {
    assert(
      property(
        constantFrom(2, 3, 4, 6) as Arbitrary<2 | 3 | 4 | 6>,
        players => {
          const game = rightOf(deal(deck(), { players }))
          return game.players.length === players
        }
      )
    )
  })

  test(`deal three cards to each player`, () => {
    const game = rightOf(deal(deck()))
    game.players.forEach(p => expect(p.hand).toHaveLength(3))
  })

  test(`each player begins with an empty pile`, () => {
    const game = rightOf(deal(deck()))
    game.players.forEach(p => expect(p.pile).toHaveLength(0))
  })

  test(`each player begins with no score`, () => {
    const game = rightOf(deal(deck()))
    game.players.forEach(p => expect(p.scope).toBe(0))
  })

  test(`table pile contains remaining cards`, () => {
    const cards = deck()
    const game = rightOf(deal(cards))
    const hands = game.players.reduce<Deck>((all, p) => all.concat(p.hand), [])
    expect(game.pile).toHaveLength(30)
    expect([...game.table, ...hands, ...game.pile]).toEqual(cards)
  })

  test(`random player begins`, () => {
    const game = rightOf(deal(deck()))
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

    const next = rightOf(play({ card, targets: [] }, game))

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

    const next = rightOf(play({ card, targets: [] }, game))

    expect(next.turn).toBe(0)
    expect(next.state).toBe('play')
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

    expect(leftOf(next).message).toBe('Not your turn.')
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

    const next = rightOf(play({ card, targets: [] }, game))

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

    expect(leftOf(next).message).toBe('Choose the cards to capture.')
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

    expect(leftOf(next).message).toBe(
      'The targetted cards may not be captured.'
    )
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

    const next = rightOf(play({ card, targets: [target] }, game))

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

    const next = rightOf(play({ card, targets: [] }, game))

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

    const next = play({ card, targets }, game)

    expect(next.isLeft()).toBe(true)
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

    rightOf(play({ card, targets }, game))
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

    const next = rightOf(play({ card, targets: [] }, game))
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

    const next = rightOf(play({ card, targets: [] }, game))
    expect(next.table).toEqual(topOfPile)
    expect(next.pile).toEqual(restOfPile)
    expect(next.state).toBe('play')
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

    const next = rightOf(play({ card, targets: [] }, game))
    expect(next.players[0].hand).toEqual(topOfPile)
    expect(next.pile).toEqual(restOfPile)
    expect(next.state).toBe('play')
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

    const next = rightOf(play({ card, targets: [] }, game))
    expect(next.state).toBe('stop')
  })
})
