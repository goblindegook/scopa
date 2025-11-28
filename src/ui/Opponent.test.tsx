import { cleanup, render, screen } from '@testing-library/react'
import { assert, constantFrom, property, tuple, uniqueArray } from 'fast-check'
import { afterEach, expect, test } from 'vitest'
import { Suit, type Value } from '../engine/cards'
import { Opponent } from './Opponent'

afterEach(() => {
  cleanup()
})

const arbitraryCard = tuple(
  constantFrom<Value>(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
  constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE),
)

const cardSet = (maxLength: number) => uniqueArray(arbitraryCard, { maxLength, selector: (c) => c.join('-') })

test('renders opponent pile', () => {
  assert(
    property(cardSet(10), (pile) => {
      cleanup()
      render(<Opponent index={1} pile={pile} />)
      const pileElement = screen.getByTitle(`Player 2 pile: ${pile.length} cards`)
      expect(pileElement.children).toHaveLength(pile.length)
    }),
  )
})
