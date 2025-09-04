import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { type Card, Suit, type Value } from '../engine/cards'
import { Stack } from './Stack'

afterEach(() => {
  cleanup()
})

test('renders stack of cards', () => {
  const values: Value[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const pile: Card[] = values.map((value) => [value, Suit.DENARI])

  render(<Stack title="Test" pile={pile} />)

  expect(screen.getByTitle('Test').children).toHaveLength(10)
})
