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
import { coppe, deck, denari, isCard, Suit, type Value } from './cards'

test('two cards are the same if they have the same value and suit', () => {
  expect(isCard(denari(7), denari(7))).toBe(true)
})

test('two cards are different if they have different values', () => {
  expect(isCard(denari(7), denari(1))).toBe(false)
})

test('two cards are different if they have different suits', () => {
  expect(isCard(denari(7), coppe(7))).toBe(false)
})

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
