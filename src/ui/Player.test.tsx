import React from 'react'
import { render, fireEvent } from 'react-testing-library'
import { Suit } from '../engine/cards'
import { Player } from './Player'

test('disabled input', () => {
  const onPlay = jest.fn()
  const { getByTitle } = render(
    <Player disabled={true} hand={[[7, Suit.DENARI]]} onPlay={onPlay} />
  )

  fireEvent.click(getByTitle('Sette di denari'))
  expect(onPlay).not.toHaveBeenCalled()
})
