import React from 'react'
import { assert, property, integer, string } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Stack } from './Stack'
import { Suit, Card } from '../engine/cards'
import { range } from 'ramda'

test('renders stack of cards', () => {
  assert(
    property(
      string().map((s) => s.trim()),
      integer(1, 10),
      (title, size) => {
        cleanup()
        const pile: Card[] = range(0, size).map((value) => [value, Suit.DENARI])
        const { getByTitle } = render(<Stack title={title} pile={pile} />)
        const container = getByTitle(title)
        expect(container.children).toHaveLength(size)
      }
    )
  )
})
