import { Err, Ok } from '@pacote/result'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi, vitest } from 'vitest'
import { bastoni, coppe, denari, Suit, spade, type Value } from '../engine/cards'
import type { Move, State } from '../engine/state'
import { SUITS } from './Card'
import { Game } from './Game'
import i18n from './i18n'

function cn(value: Value, suit: Suit): string {
  return i18n.t('cardName', { value: i18n.t(`cardValues.${value}`), suit: i18n.t(`cardSuits.${SUITS[suit]}`) })
}

vi.mock('./preload', () => ({
  preloadCardAssets: vi.fn(async (onProgress?: (progress: number) => void) => {
    if (onProgress) {
      onProgress(1)
    }
    return Promise.resolve(undefined)
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
  localStorage.clear()
})

function testGame(overrides: Partial<State> = {}): State {
  return {
    state: 'play',
    turn: 0,
    wins: [0, 0],
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

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument()
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
  expect(screen.queryByText(/Player \d+ Wins/)).not.toBeInTheDocument()

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  expect(onStart).toHaveBeenCalled()
  expect(screen.getByLabelText('Hands won')).toBeTruthy()
  expect(screen.getByText('🐵 0')).toHaveAttribute('data-active', 'true')
  expect(screen.getByText('🤖 0')).toHaveAttribute('data-active', 'false')
})

test('selected avatar appears in header after starting game', async () => {
  const onStart = vitest.fn(() => Ok(testGame({ turn: 0 })))
  render(
    <Game
      onStart={onStart}
      onPlay={vitest.fn()}
      onOpponentTurn={async () => ({ card: denari(1), capture: [] })}
      onScore={() => []}
    />,
  )

  fireEvent.click(await screen.findByRole('button', { name: 'Select avatar 🦊' }))
  fireEvent.click(screen.getByRole('button', { name: 'New Game' }))

  expect(screen.getByText('🦊 0')).toHaveAttribute('data-active', 'true')
})

test('show re-deal message when opening table has too many kings', async () => {
  render(
    <Game
      onStart={vitest.fn().mockReturnValueOnce(Err(Error())).mockReturnValueOnce(Ok(testGame()))}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={() => []}
    />,
  )

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  expect(screen.getByRole('alert')).toHaveTextContent('Opening table with more than two kings, re-dealing hand.')
})

test('alerts auto-dismiss after 5 seconds', async () => {
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
      onPlay={() => Err(Error('test error message'))}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))
  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))
  expect(screen.getByRole('alert')).toHaveTextContent('test error message')
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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  expect(screen.getByAltText(cn(1, Suit.DENARI))).toBeTruthy()
  expect(screen.getByAltText(cn(5, Suit.DENARI))).toBeTruthy()
  expect(screen.queryByTitle(cn(6, Suit.DENARI))).toBeFalsy()
  expect(screen.queryByTitle(cn(3, Suit.DENARI))).toBeFalsy()
  expect(screen.queryByTitle(cn(2, Suit.DENARI))).toBeFalsy()
  expect(screen.queryByTitle(cn(4, Suit.DENARI))).toBeFalsy()
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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  expect(screen.getByTitle('🐵 pile: 2 cards')).toBeTruthy()
  expect(screen.getByTitle('🤖 pile: 3 cards')).toBeTruthy()
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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))
  fireEvent.click(screen.getByAltText(cn(1, Suit.DENARI)))

  expect(onPlay).toHaveBeenCalledWith({ card: denari(1), capture: [] }, initialState)
  expect(screen.getByAltText(cn(2, Suit.DENARI))).toBeTruthy()
})

test('allow playing a card by dragging it to the table', async () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [denari(1)], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
  })
  const onPlay = vitest.fn(() =>
    Ok(
      testGame({
        players: [
          { id: 0, hand: [], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [denari(2)],
      }),
    ),
  )

  render(<Game onStart={() => Ok(initialState)} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  const card = screen.getByRole('button', { name: cn(1, Suit.DENARI) })
  const table = screen.getByTestId('table')
  vitest.spyOn(table, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 400,
    bottom: 300,
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  vitest.spyOn(card, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 80,
    bottom: 140,
    width: 80,
    height: 140,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)

  fireEvent.pointerDown(card, { button: 0, pointerId: 1, clientX: 10, clientY: 10 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 100 })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 })

  await waitFor(() => {
    expect(onPlay).toHaveBeenCalledWith({ card: denari(1), capture: [] }, initialState)
  })
  expect(screen.getByAltText(cn(2, Suit.DENARI))).toBeTruthy()
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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  expect(screen.getByAltText(cn(7, Suit.DENARI)).previousSibling).toBeDisabled()

  const card = screen.getByAltText(cn(1, Suit.DENARI))

  fireEvent.click(card)

  expect(onPlay).not.toHaveBeenCalled()

  expect(card).toBeEnabled()
})

test('select cards to capture', async () => {
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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))
  fireEvent.click(screen.getByRole('checkbox', { name: cn(1, Suit.COPPE) }))
  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))

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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))
  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))

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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  await screen.findByRole('button', { name: cn(1, Suit.DENARI) })
})

test('end game and show scores', async () => {
  const state = testGame({
    state: 'stop',
    wins: [0, 1],
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

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  expect(onScore).toHaveBeenCalledWith(state.players)

  expect(screen.getByRole('columnheader', { name: '🐵' })).toBeTruthy()
  expect(screen.getByText('3')).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: '🤖' })).toBeTruthy()
  expect(screen.getByText('4')).toBeTruthy()
  expect(screen.getByText('🤖 wins the hand')).toBeTruthy()
  expect(screen.getByLabelText('Hands won')).toBeTruthy()
  expect(screen.getByText('🐵 0')).toBeTruthy()
  expect(screen.getByText('🤖 1')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next Hand' })).toBeTruthy()
})

test('tracks hands won and carries them to next hand', async () => {
  const onStart = vitest
    .fn<(wins?: readonly number[]) => ReturnType<typeof Ok<State>>>()
    .mockImplementationOnce(() =>
      Ok(
        testGame({
          turn: 0,
          players: [
            { id: 0, hand: [denari(1)], pile: [], scope: 0 },
            { id: 1, hand: [], pile: [], scope: 0 },
          ],
          table: [coppe(1)],
        }),
      ),
    )
    .mockImplementationOnce((_wins) =>
      Ok(
        testGame({
          turn: 0,
          wins: [1, 0],
          players: [
            { id: 0, hand: [bastoni(2)], pile: [], scope: 0 },
            { id: 1, hand: [denari(3)], pile: [], scope: 0 },
          ],
        }),
      ),
    )

  const onPlay = vitest.fn(() =>
    Ok(
      testGame({
        state: 'stop',
        turn: 1,
        wins: [1, 0],
        players: [
          { id: 0, hand: [], pile: [coppe(1), denari(1)], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [],
        lastCaptured: [coppe(1)],
      }),
    ),
  )

  const onScore = vitest
    .fn()
    .mockReturnValueOnce([
      { playerId: 0, total: 2, details: [] },
      { playerId: 1, total: 0, details: [] },
    ])
    .mockReturnValue([])

  render(<Game onStart={onStart} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={onScore} />)

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))
  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))
  fireEvent.click(await screen.findByRole('button', { name: 'Next Hand' }))

  expect(screen.getByText('🐵 1')).toBeTruthy()
  expect(screen.getByText('🤖 0')).toBeTruthy()
})

test('starting a new game resets running round wins', async () => {
  const onStart = vitest
    .fn<(wins?: readonly number[]) => ReturnType<typeof Ok<State>>>()
    .mockImplementationOnce(() =>
      Ok(
        testGame({
          turn: 0,
          players: [
            { id: 0, hand: [denari(1)], pile: [], scope: 0 },
            { id: 1, hand: [], pile: [], scope: 0 },
          ],
          table: [coppe(1)],
        }),
      ),
    )
    .mockImplementationOnce((_wins) =>
      Ok(
        testGame({
          turn: 0,
          wins: [1, 0],
          players: [
            { id: 0, hand: [bastoni(2)], pile: [], scope: 0 },
            { id: 1, hand: [denari(3)], pile: [], scope: 0 },
          ],
        }),
      ),
    )
    .mockImplementationOnce(() =>
      Ok(
        testGame({
          turn: 0,
          wins: [0, 0],
          players: [
            { id: 0, hand: [spade(2)], pile: [], scope: 0 },
            { id: 1, hand: [coppe(3)], pile: [], scope: 0 },
          ],
        }),
      ),
    )

  const onPlay = vitest.fn(() =>
    Ok(
      testGame({
        state: 'stop',
        turn: 1,
        wins: [1, 0],
        players: [
          { id: 0, hand: [], pile: [coppe(1), denari(1)], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [],
        lastCaptured: [coppe(1)],
      }),
    ),
  )

  const onScore = vitest
    .fn()
    .mockReturnValueOnce([
      { playerId: 0, total: 2, details: [] },
      { playerId: 1, total: 0, details: [] },
    ])
    .mockReturnValue([])

  render(<Game onStart={onStart} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={onScore} />)

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))
  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))
  fireEvent.click(await screen.findByRole('button', { name: 'Next Hand' }))
  expect(screen.getByText('🐵 1')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Scopa' }))
  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  expect(screen.getByText('🐵 0')).toBeTruthy()
  expect(screen.getByText('🤖 0')).toBeTruthy()
})

test('when a player reaches 11 hands, show game winner and switch to New Game', async () => {
  const onStart = vitest
    .fn()
    .mockImplementationOnce(() =>
      Ok(
        testGame({
          state: 'stop',
          wins: [11, 0],
          players: [
            { id: 0, hand: [], pile: [], scope: 0 },
            { id: 1, hand: [], pile: [], scope: 0 },
          ],
        }),
      ),
    )
    .mockImplementationOnce(() =>
      Ok(
        testGame({
          turn: 0,
          wins: [0, 0],
          players: [
            { id: 0, hand: [denari(1)], pile: [], scope: 0 },
            { id: 1, hand: [denari(2)], pile: [], scope: 0 },
          ],
        }),
      ),
    )

  const onScore = vitest.fn(() => [
    { playerId: 0, total: 2, details: [] },
    { playerId: 1, total: 0, details: [] },
  ])

  render(<Game onStart={onStart} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={onScore} />)

  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  fireEvent.click(screen.getByRole('button', { name: 'Back to Title Screen' }))
  fireEvent.click(screen.getByRole('button', { name: 'New Game' }))

  expect(screen.getByText('🐵 0')).toBeTruthy()
  expect(screen.getByText('🤖 0')).toBeTruthy()
})

test('renders "Scopa!" when a player captures all cards on the table', async () => {
  render(
    <Game
      onStart={() =>
        Ok({
          state: 'play',
          turn: 0,
          wins: [0, 0],
          players: [
            { id: 0, hand: [denari(5)], pile: [], scope: 0 },
            { id: 1, hand: [denari(1)], pile: [], scope: 0 },
          ],
          pile: [],
          table: [denari(2), denari(3)],
          lastCaptured: [],
        })
      }
      onPlay={() =>
        Ok({
          state: 'play',
          turn: 1,
          wins: [0, 0],
          players: [
            { id: 0, hand: [], pile: [denari(2), denari(3), denari(5)], scope: 1 },
            { id: 1, hand: [denari(1)], pile: [], scope: 0 },
          ],
          pile: [],
          table: [],
          lastCaptured: [denari(2), denari(3)],
        })
      }
      onOpponentTurn={async () => ({ card: denari(1), capture: [] })}
      onScore={vitest.fn()}
    />,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  fireEvent.click(screen.getByRole('button', { name: cn(5, Suit.DENARI) }))

  expect(screen.getByText('Scopa!')).toBeTruthy()
})

test('does not render "Scopa!" when a player does not capture all cards on the table', async () => {
  render(
    <Game
      onStart={() =>
        Ok({
          state: 'play',
          turn: 0,
          wins: [0, 0],
          players: [
            { id: 0, hand: [bastoni(2)], pile: [], scope: 0 },
            { id: 1, hand: [denari(1)], pile: [], scope: 0 },
          ],
          pile: [],
          table: [denari(2), denari(3)],
          lastCaptured: [],
        })
      }
      onPlay={() =>
        Ok({
          state: 'play',
          turn: 1,
          wins: [0, 0],
          players: [
            { id: 0, hand: [], pile: [denari(2), bastoni(5)], scope: 0 },
            { id: 1, hand: [denari(1)], pile: [], scope: 0 },
          ],
          pile: [],
          table: [denari(3)],
          lastCaptured: [denari(2)],
        })
      }
      onOpponentTurn={async () => ({ card: denari(1), capture: [] })}
      onScore={vitest.fn()}
    />,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'New Game' }))

  fireEvent.click(screen.getByRole('button', { name: cn(2, Suit.BASTONI) }))

  expect(screen.queryByText('Scopa!')).not.toBeTruthy()
})
