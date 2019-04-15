import React from 'react'
import { cleanup, render } from 'react-testing-library'
import { ScoreBoard } from './ScoreBoard'
import { Score } from '../engine/scores'

beforeEach(cleanup)

test('renders player names and scores', () => {
  const scores: Score[] = [{ details: [], total: 3 }, { details: [], total: 4 }]

  const { getByText } = render(<ScoreBoard scores={scores} />)

  expect(getByText('Player 1')).toBeTruthy()
  expect(getByText('3')).toBeTruthy()
  expect(getByText('Player 2')).toBeTruthy()
  expect(getByText('4')).toBeTruthy()
})
