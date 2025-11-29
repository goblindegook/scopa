import styled from '@emotion/styled/base'
import type { Score } from '../engine/scores'

const Board = styled('table')`
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.5rem;
  min-width: 25vw;
  padding: 1rem;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
`

const PlayerHeader = styled('th')`
  color: white;
  font-weight: 600;
  padding: 1rem;
  text-align: center;
  font-weight: 600;
  text-transform: uppercase;
`

const Cell = styled('td')`
  color: white;
  padding: 1rem;
  text-align: center;
`

const RowHeader = styled(Cell)`
  text-align: left;
  font-weight: 600;
`

const DetailRow = styled('tr')`
  & td {
    opacity: 0.8;
  }
`

const WinnerCell = styled(Cell)`
  opacity: 1 !important;
  font-weight: bold;
`

const TotalRow = styled('tr')`
  text-transform: uppercase;
  & td {
    font-weight: bold;
    font-size: 1.5rem;
  }
`

interface ScoreBoardProps {
  scores: readonly Score[]
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores }) => {
  if (scores.length === 0) return null

  const getWinners = (index: number): Set<number> => {
    const values = scores.map(({ details: playerDetails }) => playerDetails[index]?.value ?? 0)
    const maxValue = Math.max(...values)
    if (maxValue === 0) return new Set()
    return new Set(
      scores
        .map(({ playerId, details: playerDetails }) =>
          (playerDetails[index]?.value ?? 0) === maxValue ? playerId : null,
        )
        .filter((id): id is number => id != null),
    )
  }

  return (
    <Board>
      <thead>
        <tr>
          <th />
          {scores.map(({ playerId }) => (
            <PlayerHeader key={`player-header-${playerId}`}>Player {playerId + 1}</PlayerHeader>
          ))}
        </tr>
      </thead>
      <tbody>
        {scores[0].details.map((detail, index) => {
          const winners = getWinners(index)
          return (
            <DetailRow key={detail.label}>
              <RowHeader>{detail.label}</RowHeader>
              {scores.map(({ playerId, details }) => {
                const CellComponent = winners.has(playerId) ? WinnerCell : Cell
                return <CellComponent key={`${playerId}-${detail.label}`}>{details[index]?.value ?? 0}</CellComponent>
              })}
            </DetailRow>
          )
        })}
        <TotalRow>
          <RowHeader>Total</RowHeader>
          {scores.map(({ playerId, total }) => (
            <Cell key={`player-total-${playerId}`}>{total}</Cell>
          ))}
        </TotalRow>
      </tbody>
    </Board>
  )
}
