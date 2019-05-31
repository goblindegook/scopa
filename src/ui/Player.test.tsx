import React from 'react'
import { assert, property, integer } from 'fast-check'
import { cleanup, render, fireEvent } from '@testing-library/react'
import { Suit } from '../engine/cards'
import { Player } from './Player'

beforeEach(cleanup)

test('disabled input', () => {
  const onPlay = jest.fn()
  const { getByTitle } = render(
    <Player
      disabled={true}
      hand={[[7, Suit.DENARI]]}
      index={0}
      pile={0}
      onPlay={onPlay}
    />
  )

  fireEvent.click(getByTitle('Sette di denari'))
  expect(onPlay).not.toHaveBeenCalled()
})

test('renders pile', () => {
  const onPlay = jest.fn()

  assert(
    property(integer(0, 40), integer(1, 6), (cards, index) => {
      cleanup()
      const { getByTitle } = render(
        <Player hand={[]} index={index} pile={cards} onPlay={onPlay} />
      )
      const pile = getByTitle(`Player ${index + 1} pile: ${cards} cards`)
      expect(pile.children).toHaveLength(cards)
    })
  )
})
