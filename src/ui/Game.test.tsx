import { Err, Ok } from '@pacote/result'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi, vitest } from 'vitest'
import { coppe, denari, spade } from '../engine/cards'
import type { Move, State } from '../engine/state'
import { Game } from './Game'

vi.mock('./preload', () => ({
  preloadCardAssets: vi.fn().mockResolvedValue(undefined),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
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
    lastCaptured: [],
    ...overrides,
  }
}

test('preload card assets', async () => {
  render(<Game onStart={vitest.fn()} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={vitest.fn()} />)

  expect(screen.getByText('Loading...')).toBeTruthy()

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })
})

test('deal new game on start', async () => {
  const turn = 0
  const onStart = vitest.fn(() => Ok(testGame({ turn })))
  render(
    <Game
      onStart={onStart}
      onPlay={vitest.fn()}
      onOpponentTurn={async () => ({ card: denari(1), capture: [] })}
      onScore={() => []}
    />,
  )
  expect(screen.queryByText('Game Over')).not.toBeInTheDocument()

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))

  expect(onStart).toHaveBeenCalled()
  expect(screen.getByText(`Player ${turn + 1}`)).toBeTruthy()
})

test('renders opponent hand', async () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          { id: 0, hand: [denari(1)], pile: [], scope: 0 },
          {
            id: 1,
            hand: [denari(2), denari(3)],
            pile: [],
            scope: 0,
          },
        ],
        table: [],
        pile: [],
      }),
    )
  render(<Game onStart={onStart} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={vitest.fn()} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))

  expect(screen.getByTestId('p1-hand').children).toHaveLength(2)
})

test('card visibility', async () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          {
            id: 0,
            hand: [denari(1)],
            pile: [denari(2)],
            scope: 0,
          },
          {
            id: 1,
            hand: [denari(3)],
            pile: [denari(4)],
            scope: 0,
          },
        ],
        table: [denari(5)],
        pile: [denari(6)],
      }),
    )
  render(<Game onStart={onStart} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={vitest.fn()} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))

  expect(screen.getByAltText('Asso di denari')).toBeTruthy()
  expect(screen.getByAltText('Cinque di denari')).toBeTruthy()
  expect(screen.queryByTitle('Sei di denari')).toBeFalsy()
  expect(screen.queryByTitle('Tre di denari')).toBeFalsy()
  expect(screen.queryByTitle('Due di denari')).toBeFalsy()
  expect(screen.queryByTitle('Quattro di denari')).toBeFalsy()
})

test('player piles', async () => {
  const onStart = () =>
    Ok(
      testGame({
        players: [
          {
            id: 0,
            hand: [],
            pile: [denari(1), denari(2)],
            scope: 0,
          },
          {
            id: 1,
            hand: [],
            pile: [denari(3), denari(4), denari(5)],
            scope: 0,
          },
        ],
        table: [],
        pile: [],
      }),
    )
  render(<Game onStart={onStart} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={vitest.fn()} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))

  expect(screen.getByTitle('Player 1 pile: 2 cards')).toBeTruthy()
  expect(screen.getByTitle('Player 2 pile: 3 cards')).toBeTruthy()
})

test('allow playing a card', async () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [denari(1)], pile: [], scope: 0 },
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
        table: [denari(2)],
      }),
    ),
  )
  render(<Game onStart={() => Ok(initialState)} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))
  fireEvent.click(screen.getByAltText('Asso di denari'))

  expect(onPlay).toHaveBeenCalledWith({ card: denari(1), capture: [] }, initialState)
  expect(screen.getByAltText('Due di denari')).toBeTruthy()
})

test(`block interaction when not a player's turn`, async () => {
  const initialState = testGame({
    state: 'play',
    turn: 1,
    players: [
      { id: 0, hand: [denari(1)], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    table: [denari(7)],
  })
  const onPlay = vitest.fn()
  render(
    <Game
      onStart={() => Ok(initialState)}
      onOpponentTurn={() => new Promise((resolve) => setTimeout(() => resolve({ card: denari(1), capture: [] }), 10))}
      onPlay={onPlay}
      onScore={() => []}
    />,
  )

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))

  expect(screen.getByAltText('Sette di denari').previousSibling).toBeDisabled()

  const card = screen.getByAltText('Asso di denari')

  fireEvent.click(card)

  expect(onPlay).not.toHaveBeenCalled()

  expect(card).toBeEnabled()
})

test('select targets to capture', async () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [denari(1)], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    table: [coppe(1), spade(1)],
  })

  const onPlay = vitest.fn(() =>
    Ok(
      testGame({
        state: 'stop',
        players: [
          { id: 0, hand: [], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [spade(1)],
      }),
    ),
  )

  render(<Game onStart={() => Ok(initialState)} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Asso di coppe' }))
  fireEvent.click(screen.getByRole('button', { name: 'Asso di denari' }))

  expect(onPlay).toHaveBeenCalledWith({ card: denari(1), capture: [coppe(1)] }, initialState)
})

test('invalid move handling', async () => {
  const message = 'test error message'
  const onPlay = vitest.fn(() => Err(Error(message)))

  render(
    <Game
      onStart={() =>
        Ok(
          testGame({
            players: [
              { id: 0, hand: [denari(1)], pile: [], scope: 0 },
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

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))
  fireEvent.click(screen.getByRole('button', { name: 'Asso di denari' }))

  expect(screen.getByText(message)).toBeTruthy()
})

test('computer opponent plays a card', async () => {
  const onStart = vitest.fn(() =>
    Ok(
      testGame({
        players: [
          { id: 0, hand: [denari(1)], pile: [], scope: 0 },
          { id: 1, hand: [denari(2)], pile: [], scope: 0 },
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
        table: [denari(1)],
      }),
    ),
  )

  const onOpponentPlay = async (): Promise<Move> => ({
    card: denari(1),
    capture: [],
  })

  render(<Game onStart={onStart} onPlay={onPlay} onOpponentTurn={onOpponentPlay} onScore={vitest.fn()} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))

  await screen.findByRole('button', { name: 'Asso di denari' })
})

test('end game and show scores', async () => {
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

  render(<Game onStart={() => Ok(state)} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={onScore} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Start new game' }))

  expect(onScore).toHaveBeenCalledWith(state.players)

  expect(screen.getByText('Game Over')).toBeTruthy()
  expect(screen.getByText('Player 1')).toBeTruthy()
  expect(screen.getByText('3')).toBeTruthy()
  expect(screen.getByText('Player 2')).toBeTruthy()
  expect(screen.getByText('4')).toBeTruthy()
})
