import React from 'react'
import { assert, property, integer, tuple, set, constantFrom } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Player } from './Player'
import { Suit } from '../engine/cards'

const card = tuple(
  integer(1, 10),
  constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE)
)

const cardSet = (maxLength: number) =>
  set(card, maxLength, (a, b) => a[0] === b[0] && a[1] === b[1])

test('renders pile', () => {
  assert(
    property(cardSet(10), integer(1, 6), (pile, index) => {
      cleanup()
      const { getByTitle } = render(<Player index={index} pile={pile} />)
      const pileElement = getByTitle(
        `Player ${index + 1} pile: ${pile.length} cards`
      )
      expect(pileElement.children).toHaveLength(pile.length)
    })
  )
})
