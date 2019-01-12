import React from 'react'
import { cleanup, render, fireEvent } from 'react-testing-library'
import { State } from '../engine/scopa'
import { Game } from './Game'
import { Suit } from '../engine/cards'
import { right, left } from 'fp-ts/lib/Either'

beforeEach(cleanup)

test('deal new game on start', () => {
  const turn = 0
  const state: State = {
    state: 'play',
    turn,
    players: [
      { hand: [], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 }
    ],
    pile: [],
    table: []
  }

  const onStart = jest.fn(() => right(state))

  const { getByText } = render(
    <Game
      onStart={onStart}
      onPlay={jest.fn()}
      onOpponentPlay={jest.fn(() => ({ ...state, state: 'stop' }))}
      onScore={jest.fn(() => [])}
    />
  )
  fireEvent.click(getByText('Start new game'))
  expect(onStart).toHaveBeenCalled()
  expect(getByText(`Player ${turn + 1}`)).toBeTruthy()
})

test('card visibility', () => {
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

  const { getByText, getByTitle, queryByTitle } = render(
    <Game
      onStart={onStart}
      onPlay={jest.fn()}
      onOpponentPlay={jest.fn()}
      onScore={jest.fn()}
    />
  )
  fireEvent.click(getByText('Start new game'))

  expect(getByTitle('Asso di denari')).toBeTruthy()
  expect(getByTitle('Cinque di denari')).toBeTruthy()
  expect(queryByTitle('Sei di denari')).toBeFalsy()
  expect(queryByTitle('Tre di denari')).toBeFalsy()
  expect(queryByTitle('Due di denari')).toBeFalsy()
  expect(queryByTitle('Quattro di denari')).toBeFalsy()
})

test('allow playing a card', () => {
  const initialState: State = {
    state: 'play',
    turn: 0,
    players: [
      { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 }
    ],
    table: [],
    pile: []
  }

  const nextState: State = {
    state: 'stop',
    turn: 0,
    players: [
      { hand: [], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 }
    ],
    table: [[2, Suit.DENARI]],
    pile: []
  }

  const onPlay = jest.fn(() => right(nextState))

  const { getByText, getByTitle } = render(
    <Game
      onStart={() => right(initialState)}
      onPlay={onPlay}
      onOpponentPlay={jest.fn()}
      onScore={jest.fn(() => [])}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(getByTitle('Asso di denari'))

  expect(onPlay).toHaveBeenCalledWith({ card: [1, Suit.DENARI] }, initialState)
  expect(getByTitle('Due di denari')).toBeTruthy()
})

test('handles invalid move', () => {
  const initialState: State = {
    state: 'play',
    turn: 0,
    players: [
      { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 }
    ],
    table: [],
    pile: []
  }

  const message = 'test error message'
  const onPlay = jest.fn(() => left(Error(message)))

  const { getByText, getByTitle } = render(
    <Game
      onStart={() => right(initialState)}
      onPlay={onPlay}
      onOpponentPlay={jest.fn()}
      onScore={jest.fn()}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(getByTitle('Asso di denari'))

  expect(getByText(message)).toBeTruthy()
})

test('computer opponent plays a card', () => {
  const initialState: State = {
    state: 'play',
    turn: 0,
    players: [
      { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { hand: [[2, Suit.DENARI]], pile: [], scope: 0 }
    ],
    table: [],
    pile: []
  }

  const nextState: State = {
    state: 'play',
    turn: 1,
    players: [
      { hand: [], pile: [], scope: 0 },
      { hand: [[2, Suit.DENARI]], pile: [], scope: 0 }
    ],
    table: [[1, Suit.DENARI]],
    pile: []
  }

  const finalState: State = {
    state: 'play',
    turn: 0,
    players: [
      { hand: [], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 }
    ],
    table: [[1, Suit.DENARI], [2, Suit.DENARI]],
    pile: []
  }

  const onPlay = jest.fn(() => right(nextState))
  const onOpponnentPlay = jest.fn(() => finalState)

  const { getByText, getByTitle } = render(
    <Game
      onStart={() => right(initialState)}
      onPlay={onPlay}
      onOpponentPlay={onOpponnentPlay}
      onScore={jest.fn()}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(getByTitle('Asso di denari'))

  expect(getByTitle('Asso di denari')).toBeTruthy()
  expect(getByTitle('Due di denari')).toBeTruthy()
})

test('end game and show scores', () => {
  const state: State = {
    state: 'stop',
    turn: 0,
    players: [
      { hand: [], pile: [], scope: 1 },
      { hand: [], pile: [], scope: 2 }
    ],
    table: [],
    pile: []
  }

  const onScore = jest.fn(() => [3, 4])

  const { getByText, getByTitle } = render(
    <Game
      onStart={() => right(state)}
      onPlay={jest.fn()}
      onOpponentPlay={jest.fn()}
      onScore={onScore}
    />
  )

  fireEvent.click(getByText('Start new game'))

  expect(onScore).toHaveBeenCalledWith(state)

  expect(getByText('Game Over')).toBeTruthy()
  expect(getByText('Player 1: 3')).toBeTruthy()
  expect(getByText('Player 2: 4')).toBeTruthy()
})
