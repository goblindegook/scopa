import { deck, Suit, Deck, Card } from './cards'
import { deal, Game, play, score, prime } from './scopa'
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
  expect(actual.isRight()).toBe(true)

  if (actual.isRight()) {
    return actual.value
  } else {
    throw Error()
  }
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

    expect(game.isLeft()).toBe(true)
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
    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI]]
    }

    const next = rightOf(play({ card }, game))

    expect(next.table).toContain(card)
    expect(next.players[0].hand).not.toContain(card)
    expect(next.turn).toBe(1)
    expect(next.state).toBe('play')
  })

  test(`player two plays a card from their hand on the table`, () => {
    const card: Card = [2, Suit.DENARI]
    const game: Game = {
      state: 'play',
      turn: 1,
      players: [
        { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [card, [3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI]]
    }

    const next = rightOf(play({ card }, game))

    expect(next.turn).toBe(0)
    expect(next.state).toBe('play')
  })

  test(`a player cannot play a card they don't have`, () => {
    const card: Card = [1, Suit.DENARI]
    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [[2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI]]
    }

    const next = play({ card }, game)

    expect(next.isLeft()).toBe(true)
  })

  test(`a player captures a card from the table if it's the same value as the card played`, () => {
    const card: Card = [1, Suit.DENARI]
    const target: Card = [1, Suit.COPPE]
    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI], target]
    }

    const next = rightOf(play({ card }, game))

    expect(next.table).not.toContain(card)
    expect(next.table).not.toContain(target)
    expect(next.players[0].pile).toContain(card)
    expect(next.players[0].pile).toContain(target)
    expect(next.state).toBe('play')
  })

  test(`a player must choose a card from the table if more than one possible capture exists`, () => {
    const card: Card = [1, Suit.DENARI]
    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[1, Suit.BASTONI], [1, Suit.COPPE]]
    }

    const next = play({ card }, game)

    expect(next.isLeft()).toBe(true)
  })

  test(`a player chooses a card from the table that is the same value as the card played`, () => {
    const card: Card = [1, Suit.DENARI]
    const target: Card = [1, Suit.COPPE]
    const game: Game = {
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
    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[5, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table: [[4, Suit.DENARI], ...targets]
    }

    const next = rightOf(play({ card }, game))

    expect(next.table).not.toContain(card)
    targets.forEach(expect(next.table).not.toContain)
    expect(next.players[0].pile).toContain(card)
    targets.forEach(expect(next.players[0].pile).toContain)
    expect(next.state).toBe('play')
  })

  test.skip(`a player may only capture the least number of cards when multiple combinations exist`, () => {
    // TODO
  })

  test(`a player scores a scopa when they capture all the cards on the table`, () => {
    const card: Card = [3, Suit.DENARI]
    const table: Deck = [[1, Suit.COPPE], [1, Suit.BASTONI], [1, Suit.SPADE]]
    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[5, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [],
      table
    }

    const next = rightOf(play({ card }, game))
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

    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card, [2, Suit.DENARI]], pile: [], scope: 0 },
        { hand: [[5, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [...topOfPile, ...restOfPile],
      table: [[1, Suit.COPPE], [1, Suit.BASTONI], [1, Suit.SPADE]]
    }

    const next = rightOf(play({ card }, game))
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

    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card], pile: [], scope: 0 },
        { hand: [[5, Suit.DENARI]], pile: [], scope: 0 }
      ],
      pile: [...topOfPile, ...restOfPile],
      table: [[1, Suit.COPPE]]
    }

    const next = rightOf(play({ card }, game))
    expect(next.players[0].hand).toEqual(topOfPile)
    expect(next.pile).toEqual(restOfPile)
    expect(next.state).toBe('play')
  })

  test(`the game ends when the next player's hand is empty and they can't draw any more cards`, () => {
    const card: Card = [3, Suit.DENARI]
    const game: Game = {
      state: 'play',
      turn: 0,
      players: [
        { hand: [card], pile: [], scope: 0 },
        { hand: [], pile: [], scope: 0 }
      ],
      pile: [],
      table: []
    }

    const next = rightOf(play({ card }, game))
    expect(next.state).toBe('stop')
  })
})

describe('prime', () => {
  test(`sevens are worth 21 points`, () => {
    expect(prime([[7, Suit.DENARI]])).toBe(21)
  })

  test(`sixes are worth 18 points`, () => {
    expect(prime([[6, Suit.DENARI]])).toBe(18)
  })

  test(`aces are worth 16 points`, () => {
    expect(prime([[1, Suit.DENARI]])).toBe(16)
  })

  test(`fives are worth 15 points`, () => {
    expect(prime([[5, Suit.DENARI]])).toBe(15)
  })

  test(`fours are worth 14 points`, () => {
    expect(prime([[4, Suit.DENARI]])).toBe(14)
  })

  test(`threes are worth 13 points`, () => {
    expect(prime([[3, Suit.DENARI]])).toBe(13)
  })

  test(`two are worth 13 points`, () => {
    expect(prime([[2, Suit.DENARI]])).toBe(12)
  })

  test(`face cards are worth 10 points`, () => {
    expect(prime([[8, Suit.DENARI]])).toBe(10)
    expect(prime([[9, Suit.DENARI]])).toBe(10)
    expect(prime([[10, Suit.DENARI]])).toBe(10)
  })

  test(`only the highest card in the suit is scored`, () => {
    expect(prime([[7, Suit.DENARI], [6, Suit.DENARI]])).toBe(21)
  })

  test(`the highest card in each suit is scored`, () => {
    expect(
      prime([
        [7, Suit.DENARI],
        [7, Suit.COPPE],
        [7, Suit.BASTONI],
        [7, Suit.SPADE]
      ])
    ).toBe(84)
  })
})

describe('score', () => {
  test(`a player's base score is the number of scope they achieved'`, () => {
    const game: Game = {
      state: 'stop',
      turn: 0,
      players: [
        { hand: [], pile: [], scope: 1 },
        { hand: [], pile: [], scope: 2 }
      ],
      pile: [],
      table: []
    }

    expect(score(game)).toEqual([1, 2])
  })

  test(`the player who captured the sette bello gets +1 point`, () => {
    assert(
      property(integer(0, 20), integer(0, 20), (s1, s2) => {
        const game: Game = {
          state: 'stop',
          turn: 0,
          players: [
            { hand: [], pile: [[7, Suit.DENARI], [1, Suit.COPPE]], scope: s1 },
            { hand: [], pile: [[1, Suit.DENARI], [1, Suit.SPADE]], scope: s2 }
          ],
          pile: [],
          table: []
        }

        expect(score(game)).toEqual([s1 + 1, s2])
      })
    )
  })

  test(`the player who captured the most cards gets +1 point`, () => {
    assert(
      property(integer(0, 20), integer(0, 20), (s1, s2) => {
        const game: Game = {
          state: 'stop',
          turn: 0,
          players: [
            { hand: [], pile: [[1, Suit.COPPE]], scope: s1 },
            { hand: [], pile: [[2, Suit.COPPE], [3, Suit.COPPE]], scope: s2 }
          ],
          pile: [],
          table: []
        }

        expect(score(game)).toEqual([s1, s2 + 1])
      })
    )
  })

  test(`the player who captured the most cards in the suit of coins gets +1 point`, () => {
    assert(
      property(integer(0, 20), integer(0, 20), (s1, s2) => {
        const game: Game = {
          state: 'stop',
          turn: 0,
          players: [
            { hand: [], pile: [[1, Suit.DENARI], [2, Suit.DENARI]], scope: s1 },
            { hand: [], pile: [[1, Suit.COPPE], [3, Suit.DENARI]], scope: s2 }
          ],
          pile: [],
          table: []
        }

        expect(score(game)).toEqual([s1 + 1, s2])
      })
    )
  })

  test.skip(`the player who captured the primiera gets +1 point`, () => {
    // TODO
  })

  test.skip(`a team's base score is the number of scope each of its players achieved'`, () => {
    // TODO
  })

  test.skip(`the team that captured the sette bello gets +1 point`, () => {
    // TODO
  })

  test.skip(`the team that captured most cards gets +1 point`, () => {
    // TODO
  })

  test.skip(`the team that captured most cards in the suit of coins gets +1 point`, () => {
    // TODO
  })

  test.skip(`the team that captured the primiera gets +1 point`, () => {
    // TODO
  })
})
