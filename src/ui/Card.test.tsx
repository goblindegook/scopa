import { cleanup, render, waitFor } from '@testing-library/react'
import { assert, asyncProperty, constantFrom, integer, property } from 'fast-check'
import { afterEach, expect, test } from 'vitest'
import { bastoni, coppe, denari, Suit, spade, type Value } from '../engine/cards'
import { Card } from './Card'

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
      const cardElement = screen.getByTitle(`di ${match}`, {
        exact: false,
      }) as HTMLImageElement
      expect(cardElement.tagName).toBe('IMG')
      await waitFor(() => expect(cardElement.src).toMatch(`/assets/${match}/${value}.jpg`))
    }),
  )
})

test.each<[string, Value]>([
  ['Asso', 1],
  ['Due', 2],
  ['Tre', 3],
  ['Quattro', 4],
  ['Cinque', 5],
  ['Sei', 6],
  ['Sette', 7],
  ['Fante', 8],
  ['Cavallo', 9],
  ['Re', 10],
])('render %s value cards', (match, value) => {
  assert(
    property(constantFrom(bastoni, coppe, denari, spade), (suit) => {
      cleanup()
      const screen = render(<Card card={suit(value)} />)
      screen.getByTitle(`${match} di`, { exact: false })
    }),
  )
})

test('hidden cards have no title', () => {
  const screen = render(<Card faceDown card={denari(1)} />)
  expect(screen.queryByAltText('Asso di denari')).not.toBeInTheDocument()
})
