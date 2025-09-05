import { expect, test } from 'vitest'
import { findCaptures } from './capture.ts'
import { type Pile, deck, Suit } from './cards'

test('match one set of one card', () => {
  const table: Pile = [
    [1, Suit.BASTONI],
    [2, Suit.BASTONI],
  ]
  expect(findCaptures(1, table)).toEqual([[[1, Suit.BASTONI]]])
})

test('match two sets of one card', () => {
  const table: Pile = [
    [1, Suit.BASTONI],
    [1, Suit.SPADE],
  ]
  expect(findCaptures(1, table)).toEqual([
    [[1, Suit.BASTONI]],
    [[1, Suit.SPADE]],
  ])
})

test('match one set of two cards', () => {
  const table: Pile = [
    [1, Suit.BASTONI],
    [1, Suit.SPADE],
  ]
  expect(findCaptures(2, table)).toEqual([
    [
      [1, Suit.BASTONI],
      [1, Suit.SPADE],
    ],
  ])
})

test('match two sets of two and one cards', () => {
  const table: Pile = [
    [1, Suit.BASTONI],
    [1, Suit.SPADE],
    [2, Suit.BASTONI],
  ]
  expect(findCaptures(2, table)).toEqual([
    [
      [1, Suit.BASTONI],
      [1, Suit.SPADE],
    ],
    [[2, Suit.BASTONI]],
  ])
})

test('match a big table', () => {
  // Searches a binary tree up to 40 levels deep:
  const table: Pile = deck()
  expect(findCaptures(1, table)).toEqual([
    [[1, Suit.DENARI]],
    [[1, Suit.COPPE]],
    [[1, Suit.BASTONI]],
    [[1, Suit.SPADE]],
  ])
})
