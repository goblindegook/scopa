import React from 'react'
import styled from '@emotion/styled-base'
import { Score } from '../engine/scores'

const Board = styled('table')`
  border: 1px solid white;
  width: 20vw;
  padding: 1rem;
`

const PlayerHeader = styled('th')`
  color: white;
  padding: 1rem;
`

const RowHeader = styled('td')`
  color: white;
  padding: 1rem;
`

const Cell = styled('td')`
  color: white;
  padding: 1rem;
  text-align: right;
`

type ScoreBoardProps = {
  scores: ReadonlyArray<Score>
}

export const ScoreBoard = ({ scores = [] }: ScoreBoardProps) => (
  <Board>
    <thead>
      <tr>
        <th />
        {scores.map((_, index) => (
          <PlayerHeader key={`player-header-${index}`}>
            Player {index + 1}
          </PlayerHeader>
        ))}
      </tr>
    </thead>
    <tbody>
      <tr>
        <RowHeader>Score</RowHeader>
        {scores.map(({ score }, index) => (
          <Cell key={`player-score-${index}`}>{score}</Cell>
        ))}
      </tr>
    </tbody>
  </Board>
)
