import { Err, Ok } from '@pacote/result'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vitest } from 'vitest'
import { Suit } from '../engine/cards'
import type { Move, State } from '../engine/state'
import { Game } from './Game'

afterEach(() => {
  cleanup()
})

function testGame(overrides: Partial<State> = {}): State {
  return {
    state: 'play',
    turn: 0,
    players: [
      { id: 0, hand: [], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    pile: [],
    table: [],
    ...overrides,
  }
}

test('deal new game on start', () => {
  const turn = 0
  const onStart = vitest.fn(() => Ok(testGame({ turn })))

  render(
    <Game
      onStart={onStart}
      onPlay={vitest.fn()}
      onOpponentTurn={async () => ({ card: [1, Suit.DENARI], capture: [] })}
      onScore={() => []}
    />,
  )
  expect(screen.queryByText('Game Over')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))

  expect(onStart).toHaveBeenCalled()
  expect(screen.getByText(`Player ${turn + 1}`)).toBeTruthy()
})

test('renders opponent hand', () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          { id: 0, hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
          {
            id: 1,
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
      }),
    )

  render(
    <Game
      onStart={onStart}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))

  const cards = screen.getByTestId('p1-hand').querySelectorAll('div')
  expect(cards).toHaveLength(2)
})

test('card visibility', () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          {
            id: 0,
            hand: [[1, Suit.DENARI]],
            pile: [[2, Suit.DENARI]],
            scope: 0,
          },
          {
            id: 1,
            hand: [[3, Suit.DENARI]],
            pile: [[4, Suit.DENARI]],
            scope: 0,
          },
        ],
        table: [[5, Suit.DENARI]],
        pile: [[6, Suit.DENARI]],
      }),
    )

  render(
    <Game
      onStart={onStart}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))

  expect(screen.getByAltText('Asso di denari')).toBeTruthy()
  expect(screen.getByAltText('Cinque di denari')).toBeTruthy()
  expect(screen.queryByTitle('Sei di denari')).toBeFalsy()
  expect(screen.queryByTitle('Tre di denari')).toBeFalsy()
  expect(screen.queryByTitle('Due di denari')).toBeFalsy()
  expect(screen.queryByTitle('Quattro di denari')).toBeFalsy()
})

test('player piles', () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          {
            id: 0,
            hand: [],
            pile: [
              [1, Suit.DENARI],
              [2, Suit.DENARI],
            ],
            scope: 0,
          },
          {
            id: 1,
            hand: [],
            pile: [
              [3, Suit.DENARI],
              [4, Suit.DENARI],
              [5, Suit.DENARI],
            ],
            scope: 0,
          },
        ],
        table: [],
        pile: [],
      }),
    )

  render(
    <Game
      onStart={onStart}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))

  expect(screen.getByTitle('Player 1 pile: 2 cards')).toBeTruthy()
  expect(screen.getByTitle('Player 2 pile: 3 cards')).toBeTruthy()
})

test('allow playing a card', () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
  })

  const onPlay = vitest.fn(() =>
    Ok(
      testGame({
        state: 'play',
        players: [
          { id: 0, hand: [], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [[2, Suit.DENARI]],
      }),
    ),
  )

  render(
    <Game
      onStart={() => Ok(initialState)}
      onPlay={onPlay}
      onOpponentTurn={vitest.fn()}
      onScore={() => []}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))
  fireEvent.click(screen.getByAltText('Asso di denari'))

  expect(onPlay).toHaveBeenCalledWith(
    { card: [1, Suit.DENARI], capture: [] },
    initialState,
  )
  expect(screen.getByAltText('Due di denari')).toBeTruthy()
})

test(`block interaction when not a player's turn`, () => {
  const initialState = testGame({
    state: 'play',
    turn: 1,
    players: [
      { id: 0, hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    table: [[7, Suit.DENARI]],
  })

  const onPlay = vitest.fn()

  render(
    <Game
      onStart={() => Ok(initialState)}
      onOpponentTurn={() =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ card: [1, Suit.DENARI], capture: [] }),
            10,
          ),
        )
      }
      onPlay={onPlay}
      onScore={() => []}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))

  const checkbox = screen.getByAltText('Sette di denari')
    .previousSibling as HTMLInputElement

  expect(checkbox).toBeDisabled()

  const card = screen.getByAltText('Asso di denari') as HTMLButtonElement

  fireEvent.click(card)

  expect(onPlay).not.toHaveBeenCalled()

  expect(card).toBeEnabled()
})

test('select targets to capture', () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    table: [
      [1, Suit.COPPE],
      [1, Suit.SPADE],
    ],
  })

  const onPlay = vitest.fn(() =>
    Ok(
      testGame({
        state: 'stop',
        players: [
          { id: 0, hand: [], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [[1, Suit.SPADE]],
      }),
    ),
  )

  render(
    <Game
      onStart={() => Ok(initialState)}
      onPlay={onPlay}
      onOpponentTurn={vitest.fn()}
      onScore={() => []}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Asso di coppe' }))
  fireEvent.click(screen.getByRole('button', { name: 'Asso di denari' }))

  expect(onPlay).toHaveBeenCalledWith(
    { card: [1, Suit.DENARI], capture: [[1, Suit.COPPE]] },
    initialState,
  )
})

test('invalid move handling', () => {
  const message = 'test error message'
  const onPlay = vitest.fn(() => Err(Error(message)))

  render(
    <Game
      onStart={() =>
        Ok(
          testGame({
            players: [
              { id: 0, hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
              { id: 1, hand: [], pile: [], scope: 0 },
            ],
          }),
        )
      }
      onPlay={onPlay}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))
  fireEvent.click(screen.getByRole('button', { name: 'Asso di denari' }))

  expect(screen.getByText(message)).toBeTruthy()
})

test('computer opponent plays a card', async () => {
  const onStart = vitest.fn(() =>
    Ok(
      testGame({
        players: [
          { id: 0, hand: [[1, Suit.DENARI]], pile: [], scope: 0 },
          { id: 1, hand: [[2, Suit.DENARI]], pile: [], scope: 0 },
        ],
        turn: 1,
      }),
    ),
  )

  const onPlay = vitest.fn(() =>
    Ok(
      testGame({
        turn: 0,
        players: [
          { id: 0, hand: [], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [[1, Suit.DENARI]],
      }),
    ),
  )

  const onOpponentPlay = async (): Promise<Move> => ({
    card: [1, Suit.DENARI],
    capture: [],
  })

  render(
    <Game
      onStart={onStart}
      onPlay={onPlay}
      onOpponentTurn={onOpponentPlay}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))

  await screen.findByRole('button', { name: 'Asso di denari' })
})

test('end game and show scores', () => {
  const state = testGame({
    state: 'stop',
    players: [
      { id: 0, hand: [], pile: [], scope: 1 },
      { id: 1, hand: [], pile: [], scope: 2 },
    ],
  })

  const onScore = vitest.fn(() => [
    { playerId: 0, total: 3, details: [] },
    { playerId: 1, total: 4, details: [] },
  ])

  render(
    <Game
      onStart={() => Ok(state)}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={onScore}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Start new game' }))

  expect(onScore).toHaveBeenCalledWith(state.players)

  expect(screen.getByText('Game Over')).toBeTruthy()
  expect(screen.getByText('Player 1')).toBeTruthy()
  expect(screen.getByText('3')).toBeTruthy()
  expect(screen.getByText('Player 2')).toBeTruthy()
  expect(screen.getByText('4')).toBeTruthy()
})
