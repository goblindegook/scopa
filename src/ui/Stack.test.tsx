import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { denari, type Value } from '../engine/cards'
import { Stack } from './Stack'

afterEach(() => {
  cleanup()
})

test('renders stack of cards', () => {
  const values: Value[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const pile = values.map((value) => denari(value))

  render(<Stack title="Test" pile={pile} />)

  expect(screen.getByTitle('Test').children).toHaveLength(10)
})
