import { cleanup, render, screen } from '@testing-library/react'
import { assert, constantFrom, property, tuple, uniqueArray } from 'fast-check'
import { afterEach, expect, test } from 'vitest'
import { Suit, type Value } from '../engine/cards'
import i18n from './i18n'
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
      render(<Opponent index={1} avatar="🤖" pile={pile} />)
      const pileElement = screen.getByTitle(i18n.t('playerPile', { avatar: '🤖', count: pile.length }))
      expect(pileElement.children).toHaveLength(pile.length)
    }),
  )
})
