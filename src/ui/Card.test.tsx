import React from 'react'
import { render, cleanup } from 'react-testing-library'
import { assert, property, integer, constantFrom } from 'fast-check'
import { Suit } from '../engine/cards'
import { Card } from './Card'

beforeEach(cleanup)

test.each<[string, Suit]>([
  ['bastoni', Suit.BASTONI],
  ['coppe', Suit.COPPE],
  ['denari', Suit.DENARI],
  ['spade', Suit.SPADE]
])('render %s suit cards', (match, suit) => {
  assert(
    property(integer(1, 10), value => {
      cleanup()
      const { getByTitle } = render(<Card value={value} suit={suit} />)
      const image = getByTitle(`di ${match}`, {
        exact: false
      }) as HTMLImageElement
      expect(image.src).toContain(`${value}.jpg`)
    })
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
  ['Re', 10]
])('render %s value cards', (match, value) => {
  assert(
    property(
      constantFrom(Suit.BASTONI, Suit.COPPE, Suit.DENARI, Suit.SPADE),
      suit => {
        cleanup()
        const { getByTitle } = render(<Card value={value} suit={suit} />)
        const image = getByTitle(`${match} di`, {
          exact: false
        }) as HTMLImageElement
        expect(image).toBeTruthy()
      }
    )
  )
})

test('hidden cards have no title', () => {
  const { queryByAltText } = render(
    <Card hidden={true} value={1} suit={Suit.DENARI} />
  )
  expect(queryByAltText('Asso di denari')).toBeNull()
})

test(`hidden cards don't require a value`, () => {
  render(<Card hidden={true} />)
})
