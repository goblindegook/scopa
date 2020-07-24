import React from 'react'
import { assert, property, integer } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Opponent } from './Opponent'
import { range } from 'ramda'
import { Card, Suit } from '../engine/cards'

test('renders opponent pile', () => {
  assert(
    property(integer(1, 10), (size) => {
      cleanup()
      const pile: Card[] = range(0, size).map((value) => [value, Suit.DENARI])
      const { getByTitle } = render(<Opponent index={1} pile={pile} />)
      const pileElement = getByTitle(`Player 2 pile: ${size} cards`)
      expect(pileElement.children).toHaveLength(size)
    })
  )
})
