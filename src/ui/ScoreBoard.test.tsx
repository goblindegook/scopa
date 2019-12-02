import React from 'react'
import { render } from '@testing-library/react'
import { ScoreBoard } from './ScoreBoard'
import { Score } from '../engine/scores'

test('renders player names and scores', () => {
  const scores: Score[] = [
    { details: [], total: 3 },
    { details: [], total: 4 }
  ]

  const { getByText } = render(<ScoreBoard scores={scores} />)

  expect(getByText('Player 1')).toBeTruthy()
  expect(getByText('3')).toBeTruthy()
  expect(getByText('Player 2')).toBeTruthy()
  expect(getByText('4')).toBeTruthy()
})
