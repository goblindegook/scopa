import { cleanup, render, screen } from '@testing-library/react'
import {
  type Arbitrary,
  assert,
  constantFrom,
  integer,
  property,
  tuple,
  uniqueArray,
} from 'fast-check'
import { afterEach, expect, test } from 'vitest'
import { type Card, Suit, type Value } from '../engine/cards'
import { Opponent } from './Opponent'

afterEach(() => {
  cleanup()
})

const card = tuple<Card>(
  integer({ min: 1, max: 10 }) as Arbitrary<Value>,
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
