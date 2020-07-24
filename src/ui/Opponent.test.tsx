import React from 'react'
import { assert, property, integer, constantFrom, tuple, set } from 'fast-check'
import { cleanup, render } from '@testing-library/react'
import { Opponent } from './Opponent'
import { Card, Suit } from '../engine/cards'

const suits = [Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE]
const card = tuple(integer(1, 10), constantFrom(...suits))
const compareCards = (a: Card, b: Card) => a[0] === b[0] && a[1] === b[1]

test('renders opponent pile', () => {
  assert(
    property(set(card, 10, compareCards), (pile) => {
      cleanup()
      const { getByTitle } = render(<Opponent index={1} pile={pile} />)
      const pileElement = getByTitle(`Player 2 pile: ${pile.length} cards`)
      expect(pileElement.children).toHaveLength(pile.length)
    })
  )
})
