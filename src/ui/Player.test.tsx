import React from 'react'
import {
  assert,
  property,
  integer,
  tuple,
  constantFrom,
  uniqueArray,
} from 'fast-check'
import { cleanup, render, screen } from '@testing-library/react'
import { Player } from './Player'
import { Suit } from '../engine/cards'

const card = tuple(
  integer({ min: 1, max: 10 }),
  constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE)
)

const cardSet = (maxLength: number) =>
  uniqueArray(card, { maxLength, selector: (v) => v.join(':') })

test('renders pile', () => {
  assert(
    property(cardSet(10), integer({ min: 1, max: 6 }), (pile, index) => {
      cleanup()
      render(<Player index={index} pile={pile} />)
      const pileElement = screen.getByTitle(
        `Player ${index + 1} pile: ${pile.length} cards`
      )
      expect(pileElement.children).toHaveLength(pile.length)
    })
  )
})
