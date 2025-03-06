import { cleanup, render, screen } from '@testing-library/react'
import { assert, integer, property, string } from 'fast-check'
import { range } from 'ramda'
import { afterEach, expect, test } from 'vitest'
import { type Card, Suit } from '../engine/cards'
import { Stack } from './Stack'

afterEach(() => {
  cleanup()
})

test('renders stack of cards', () => {
  assert(
    property(
      string().map((s) => s.trim()),
      integer({ min: 1, max: 10 }),
      (title, size) => {
        cleanup()
        const pile: Card[] = range(0, size).map((value) => [
          value + 1,
          Suit.DENARI,
        ])
        render(<Stack title={title} pile={pile} />)
        const container = screen.getByTitle(title)
        expect(container.children).toHaveLength(size)
      },
    ),
  )
})
