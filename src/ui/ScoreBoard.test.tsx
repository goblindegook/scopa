import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import type { Score } from '../engine/scores'
import { ScoreBoard } from './ScoreBoard'

afterEach(() => {
  cleanup()
})

const getRowByText = (label: string) => screen.getByText(label).closest('tr')?.querySelectorAll('td')

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

  const table = screen.getByRole('table', { name: 'Game scoreboard' })
  expect(table).toBeTruthy()

  expect(screen.getByText('Game scoreboard showing scores for each player')).toBeTruthy()

  expect(screen.getByText('Player 1')).toBeTruthy()
  expect(screen.getByText('Player 2')).toBeTruthy()

  const playerHeaders = screen.getAllByRole('columnheader')
  expect(playerHeaders).toHaveLength(3)
  expect(playerHeaders[0]).toHaveAttribute('scope', 'col')
  expect(playerHeaders[1]).toHaveAttribute('scope', 'col')
  expect(playerHeaders[2]).toHaveAttribute('scope', 'col')

  const rowHeaders = screen.getAllByRole('rowheader')
  expect(rowHeaders.length).toBeGreaterThan(0)
  rowHeaders.forEach((header) => {
    expect(header).toHaveAttribute('scope', 'row')
  })

  const scopeCells = getRowByText('Scope')
  expect(scopeCells?.[0].textContent).toBe('2')
  expect(scopeCells?.[0]).toHaveAttribute('aria-label', '2, point awarded')
  expect(scopeCells?.[1].textContent).toBe('1')

  const capturedCells = getRowByText('Captured')
  expect(capturedCells?.[0].textContent).toBe('20')
  expect(capturedCells?.[0]).toHaveAttribute('aria-label', '20, point awarded')
  expect(capturedCells?.[1].textContent).toBe('20')
  expect(capturedCells?.[1]).toHaveAttribute('aria-label', '20, point awarded')

  const denariCells = getRowByText('Denari')
  expect(denariCells?.[0].textContent).toBe('5')
  expect(denariCells?.[1].textContent).toBe('6')
  expect(denariCells?.[1]).toHaveAttribute('aria-label', '6, point awarded')

  const setteBelloCells = getRowByText('Sette Bello')
  expect(setteBelloCells?.[0].textContent).toBe('1')
  expect(setteBelloCells?.[0]).toHaveAttribute('aria-label', '1, point awarded')
  expect(setteBelloCells?.[1].textContent).toBe('0')

  const primieraCells = getRowByText('Primiera')
  expect(primieraCells?.[0].textContent).toBe('45')
  expect(primieraCells?.[1].textContent).toBe('50')
  expect(primieraCells?.[1]).toHaveAttribute('aria-label', '50, point awarded')

  const totalCells = getRowByText('Total')
  expect(totalCells?.[0].textContent).toBe('3')
  expect(totalCells?.[1].textContent).toBe('4')
})
