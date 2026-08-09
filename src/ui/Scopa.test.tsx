import { Err, Ok } from '@pacote/result'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi, vitest } from 'vitest'
import { bastoni, coppe, denari, Suit, spade, type Value } from '../engine/cards'
import type { OpponentOptions } from '../engine/opponent'
import type { Move, State } from '../engine/state'
import { SUITS } from './Card'
import i18n from './i18n'
import { Scopa } from './Scopa'

function cn(value: Value, suit: Suit): string {
  return i18n.t('cardName', { value: i18n.t(`cardValues.${value}`), suit: i18n.t(`cardSuits.${SUITS[suit]}`) })
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
  window.localStorage.clear()
})

function testGame(overrides: Partial<State> = {}): State {
  return {
    state: 'play',
    turn: 0,
    firstPlayer: 0,
    score: [0, 0],
    players: [
      { id: 0, hand: [], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    pile: [],
    table: [],
    lastTaken: [],
    ...overrides,
  }
}

test('show re-deal message when starting the next round', async () => {
  const state = testGame({
    state: 'stop',
    score: [2, 1],
    players: [
      { id: 0, hand: [], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
  })

  render(
    <Scopa
      playerId={0}
      state={state}
      onStart={vitest.fn().mockReturnValueOnce(Err(Error())).mockReturnValueOnce(Ok(testGame()))}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={() => [
        { playerId: 0, total: 0, details: [] },
        { playerId: 1, total: 0, details: [] },
      ]}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Next Round' }))

  expect(screen.getByRole('alert')).toHaveTextContent('Opening table with more than two kings, re-dealing hand.')
})

test('re-deal preserves requested three-player mode on the next round', async () => {
  const onStart = vitest
    .fn()
    .mockReturnValueOnce(Err(Error('re-deal')))
    .mockReturnValueOnce(
      Ok(
        testGame({
          turn: 0,
          score: [0, 0, 0],
          players: [
            { id: 0, hand: [denari(1)], pile: [], scope: 0 },
            { id: 1, hand: [denari(2)], pile: [], scope: 0 },
            { id: 2, hand: [denari(3)], pile: [], scope: 0 },
          ],
        }),
      ),
    )

  const state = testGame({
    state: 'stop',
    turn: 0,
    firstPlayer: 0,
    score: [1, 2, 3],
    players: [
      { id: 0, hand: [], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
      { id: 2, hand: [], pile: [], scope: 0 },
    ],
  })

  render(
    <Scopa
      playerId={0}
      state={state}
      playerProfiles={[{ avatar: '🐵' }, { avatar: '🤖' }, { avatar: '👾' }]}
      onStart={onStart}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={() => [
        { playerId: 0, total: 0, details: [] },
        { playerId: 1, total: 0, details: [] },
        { playerId: 2, total: 0, details: [] },
      ]}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Next Round' }))

  expect(onStart).toHaveBeenCalledTimes(2)
  expect(onStart).toHaveBeenLastCalledWith([1, 2, 3], 3, 0)
})

test('alerts auto-dismiss after 5 seconds', async () => {
  const state = testGame({
    players: [
      { id: 0, hand: [denari(1)], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
  })

  render(
    <Scopa
      playerId={0}
      state={state}
      onPlay={() => Err(Error('test error message'))}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))
  expect(screen.getByRole('alert')).toHaveTextContent('test error message')
})

test('renders opponent hand', async () => {
  const state = testGame({
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
  })
  render(<Scopa playerId={0} state={state} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={vitest.fn()} />)

  expect(screen.getByTestId('p1-hand').children).toHaveLength(2)
})

test('card visibility', async () => {
  const state = testGame({
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
  })
  render(<Scopa playerId={0} state={state} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={vitest.fn()} />)

  expect(screen.getByAltText(cn(1, Suit.DENARI))).toBeTruthy()
  expect(screen.getByAltText(cn(5, Suit.DENARI))).toBeTruthy()
  expect(screen.queryByTitle(cn(6, Suit.DENARI))).toBeFalsy()
  expect(screen.queryByTitle(cn(3, Suit.DENARI))).toBeFalsy()
  expect(screen.queryByTitle(cn(2, Suit.DENARI))).toBeFalsy()
  expect(screen.queryByTitle(cn(4, Suit.DENARI))).toBeFalsy()
})

test('player piles', async () => {
  const state = testGame({
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
  })
  render(<Scopa playerId={0} state={state} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={vitest.fn()} />)

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
  render(<Scopa playerId={0} state={initialState} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(screen.getByAltText(cn(1, Suit.DENARI)))

  expect(onPlay).toHaveBeenCalledWith({ card: denari(1), take: [] }, initialState)
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

  render(<Scopa playerId={0} state={initialState} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

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
    expect(onPlay).toHaveBeenCalledWith({ card: denari(1), take: [] }, initialState)
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
    <Scopa
      playerId={0}
      state={initialState}
      onOpponentTurn={() => new Promise((resolve) => setTimeout(() => resolve({ card: denari(1), take: [] }), 10))}
      onPlay={onPlay}
      onScore={() => []}
    />,
  )

  expect(screen.getByAltText(cn(7, Suit.DENARI)).previousSibling).toBeDisabled()

  const card = screen.getByAltText(cn(1, Suit.DENARI))

  fireEvent.click(card)

  expect(onPlay).not.toHaveBeenCalled()

  expect(card).toBeEnabled()
})

test('select cards to take', async () => {
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

  render(<Scopa playerId={0} state={initialState} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))
  fireEvent.click(screen.getByRole('checkbox', { name: cn(1, Suit.COPPE) }))
  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))

  expect(onPlay).toHaveBeenCalledWith({ card: denari(1), take: [coppe(1)] }, initialState)
})

test('invalid move handling', async () => {
  const message = 'test error message'
  const onPlay = vitest.fn(() => Err(Error(message)))

  render(
    <Scopa
      playerId={0}
      state={testGame({
        players: [
          { id: 0, hand: [denari(1)], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
      })}
      onPlay={onPlay}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))

  expect(screen.getByText(message)).toBeTruthy()
})

test('computer opponent plays a card', async () => {
  const state = testGame({
    players: [
      { id: 0, hand: [denari(1)], pile: [], scope: 0 },
      { id: 1, hand: [denari(2)], pile: [], scope: 0 },
    ],
    turn: 1,
  })
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
    take: [],
  })

  render(<Scopa playerId={0} state={state} onPlay={onPlay} onOpponentTurn={onOpponentPlay} onScore={vitest.fn()} />)

  await screen.findByRole('button', { name: cn(1, Suit.DENARI) })
})

test('opponent turn receives configured aggression from player profile', async () => {
  const initialState = testGame({
    turn: 1,
    score: [0, 0],
    players: [
      { id: 0, hand: [denari(1)], pile: [], scope: 0 },
      { id: 1, hand: [denari(2)], pile: [], scope: 0 },
    ],
  })

  const onOpponentTurn = vitest.fn<(game: State, options: OpponentOptions) => Promise<Move>>(async () => ({
    card: denari(2),
    take: [],
  }))

  render(
    <Scopa
      playerId={0}
      state={initialState}
      playerProfiles={[{ avatar: '🐵' }, { avatar: '🤖', canCountCards: true, aggression: 0.5 }]}
      onPlay={vitest.fn()}
      onOpponentTurn={onOpponentTurn}
      onScore={vitest.fn()}
    />,
  )

  await waitFor(
    () =>
      expect(onOpponentTurn).toHaveBeenCalledWith(expect.anything(), {
        avatar: expect.anything(),
        canCountCards: true,
        aggression: 0.5,
      }),
    { timeout: 2500 },
  )
})

test('end game and show scores', async () => {
  const state = testGame({
    state: 'stop',
    score: [0, 1],
    players: [
      { id: 0, hand: [], pile: [], scope: 1 },
      { id: 1, hand: [], pile: [], scope: 2 },
    ],
  })

  const onScore = vitest.fn(() => [
    { playerId: 0, total: 3, details: [] },
    { playerId: 1, total: 4, details: [] },
  ])

  render(<Scopa playerId={0} state={state} onPlay={vitest.fn()} onOpponentTurn={vitest.fn()} onScore={onScore} />)

  expect(onScore).toHaveBeenCalledWith(state.players)

  expect(screen.getByRole('columnheader', { name: '🐵' })).toBeTruthy()
  expect(screen.getByText('3')).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: '🤖' })).toBeTruthy()
  expect(screen.getByText('4')).toBeTruthy()
  expect(screen.getByText('End of Round')).toBeTruthy()
  expect(screen.getByLabelText('Game score')).toBeTruthy()
  expect(screen.getByText('🐵 0')).toBeTruthy()
  expect(screen.getByText('🤖 1')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next Round' })).toBeTruthy()
})

test('tracks game score and carries it to next round', async () => {
  const onStart = vitest
    .fn<(score?: readonly number[]) => ReturnType<typeof Ok<State>>>()
    .mockImplementationOnce((_score) =>
      Ok(
        testGame({
          turn: 0,
          score: [1, 0],
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
        score: [1, 0],
        players: [
          { id: 0, hand: [], pile: [coppe(1), denari(1)], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [],
        lastTaken: [coppe(1)],
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

  render(
    <Scopa
      playerId={0}
      state={testGame({
        turn: 0,
        players: [
          { id: 0, hand: [denari(1)], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        table: [coppe(1)],
      })}
      onStart={onStart}
      onPlay={onPlay}
      onOpponentTurn={vitest.fn()}
      onScore={onScore}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))
  fireEvent.click(await screen.findByRole('button', { name: 'Next Round' }))

  expect(screen.getByText('🐵 1')).toBeTruthy()
  expect(screen.getByText('🤖 0')).toBeTruthy()
})

test('when a player reaches 11 with a unique top score, return to title through onReset', async () => {
  const onScore = vitest.fn(() => [
    { playerId: 0, total: 2, details: [] },
    { playerId: 1, total: 0, details: [] },
  ])
  const onReset = vitest.fn()

  render(
    <Scopa
      playerId={0}
      state={testGame({
        state: 'stop',
        score: [11, 10],
        players: [
          { id: 0, hand: [], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
      })}
      onReset={onReset}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={onScore}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Back to Title Screen' }))

  expect(onReset).toHaveBeenCalled()
})

test('the header Scopa button calls onBack, not onReset, when both are provided', async () => {
  const onReset = vitest.fn()
  const onBack = vitest.fn()

  render(
    <Scopa
      playerId={0}
      state={testGame()}
      onReset={onReset}
      onBack={onBack}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Scopa' }))

  expect(onBack).toHaveBeenCalledOnce()
  expect(onReset).not.toHaveBeenCalled()
})

test('the header Scopa button falls back to onReset when no onBack is provided', async () => {
  const onReset = vitest.fn()

  render(
    <Scopa
      playerId={0}
      state={testGame()}
      onReset={onReset}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Scopa' }))

  expect(onReset).toHaveBeenCalledOnce()
})

test('when all top scores are tied at 11, keep playing next round', async () => {
  const onScore = vitest.fn(() => [
    { playerId: 0, total: 2, details: [] },
    { playerId: 1, total: 2, details: [] },
  ])

  render(
    <Scopa
      playerId={0}
      state={testGame({
        state: 'stop',
        score: [11, 11],
        players: [
          { id: 0, hand: [], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
      })}
      onStart={vitest.fn()}
      onPlay={vitest.fn()}
      onOpponentTurn={vitest.fn()}
      onScore={onScore}
    />,
  )

  expect(screen.getByRole('button', { name: 'Next Round' })).toBeTruthy()
  expect(screen.getByText('End of Round')).toBeTruthy()
})

test('renders "Scopa!" when a player takes all cards on the table', async () => {
  render(
    <Scopa
      playerId={0}
      state={{
        state: 'play',
        turn: 0,
        firstPlayer: 0,
        score: [0, 0],
        players: [
          { id: 0, hand: [denari(5)], pile: [], scope: 0 },
          { id: 1, hand: [denari(1)], pile: [], scope: 0 },
        ],
        pile: [],
        table: [denari(2), denari(3)],
        lastTaken: [],
      }}
      onPlay={() =>
        Ok({
          state: 'play',
          turn: 1,
          firstPlayer: 1,
          score: [0, 0],
          players: [
            { id: 0, hand: [], pile: [denari(2), denari(3), denari(5)], scope: 1 },
            { id: 1, hand: [denari(1)], pile: [], scope: 0 },
          ],
          pile: [],
          table: [],
          lastTaken: [denari(2), denari(3)],
        })
      }
      onOpponentTurn={async () => ({ card: denari(1), take: [] })}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: cn(5, Suit.DENARI) }))

  expect(screen.getByText('Scopa!')).toBeTruthy()
})

test('tapping a hand card with multiple valid combos enters aim mode without playing', async () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [denari(5)], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    table: [coppe(2), coppe(3), spade(1), spade(4)],
  })
  const onPlay = vitest.fn(() => Ok(testGame()))

  render(<Scopa playerId={0} state={initialState} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(screen.getByRole('button', { name: cn(5, Suit.DENARI) }))

  expect(onPlay).not.toHaveBeenCalled()
})

test('second tap on aimed card with a valid selection plays the card', async () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [denari(5)], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    table: [coppe(2), coppe(3), spade(1), spade(4)],
  })
  const onPlay = vitest.fn(() => Ok(testGame()))

  render(<Scopa playerId={0} state={initialState} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(screen.getByRole('button', { name: cn(5, Suit.DENARI) }))
  fireEvent.click(screen.getByRole('checkbox', { name: cn(2, Suit.COPPE) }))
  fireEvent.click(screen.getByRole('checkbox', { name: cn(3, Suit.COPPE) }))
  fireEvent.click(screen.getByRole('button', { name: cn(5, Suit.DENARI) }))

  expect(onPlay).toHaveBeenCalledWith({ card: denari(5), take: [coppe(2), coppe(3)] }, initialState)
})

test('second tap on aimed card with empty selection cancels aim mode', async () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [denari(5)], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    table: [coppe(2), coppe(3), spade(1), spade(4)],
  })
  const onPlay = vitest.fn(() => Ok(testGame()))

  render(<Scopa playerId={0} state={initialState} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(screen.getByRole('button', { name: cn(5, Suit.DENARI) }))
  fireEvent.click(screen.getByRole('button', { name: cn(5, Suit.DENARI) }))

  expect(onPlay).not.toHaveBeenCalled()
})

test('tapping a different hand card while in aim mode switches to that card', async () => {
  const initialState = testGame({
    players: [
      { id: 0, hand: [denari(5), denari(1)], pile: [], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ],
    table: [coppe(2), coppe(3), spade(1), spade(4)],
  })
  const onPlay = vitest.fn(() => Ok(testGame()))

  render(<Scopa playerId={0} state={initialState} onPlay={onPlay} onOpponentTurn={vitest.fn()} onScore={() => []} />)

  fireEvent.click(screen.getByRole('button', { name: cn(5, Suit.DENARI) }))
  fireEvent.click(screen.getByRole('button', { name: cn(1, Suit.DENARI) }))

  expect(onPlay).toHaveBeenCalledWith({ card: denari(1), take: [spade(1)] }, initialState)
})

test('does not render "Scopa!" when a player does not take all cards on the table', async () => {
  render(
    <Scopa
      playerId={0}
      state={{
        state: 'play',
        turn: 0,
        firstPlayer: 0,
        score: [0, 0],
        players: [
          { id: 0, hand: [bastoni(2)], pile: [], scope: 0 },
          { id: 1, hand: [denari(1)], pile: [], scope: 0 },
        ],
        pile: [],
        table: [denari(2), denari(3)],
        lastTaken: [],
      }}
      onPlay={() =>
        Ok({
          state: 'play',
          turn: 1,
          firstPlayer: 1,
          score: [0, 0],
          players: [
            { id: 0, hand: [], pile: [denari(2), bastoni(5)], scope: 0 },
            { id: 1, hand: [denari(1)], pile: [], scope: 0 },
          ],
          pile: [],
          table: [denari(3)],
          lastTaken: [denari(2)],
        })
      }
      onOpponentTurn={async () => ({ card: denari(1), take: [] })}
      onScore={vitest.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: cn(2, Suit.BASTONI) }))

  expect(screen.queryByText('Scopa!')).not.toBeTruthy()
})
