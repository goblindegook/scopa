import { expect, test } from 'vitest'
import { findCaptures } from './capture.ts'
import { bastoni, coppe, deck, denari, spade } from './cards'

test('match one set of one card', () => {
  const table = [bastoni(1), bastoni(2)]
  expect(findCaptures(1, table)).toEqual([[bastoni(1)]])
})

test('match two sets of one card', () => {
  const table = [bastoni(1), spade(1)]
  expect(findCaptures(1, table)).toEqual([[bastoni(1)], [spade(1)]])
})

test('match one set of two cards', () => {
  const table = [bastoni(1), spade(1)]
  expect(findCaptures(2, table)).toEqual([[bastoni(1), spade(1)]])
})

test('match two sets of two and one cards', () => {
  const table = [bastoni(1), spade(1), bastoni(2)]
  expect(findCaptures(2, table)).toEqual([[bastoni(1), spade(1)], [bastoni(2)]])
})

test('match a big table', () => {
  // Searches a binary tree up to 40 levels deep:
  const table = deck()
  expect(findCaptures(1, table)).toEqual([
    [denari(1)],
    [coppe(1)],
    [bastoni(1)],
    [spade(1)],
  ])
})
