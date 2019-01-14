import React from 'react'
import { cleanup, render, fireEvent } from 'react-testing-library'
import { State } from '../engine/state'
import { Game } from './Game'
import { Suit } from '../engine/cards'
import { right, left } from 'fp-ts/lib/Either'

beforeEach(cleanup)

function testGame(overrides: Partial<State> = {}): State {
  return {
    state: 'play',
    turn: 0,
    players: [
      { hand: [], pile: [], score: 0 },
      { hand: [], pile: [], score: 0 }
    ],
    pile: [],
    table: [],
    ...overrides
  }
}

test('deal new game on start', () => {
  const turn = 0
  const onStart = jest.fn(() => right(testGame({ turn })))
  const onOpponentPlay = () => testGame({ state: 'stop' })

  const { getByText, queryByText } = render(
    <Game
      onStart={onStart}
      onPlay={jest.fn()}
      onOpponentPlay={onOpponentPlay}
      onScore={() => []}
    />
  )
  expect(queryByText('Game Over')).toBeNull()
  fireEvent.click(getByText('Start new game'))
  expect(onStart).toHaveBeenCalled()
  expect(getByText(`Player ${turn + 1}`)).toBeTruthy()
})

test('card visibility', () => {
  const onStart = () =>
    right<Error, State>(
      testGame({
        players: [
          { hand: [[1, Suit.DENARI]], pile: [[2, Suit.DENARI]], score: 0 },
          { hand: [[3, Suit.DENARI]], pile: [[4, Suit.DENARI]], score: 0 }
        ],
        table: [[5, Suit.DENARI]],
        pile: [[6, Suit.DENARI]]
      })
    )

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
  const initialState = testGame({
    players: [
      { hand: [[1, Suit.DENARI]], pile: [], score: 0 },
      { hand: [], pile: [], score: 0 }
    ]
  })

  const onPlay = jest.fn(() =>
    right(
      testGame({
        state: 'stop',
        players: [
          { hand: [], pile: [], score: 0 },
          { hand: [], pile: [], score: 0 }
        ],
        table: [[2, Suit.DENARI]]
      })
    )
  )

  const { getByText, getByTitle } = render(
    <Game
      onStart={() => right(initialState)}
      onPlay={onPlay}
      onOpponentPlay={jest.fn()}
      onScore={() => []}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(getByTitle('Asso di denari'))

  expect(onPlay).toHaveBeenCalledWith(
    { card: [1, Suit.DENARI], targets: [] },
    initialState
  )
  expect(getByTitle('Due di denari')).toBeTruthy()
})

test('select targets to capture', () => {
  const initialState = testGame({
    players: [
      { hand: [[1, Suit.DENARI]], pile: [], score: 0 },
      { hand: [], pile: [], score: 0 }
    ],
    table: [[1, Suit.COPPE], [1, Suit.SPADE]]
  })

  const onPlay = jest.fn(() =>
    right(
      testGame({
        state: 'stop',
        players: [
          { hand: [], pile: [], score: 0 },
          { hand: [], pile: [], score: 0 }
        ],
        table: [[1, Suit.SPADE]]
      })
    )
  )

  const { getByText, getByTitle } = render(
    <Game
      onStart={() => right(initialState)}
      onPlay={onPlay}
      onOpponentPlay={jest.fn()}
      onScore={() => []}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(
    getByTitle('Asso di coppe')
      .closest('label')!
      .querySelector('input')!
  )
  fireEvent.click(getByTitle('Asso di denari'))

  expect(onPlay).toHaveBeenCalledWith(
    { card: [1, Suit.DENARI], targets: [[1, Suit.COPPE]] },
    initialState
  )
})

test('invalid move handling', () => {
  const message = 'test error message'
  const onPlay = jest.fn(() => left(Error(message)))

  const { getByText, getByTitle } = render(
    <Game
      onStart={() =>
        right(
          testGame({
            players: [
              { hand: [[1, Suit.DENARI]], pile: [], score: 0 },
              { hand: [], pile: [], score: 0 }
            ]
          })
        )
      }
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
  const onStart = jest.fn(() =>
    right(
      testGame({
        players: [
          { hand: [[1, Suit.DENARI]], pile: [], score: 0 },
          { hand: [[2, Suit.DENARI]], pile: [], score: 0 }
        ]
      })
    )
  )

  const onPlay = jest.fn(() =>
    right(
      testGame({
        turn: 1,
        players: [
          { hand: [], pile: [], score: 0 },
          { hand: [[2, Suit.DENARI]], pile: [], score: 0 }
        ],
        table: [[1, Suit.DENARI]]
      })
    )
  )

  const onOpponentPlay = () =>
    testGame({
      players: [
        { hand: [], pile: [], score: 0 },
        { hand: [], pile: [], score: 0 }
      ],
      table: [[1, Suit.DENARI], [2, Suit.DENARI]]
    })

  const { getByText, getByTitle } = render(
    <Game
      onStart={onStart}
      onPlay={onPlay}
      onOpponentPlay={onOpponentPlay}
      onScore={jest.fn()}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(getByTitle('Asso di denari'))

  expect(getByTitle('Asso di denari')).toBeTruthy()
  expect(getByTitle('Due di denari')).toBeTruthy()
})

test('end game and show scores', () => {
  const state = testGame({
    state: 'stop',
    players: [
      { hand: [], pile: [], score: 1 },
      { hand: [], pile: [], score: 2 }
    ]
  })

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
