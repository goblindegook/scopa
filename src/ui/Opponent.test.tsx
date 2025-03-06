import { cleanup, render, screen } from '@testing-library/react'
import {
  assert,
  constantFrom,
  integer,
  property,
  tuple,
  uniqueArray,
} from 'fast-check'
import { Suit } from '../engine/cards'
import { Opponent } from './Opponent'
import { afterEach, expect, test } from 'vitest'

afterEach(() => {
  cleanup()
})

const card = tuple(
  integer({ min: 1, max: 10 }),
  constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE),
)

const cardSet = (maxLength: number) =>
  uniqueArray(card, { maxLength, selector: (v) => v.join(':') })

test('renders opponent pile', () => {
  assert(
    property(cardSet(10), (pile) => {
      cleanup()
      render(<Opponent index={1} pile={pile} />)
      const pileElement = screen.getByTitle(
        `Player 2 pile: ${pile.length} cards`,
      )
      expect(pileElement.children).toHaveLength(pile.length)
    }),
  )
})
