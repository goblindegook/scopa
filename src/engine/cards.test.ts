import { assert, constantFrom, property, tuple } from 'fast-check'
import { includes, uniq } from 'ramda'
import { expect, test } from 'vitest'
import { deck, denari, isSettebello, Suit, type Value } from './cards'

const arbitraryCard = tuple(
  constantFrom<Value>(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
  constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE),
)

test('a card is the settebello if it is the 7 of coins', () => {
  expect(isSettebello(denari(7))).toBe(true)
})

test('a card is not the settebello if it has a different value than 7', () => {
  assert(
    property(
      arbitraryCard.filter(([value]) => value !== 7),
      (card) => !isSettebello(card),
    ),
  )
})

test('a card is not the settebello is it has a different suit than coins', () => {
  assert(
    property(
      arbitraryCard.filter(([, suit]) => suit !== Suit.DENARI),
      (card) => !isSettebello(card),
    ),
  )
})

test('a deck contains 40 cards', () => {
  expect(deck()).toHaveLength(40)
})

test('a deck contains unique cards', () => {
  const cards = deck()
  expect(uniq(cards)).toHaveLength(cards.length)
})

test('a deck contains Neapolitan cards', () => {
  assert(property(arbitraryCard, (card) => includes(card, deck())))
})
