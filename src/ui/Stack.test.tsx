import React from 'react'
import { assert, property, integer, string } from 'fast-check'
import { cleanup, render, screen } from '@testing-library/react'
import { Stack } from './Stack'
import { Suit, Card } from '../engine/cards'
import { range } from 'ramda'

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
      }
    )
  )
})
