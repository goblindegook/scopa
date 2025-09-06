import { cleanup, render, screen } from '@testing-library/react'
import {
  assert,
  constantFrom,
  integer,
  property,
  tuple,
  uniqueArray,
} from 'fast-check'
import { afterEach, expect, test } from 'vitest'
import { Suit, type Value } from '../engine/cards'
import { Player } from './Player'

afterEach(() => {
  cleanup()
})

const arbitraryCard = tuple(
  constantFrom<Value>(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
  constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE),
)

const cardSet = (maxLength: number) =>
  uniqueArray(arbitraryCard, { maxLength, selector: (v) => v.join(':') })

test('renders pile', () => {
  assert(
    property(cardSet(10), integer({ min: 1, max: 6 }), (pile, index) => {
      cleanup()
      render(<Player index={index} pile={pile} />)
      const pileElement = screen.getByTitle(
        `Player ${index + 1} pile: ${pile.length} cards`,
      )
      expect(pileElement.children).toHaveLength(pile.length)
    }),
  )
})
