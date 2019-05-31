import React from 'react'
import { assert, property, integer } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Opponent } from './Opponent'

beforeEach(cleanup)

test('renders hand', () => {
  assert(
    property(integer(0, 3), size => {
      cleanup()
      const { container } = render(<Opponent hand={size} index={1} pile={0} />)
      const cards = container.querySelectorAll('div')
      expect(cards).toHaveLength(size)
    })
  )
})

test('renders pile', () => {
  assert(
    property(integer(1, 40), size => {
      cleanup()
      const { getByTitle } = render(<Opponent hand={0} index={1} pile={size} />)
      const pile = getByTitle(`Player 2 pile: ${size} cards`)
      expect(pile.children).toHaveLength(size)
    })
  )
})
