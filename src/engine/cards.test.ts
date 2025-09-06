import {
  type Arbitrary,
  assert,
  constantFrom,
  integer,
  property,
  tuple,
} from 'fast-check'
import { includes, uniq } from 'ramda'
import { expect, test } from 'vitest'
import { deck, Suit, type Value } from './cards'

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
    constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE),
  ) as Arbitrary<[Value, Suit]>

  assert(property(arbitraryCard, (card) => includes(card, deck())))
})
