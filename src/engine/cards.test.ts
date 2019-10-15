import { assert, property, constantFrom, integer } from 'fast-check'
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
  const cards = deck()
  assert(
    property(
      integer(1, 10),
      constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE),
      (value, suit) => includes([value, suit], cards)
    )
  )
})
