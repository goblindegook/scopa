import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import type { Score } from '../engine/scores'
import { ScoreBoard } from './ScoreBoard'

afterEach(() => {
  cleanup()
})

test('renders player names and scores', () => {
  const scores: Score[] = [
    { playerId: 0, details: [], total: 3 },
    { playerId: 1, details: [], total: 4 },
  ]

  render(<ScoreBoard scores={scores} />)

  expect(screen.getByText('Player 1')).toBeTruthy()
  expect(screen.getByText('3')).toBeTruthy()
  expect(screen.getByText('Player 2')).toBeTruthy()
  expect(screen.getByText('4')).toBeTruthy()
})
