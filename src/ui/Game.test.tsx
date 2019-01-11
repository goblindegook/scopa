import React from 'react'
import { cleanup, render, fireEvent } from 'react-testing-library'
import { Game as State } from '../engine/scopa'
import { Game } from './Game'
import { Suit } from '../engine/cards'
import { right } from 'fp-ts/lib/Either'

beforeEach(cleanup)

test('deals new game on start', () => {
  const onStart = jest.fn(() =>
    right({
      state: 'play',
      turn: 0,
      players: [
        { hand: [], pile: [], scope: 0 },
        { hand: [], pile: [], scope: 0 }
      ],
      pile: [],
      table: []
    })
  )

  const { getByText } = render(<Game onStart={onStart} />)
  fireEvent.click(getByText('Start new game'))
  expect(onStart).toHaveBeenCalled()
})

test('deals new game on start', () => {
  const onStart = () =>
    right<Error, State>({
      state: 'play',
      turn: 0,
      players: [
        { hand: [[1, Suit.DENARI]], pile: [[2, Suit.DENARI]], scope: 0 },
        { hand: [[3, Suit.DENARI]], pile: [[4, Suit.DENARI]], scope: 0 }
      ],
      table: [[5, Suit.DENARI]],
      pile: [[6, Suit.DENARI]]
    })

  const { getByText, getByTitle } = render(<Game onStart={onStart} />)
  fireEvent.click(getByText('Start new game'))

  expect(getByTitle('Asso di denari')).toBeTruthy()
  expect(getByTitle('Cinque di denari')).toBeTruthy()
})
