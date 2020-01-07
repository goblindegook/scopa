import React from 'react'
import { assert, property, integer } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Player } from './Player'

test('renders pile', () => {
  assert(
    property(integer(0, 40), integer(1, 6), (cards, index) => {
      cleanup()
      const { getByTitle } = render(<Player index={index} pile={cards} />)
      const pile = getByTitle(`Player ${index + 1} pile: ${cards} cards`)
      expect(pile.children).toHaveLength(cards)
    })
  )
})
