import React from 'react'
import { assert, property, integer, constantFrom, tuple, set } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Opponent } from './Opponent'
import { Suit } from '../engine/cards'

const card = tuple(
  integer(1, 10),
  constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE)
)

const cardSet = (maxLength: number) =>
  set(card, maxLength, (a, b) => a[0] === b[0] && a[1] === b[1])

test('renders opponent pile', () => {
  assert(
    property(cardSet(10), (pile) => {
      cleanup()
      const { getByTitle } = render(<Opponent index={1} pile={pile} />)
      const pileElement = getByTitle(`Player 2 pile: ${pile.length} cards`)
      expect(pileElement.children).toHaveLength(pile.length)
    })
  )
})
