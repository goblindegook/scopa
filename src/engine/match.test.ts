import { type Deck, Suit, deck } from './cards'
import { findMatches } from './match'

test('match one set of one card', () => {
  const table: Deck = [
    [1, Suit.BASTONI],
    [2, Suit.BASTONI],
  ]
  expect(findMatches(1, table)).toEqual([[[1, Suit.BASTONI]]])
})

test('match two sets of one card', () => {
  const table: Deck = [
    [1, Suit.BASTONI],
    [1, Suit.SPADE],
  ]
  expect(findMatches(1, table)).toEqual([
    [[1, Suit.BASTONI]],
    [[1, Suit.SPADE]],
  ])
})

test('match one set of two cards', () => {
  const table: Deck = [
    [1, Suit.BASTONI],
    [1, Suit.SPADE],
  ]
  expect(findMatches(2, table)).toEqual([
    [
      [1, Suit.BASTONI],
      [1, Suit.SPADE],
    ],
  ])
})

test('match two sets of two and one cards', () => {
  const table: Deck = [
    [1, Suit.BASTONI],
    [1, Suit.SPADE],
    [2, Suit.BASTONI],
  ]
  expect(findMatches(2, table)).toEqual([
    [
      [1, Suit.BASTONI],
      [1, Suit.SPADE],
    ],
    [[2, Suit.BASTONI]],
  ])
})

test('match a big table', () => {
  // Searches a binary tree up to 40 levels deep:
  const table: Deck = deck()
  expect(findMatches(1, table)).toEqual([
    [[1, Suit.DENARI]],
    [[1, Suit.COPPE]],
    [[1, Suit.BASTONI]],
    [[1, Suit.SPADE]],
  ])
})
