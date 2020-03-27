import React from 'react'
import { assert, property, integer } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Opponent } from './Opponent'

test('renders opponent pile', () => {
  assert(
    property(integer(1, 40), (size) => {
      cleanup()
      const { getByTitle } = render(<Opponent index={1} pile={size} />)
      const pile = getByTitle(`Player 2 pile: ${size} cards`)
      expect(pile.children).toHaveLength(size)
    })
  )
})
