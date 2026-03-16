import { cleanup, render, waitFor } from '@testing-library/react'
import { assert, asyncProperty, constantFrom, integer, property } from 'fast-check'
import { afterEach, expect, test } from 'vitest'
import { bastoni, coppe, denari, Suit, spade, type Value } from '../engine/cards'
import { Card, SUITS } from './Card'
import i18n from './i18n'

afterEach(() => {
  cleanup()
})

test.each<[string, Suit]>([
  ['bastoni', Suit.BASTONI],
  ['coppe', Suit.COPPE],
  ['denari', Suit.DENARI],
  ['spade', Suit.SPADE],
])('render %s suit cards', async (match, suit) => {
  await assert(
    asyncProperty(integer({ min: 1, max: 10 }), async (value) => {
      cleanup()
      const screen = render(<Card card={[value as Value, suit]} />)
      const expectedSuit = i18n.t(`cardSuits.${match}`)
      const cardElement = screen.getByTitle(expectedSuit, {
        exact: false,
      }) as HTMLImageElement
      expect(cardElement.tagName).toBe('IMG')
      await waitFor(() => expect(cardElement.src).toMatch(`/assets/${match}/${value}.jpg`))
    }),
  )
})

test.each<Value>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])('render value %s cards', (value) => {
  assert(
    property(constantFrom(bastoni, coppe, denari, spade), (suit) => {
      cleanup()
      const screen = render(<Card card={suit(value)} />)
      const expectedValue = i18n.t(`cardValues.${value}`)
      screen.getByTitle(expectedValue, { exact: false })
    }),
  )
})

test('hidden cards have no title', () => {
  const screen = render(<Card faceDown card={denari(1)} />)
  const expectedName = i18n.t('cardName', {
    value: i18n.t('cardValues.1'),
    suit: i18n.t(`cardSuits.${SUITS[Suit.DENARI]}`),
  })
  expect(screen.queryByAltText(expectedName)).not.toBeInTheDocument()
})
