import { deck, Suit, Deck, Card } from './cards'
import { deal, Game, play } from './scopa'
import { assert, property, constantFrom, Arbitrary } from 'fast-check'
import any from 'ramda/es/any'
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
    property(constantFrom(2, 3, 4, 6) as Arbitrary<2 | 3 | 4 | 6>, players => {
      const game = rightOf(deal(deck(), { players }))
      return game.players.length === players
    })
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

test(`player one plays a card from their hand on the table`, () => {
  const card: Card = [1, Suit.DENARI]
  const game: Game = {
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
})

test(`player two plays a card from their hand on the table`, () => {
  const card: Card = [2, Suit.DENARI]
  const game: Game = {
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
})

test(`a player cannot play a card they don't have`, () => {
  const card: Card = [1, Suit.DENARI]
  const game: Game = {
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
})

test(`a player must choose a card from the table if more than one possible capture exists`, () => {
  const card: Card = [1, Suit.DENARI]
  const game: Game = {
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
})

test(`a player captures multiple cards from the table if their cumulative value is the same as the card played`, () => {
  const card: Card = [3, Suit.DENARI]
  const targets: Deck = [[1, Suit.COPPE], [1, Suit.BASTONI], [1, Suit.SPADE]]
  const game: Game = {
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
})

test(`a player scores a scopa when they capture all the cards on the table`, () => {
  const card: Card = [3, Suit.DENARI]
  const table: Deck = [[1, Suit.COPPE], [1, Suit.BASTONI], [1, Suit.SPADE]]
  const game: Game = {
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
})

test(`three cards are drawn from the pile when the player's hand is empty`, () => {
  const card: Card = [3, Suit.DENARI]

  const topOfPile: Deck = [[4, Suit.COPPE], [4, Suit.BASTONI], [4, Suit.SPADE]]

  const restOfPile: Deck = [[8, Suit.COPPE]]

  const game: Game = {
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
})
