import { cleanup, render } from '@testing-library/react'
import { assert, constantFrom, integer, property } from 'fast-check'
import { afterEach, expect, test } from 'vitest'
import { Suit } from '../engine/cards'
import { Card } from './Card'

afterEach(() => {
  cleanup()
})

test.each<[string, Suit]>([
  ['bastoni', Suit.BASTONI],
  ['coppe', Suit.COPPE],
  ['denari', Suit.DENARI],
  ['spade', Suit.SPADE],
])('render %s suit cards', (match, suit) => {
  assert(
    property(integer({ min: 1, max: 10 }), (value) => {
      cleanup()
      const screen = render(<Card card={[value, suit]} />)
      screen.getByTitle(`di ${match}`, {
        exact: false,
      }) as HTMLImageElement
    }),
  )
})

test.each<[string, number]>([
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
    property(
      constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE),
      (suit) => {
        cleanup()
        const screen = render(<Card card={[value, suit]} />)
        screen.getByTitle(`${match} di`, { exact: false })
      },
    ),
  )
})

test('hidden cards have no title', () => {
  const screen = render(<Card faceDown card={[1, Suit.DENARI]} />)
  expect(screen.queryByAltText('Asso di denari')).not.toBeInTheDocument()
})
