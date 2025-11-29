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

  expect(screen.getByText('Player 1')).toBeTruthy()
  expect(screen.getByText('Player 2')).toBeTruthy()

  const scopeCells = getRowByText('Scope')
  expect(scopeCells?.[1].textContent).toBe('2')
  expect(scopeCells?.[2].textContent).toBe('1')

  const capturedCells = getRowByText('Captured')
  expect(capturedCells?.[1].textContent).toBe('20')
  expect(capturedCells?.[2].textContent).toBe('20')

  const denariCells = getRowByText('Denari')
  expect(denariCells?.[1].textContent).toBe('5')
  expect(denariCells?.[2].textContent).toBe('6')

  const setteBelloCells = getRowByText('Sette Bello')
  expect(setteBelloCells?.[1].textContent).toBe('1')
  expect(setteBelloCells?.[2].textContent).toBe('0')

  const primieraCells = getRowByText('Primiera')
  expect(primieraCells?.[1].textContent).toBe('45')
  expect(primieraCells?.[2].textContent).toBe('50')

  const totalCells = getRowByText('Total')
  expect(totalCells?.[1].textContent).toBe('3')
  expect(totalCells?.[2].textContent).toBe('4')
})
