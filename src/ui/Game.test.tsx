/* eslint-disable @typescript-eslint/no-non-null-assertion */

import React from 'react'
import { render, fireEvent, wait } from '@testing-library/react'
import { Err, Ok } from '@pacote/result'
import { Suit } from '../engine/cards'
import { State, Move } from '../engine/state'
import { Game } from './Game'
import { Score } from '../engine/scores'

function testGame(overrides: Partial<State> = {}): State {
  return {
    state: 'play',
    turn: 0,
    players: [
      { hand: [], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 },
    ],
    pile: [],
    table: [],
    ...overrides,
  }
}

test(`deal new game on start`, () => {
  const turn = 0
  const onStart = jest.fn(() => Ok(testGame({ turn })))

  const { getByText, queryByText } = render(
    <Game
      onStart={onStart}
      onPlay={jest.fn()}
      onOpponentTurn={async () => ({ card: [1, Suit.DENARI], targets: [] })}
      onScore={() => []}
    />
  )
  expect(queryByText('Game Over')).toBeNull()

  fireEvent.click(getByText('Start new game'))

  expect(onStart).toHaveBeenCalled()
  expect(getByText(`Player ${turn + 1}`)).toBeTruthy()
})

test('renders opponent hand', () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
          {
            hand: [
              [2, Suit.DENARI],
              [3, Suit.DENARI],
            ],
            pile: [],
            scope: 0,
          },
        ],
        table: [],
        pile: [],
      })
    )

  const { getByText, getByTestId } = render(
    <Game
      onStart={onStart}
      onPlay={jest.fn()}
      onOpponentTurn={jest.fn()}
      onScore={jest.fn()}
    />
  )

  fireEvent.click(getByText('Start new game'))

  const cards = getByTestId('p1-hand').querySelectorAll('div')
  expect(cards).toHaveLength(2)
})

test(`card visibility`, () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          { hand: [[1, Suit.DENARI]], pile: [[2, Suit.DENARI]], scope: 0 },
          { hand: [[3, Suit.DENARI]], pile: [[4, Suit.DENARI]], scope: 0 },
        ],
        table: [[5, Suit.DENARI]],
        pile: [[6, Suit.DENARI]],
      })
    )

  const { getByText, getByAltText, queryByTitle } = render(
    <Game
      onStart={onStart}
      onPlay={jest.fn()}
      onOpponentTurn={jest.fn()}
      onScore={jest.fn()}
    />
  )

  fireEvent.click(getByText('Start new game'))

  expect(getByAltText('Asso di denari')).toBeTruthy()
  expect(getByAltText('Cinque di denari')).toBeTruthy()
  expect(queryByTitle('Sei di denari')).toBeFalsy()
  expect(queryByTitle('Tre di denari')).toBeFalsy()
  expect(queryByTitle('Due di denari')).toBeFalsy()
  expect(queryByTitle('Quattro di denari')).toBeFalsy()
})

test(`player piles`, () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          {
            hand: [],
            pile: [
              [1, Suit.DENARI],
              [1, Suit.DENARI],
            ],
            scope: 0,
          },
          {
            hand: [],
            pile: [
              [1, Suit.DENARI],
              [1, Suit.DENARI],
              [1, Suit.DENARI],
            ],
            scope: 0,
          },
        ],
        table: [],
        pile: [],
      })
    )

  const { getByText, getByTitle } = render(
    <Game
      onStart={onStart}
      onPlay={jest.fn()}
      onOpponentTurn={jest.fn()}
      onScore={jest.fn()}
    />
  )

  fireEvent.click(getByText('Start new game'))

  expect(getByTitle('Player 1 pile: 2 cards')).toBeTruthy()
  expect(getByTitle('Player 2 pile: 3 cards')).toBeTruthy()
})

test(`allow playing a card`, () => {
  const initialState = testGame({
    players: [
      { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 },
    ],
  })

  const onPlay = jest.fn(() =>
    Ok(
      testGame({
        state: 'play',
        players: [
          { hand: [], pile: [], scope: 0 },
          { hand: [], pile: [], scope: 0 },
        ],
        table: [[2, Suit.DENARI]],
      })
    )
  )

  const { getByText, getByAltText } = render(
    <Game
      onStart={() => Ok(initialState)}
      onPlay={onPlay}
      onOpponentTurn={jest.fn()}
      onScore={() => []}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(getByAltText('Asso di denari'))

  expect(onPlay).toHaveBeenCalledWith(
    { card: [1, Suit.DENARI], targets: [] },
    initialState
  )
  expect(getByAltText('Due di denari')).toBeTruthy()
})

test(`block interaction when not a player's turn`, () => {
  const initialState = testGame({
    state: 'play',
    turn: 1,
    players: [
      { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 },
    ],
    table: [[7, Suit.DENARI]],
  })

  const onPlay = jest.fn()

  const { getByText, getByAltText } = render(
    <Game
      onStart={() => Ok(initialState)}
      onOpponentTurn={() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ card: [1, Suit.DENARI], targets: [] }), 10)
        )
      }
      onPlay={onPlay}
      onScore={() => []}
    />
  )

  fireEvent.click(getByText('Start new game'))

  const checkbox = getByAltText('Sette di denari')
    .previousSibling as HTMLInputElement
  expect(checkbox.disabled).toBeTruthy()

  const card = getByAltText('Asso di denari') as HTMLButtonElement

  fireEvent.click(card)

  expect(onPlay).not.toHaveBeenCalled()

  expect(card.disabled).toBeFalsy()
})

test(`select targets to capture`, () => {
  const initialState = testGame({
    players: [
      { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { hand: [], pile: [], scope: 0 },
    ],
    table: [
      [1, Suit.COPPE],
      [1, Suit.SPADE],
    ],
  })

  const onPlay = jest.fn(() =>
    Ok(
      testGame({
        state: 'stop',
        players: [
          { hand: [], pile: [], scope: 0 },
          { hand: [], pile: [], scope: 0 },
        ],
        table: [[1, Suit.SPADE]],
      })
    )
  )

  const { getByText, getByAltText } = render(
    <Game
      onStart={() => Ok(initialState)}
      onPlay={onPlay}
      onOpponentTurn={jest.fn()}
      onScore={() => []}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(
    getByAltText('Asso di coppe').closest('label')!.querySelector('input')!
  )
  fireEvent.click(getByAltText('Asso di denari'))

  expect(onPlay).toHaveBeenCalledWith(
    { card: [1, Suit.DENARI], targets: [[1, Suit.COPPE]] },
    initialState
  )
})

test(`invalid move handling`, () => {
  const message = 'test error message'
  const onPlay = jest.fn(() => Err(Error(message)))

  const { getByText, getByAltText } = render(
    <Game
      onStart={() =>
        Ok(
          testGame({
            players: [
              { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
              { hand: [], pile: [], scope: 0 },
            ],
          })
        )
      }
      onPlay={onPlay}
      onOpponentTurn={jest.fn()}
      onScore={jest.fn()}
    />
  )

  fireEvent.click(getByText('Start new game'))
  fireEvent.click(getByAltText('Asso di denari'))

  expect(getByText(message)).toBeTruthy()
})

test(`computer opponent plays a card`, async () => {
  const onStart = jest.fn(() =>
    Ok(
      testGame({
        players: [
          { hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
          { hand: [[2, Suit.DENARI]], pile: [], scope: 0 },
        ],
        turn: 1,
      })
    )
  )

  const onPlay = jest.fn(() =>
    Ok(
      testGame({
        turn: 0,
        players: [
          { hand: [], pile: [], scope: 0 },
          { hand: [], pile: [], scope: 0 },
        ],
        table: [[1, Suit.DENARI]],
      })
    )
  )

  const onOpponentPlay = async (): Promise<Move> => ({
    card: [1, Suit.DENARI],
    targets: [],
  })

  const { getByText, getByAltText } = render(
    <Game
      onStart={onStart}
      onPlay={onPlay}
      onOpponentTurn={onOpponentPlay}
      onScore={jest.fn()}
    />
  )

  fireEvent.click(getByText('Start new game'))

  await wait(() => getByAltText('Asso di denari'))
})

test(`end game and show scores`, () => {
  const state = testGame({
    state: 'stop',
    players: [
      { hand: [], pile: [], scope: 1 },
      { hand: [], pile: [], scope: 2 },
    ],
  })

  const onScore = jest.fn<Score[], [State['players']]>(() => [
    { total: 3, details: [] },
    { total: 4, details: [] },
  ])

  const { getByText } = render(
    <Game
      onStart={() => Ok(state)}
      onPlay={jest.fn()}
      onOpponentTurn={jest.fn()}
      onScore={onScore}
    />
  )

  fireEvent.click(getByText('Start new game'))

  expect(onScore).toHaveBeenCalledWith(state.players)

  expect(getByText('Game Over')).toBeTruthy()
  expect(getByText('Player 1')).toBeTruthy()
  expect(getByText('3')).toBeTruthy()
  expect(getByText('Player 2')).toBeTruthy()
  expect(getByText('4')).toBeTruthy()
})
