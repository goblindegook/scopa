import { assert, property, constantFrom, integer, tuple } from 'fast-check'
import { includes, uniq } from 'ramda'
import { deck, Suit } from './cards'

test('a deck contains 40 cards', () => {
  expect(deck()).toHaveLength(40)
})

test('a deck contains unique cards', () => {
  const cards = deck()
  expect(uniq(cards)).toHaveLength(cards.length)
})

test('a deck contains Neapolitan cards', () => {
  const arbitraryCard = tuple(
    integer({ min: 1, max: 10 }),
    constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE)
  )

  assert(property(arbitraryCard, (card) => includes(card, deck())))
})
