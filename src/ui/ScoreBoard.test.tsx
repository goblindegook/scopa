import React from 'react'
import { render, screen } from '@testing-library/react'
import { ScoreBoard } from './ScoreBoard'
import { Score } from '../engine/scores'

test('renders player names and scores', () => {
  const scores: Score[] = [
    { details: [], total: 3 },
    { details: [], total: 4 },
  ]

  render(<ScoreBoard scores={scores} />)

  expect(screen.getByText('Player 1')).toBeTruthy()
  expect(screen.getByText('3')).toBeTruthy()
  expect(screen.getByText('Player 2')).toBeTruthy()
  expect(screen.getByText('4')).toBeTruthy()
})
