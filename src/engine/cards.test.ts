import { assert, constantFrom, property, tuple } from 'fast-check'
import { expect, test } from 'vitest'
import { bastoni, deck, denari, hasCard, isSame, isSettebello, Suit, type Value } from './cards'

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
  expect(new Set(cards.map((card) => card.join('-')))).toHaveLength(cards.length)
})

test('a deck contains Neapolitan cards', () => {
  assert(property(arbitraryCard, (card) => hasCard(deck(), card)))
})

test('cards with the same value and suit are the same', () => {
  expect(isSame(denari(7), denari(7))).toBe(true)
})

test('cards with different values are not the same', () => {
  expect(isSame(denari(7), denari(5))).toBe(false)
})

test('cards with different suits are not the same', () => {
  expect(isSame(denari(5), bastoni(5))).toBe(false)
})

test('isSameCard handles null and undefined', () => {
  expect(isSame(null, null)).toBe(true)
  expect(isSame(denari(7), null)).toBe(false)
  expect(isSame(null, denari(7))).toBe(false)
})
