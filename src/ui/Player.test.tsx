import React from 'react'
import { assert, property, integer } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Player } from './Player'
import { range } from 'ramda'
import { Suit, Card } from '../engine/cards'

test('renders pile', () => {
  assert(
    property(integer(1, 10), integer(1, 6), (size, index) => {
      cleanup()
      const pile: Card[] = range(0, size).map((value) => [value, Suit.DENARI])
      const { getByTitle } = render(<Player index={index} pile={pile} />)
      const pileElement = getByTitle(`Player ${index + 1} pile: ${size} cards`)
      expect(pileElement.children).toHaveLength(size)
    })
  )
})
