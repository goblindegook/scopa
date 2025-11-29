import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import type { Score } from '../engine/scores'
import { ScoreBoard } from './ScoreBoard'

afterEach(() => {
  cleanup()
})

const getCellsByRowHeader = (table: HTMLElement, headerName: string) => {
  const rowHeader = within(table).getByRole('rowheader', { name: headerName })
  return within(rowHeader.closest('tr') ?? rowHeader).getAllByRole('cell')
}

test('renders player names and scores', () => {
  const scores: Score[] = [
    {
      playerId: 0,
      details: [
        { label: 'Scope', value: 2, cards: [] },
        { label: 'Captured', value: 20, cards: [] },
        { label: 'Denari', value: 5, cards: [] },
        { label: 'Sette Bello', value: 1, cards: [] },
        { label: 'Primiera', value: 45, cards: [] },
      ],
      total: 3,
    },
    {
      playerId: 1,
      details: [
        { label: 'Scope', value: 1, cards: [] },
        { label: 'Captured', value: 20, cards: [] },
        { label: 'Denari', value: 6, cards: [] },
        { label: 'Sette Bello', value: 0, cards: [] },
        { label: 'Primiera', value: 50, cards: [] },
      ],
      total: 4,
    },
  ]

  render(<ScoreBoard scores={scores} />)

  expect(screen.getByText('Player 2 Wins')).toBeTruthy()

  expect(screen.getByText('Game scoreboard showing scores for each player')).toBeTruthy()
  expect(screen.getByText('Player 1')).toBeTruthy()
  expect(screen.getByText('Player 2')).toBeTruthy()

  const table = screen.getByRole('table', { name: 'Game scoreboard' })

  const scopeRowCells = getCellsByRowHeader(table, 'Scope')
  expect(scopeRowCells[0]).toHaveTextContent('2')
  expect(scopeRowCells[1]).toHaveTextContent('1')

  const capturedRowCells = getCellsByRowHeader(table, 'Captured')
  expect(capturedRowCells[0]).toHaveTextContent(/20.*\+1/)
  expect(capturedRowCells[0]).toHaveAttribute('aria-label', '20, bonus point awarded')
  expect(capturedRowCells[1]).toHaveTextContent(/20.*\+1/)
  expect(capturedRowCells[1]).toHaveAttribute('aria-label', '20, bonus point awarded')

  const denariRowCells = getCellsByRowHeader(table, 'Denari')
  expect(denariRowCells[0]).toHaveTextContent('5')
  expect(denariRowCells[1]).toHaveTextContent(/6.*\+1/)
  expect(denariRowCells[1]).toHaveAttribute('aria-label', '6, bonus point awarded')

  const setteBelloRowCells = getCellsByRowHeader(table, 'Sette Bello')
  expect(setteBelloRowCells[0]).toHaveTextContent(/1.*\+1/)
  expect(setteBelloRowCells[0]).toHaveAttribute('aria-label', '1, bonus point awarded')
  expect(setteBelloRowCells[1]).toHaveTextContent('0')

  const primieraRowCells = getCellsByRowHeader(table, 'Primiera')
  expect(primieraRowCells[0]).toHaveTextContent('45')
  expect(primieraRowCells[1]).toHaveTextContent(/50.*\+1/)
  expect(primieraRowCells[1]).toHaveAttribute('aria-label', '50, bonus point awarded')

  const totalRowCells = getCellsByRowHeader(table, 'Total')
  expect(totalRowCells[0]).toHaveTextContent('3')
  expect(totalRowCells[1]).toHaveTextContent('4')
})

test(`renders "It's a draw" when all players have the same total score`, () => {
  const scores: Score[] = [
    { playerId: 0, details: [], total: 3 },
    { playerId: 1, details: [], total: 3 },
  ]

  render(<ScoreBoard scores={scores} />)

  expect(screen.getByText("It's a draw")).toBeTruthy()
})
