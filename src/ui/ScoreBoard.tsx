import styled from '@emotion/styled/base'
import type { Score } from '../engine/scores'

const Board = styled('table')`
  border: 1px solid white;
  min-width: 25vw;
  padding: 1rem;
`

const PlayerHeader = styled('th')`
  color: white;
  padding: 1rem;
  text-align: center;
`

const Cell = styled('td')`
  color: white;
  padding: 1rem;
  text-align: center;
`

const RowHeader = styled(Cell)`
  text-align: left;
`

interface ScoreBoardProps {
  scores: readonly Score[]
}

export const ScoreBoard = ({ scores }: ScoreBoardProps) => (
  <Board>
    <thead>
      <tr>
        <th />
        {scores.map(({ playerId }) => (
          <PlayerHeader key={`player-header-${playerId}`}>
            Player {playerId + 1}
          </PlayerHeader>
        ))}
      </tr>
    </thead>
    <tbody>
      <tr>
        <RowHeader>Score</RowHeader>
        {scores.map(({ playerId, total }) => (
          <Cell key={`player-score-${playerId}`}>{total}</Cell>
        ))}
      </tr>
    </tbody>
  </Board>
)
