import styled from '@emotion/styled/base'
import type React from 'react'
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

const RowHeader = styled('th')`
  padding: 1rem;
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
  font-weight: bold;
  font-size: 1.5rem;
  text-transform: uppercase;
`

interface ScoreBoardProps {
  scores: readonly Score[]
}

const getWinners = (scores: readonly Score[], index: number): Set<number> => {
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

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores }) => {
  if (scores.length === 0) return null
  return (
    <Board aria-label="Game scoreboard">
      <caption className="sr-only">Game scoreboard showing scores for each player</caption>
      <thead>
        <tr>
          <th scope="col" className="sr-only">
            Score category
          </th>
          {scores.map(({ playerId }) => (
            <PlayerHeader key={`player-header-${playerId}`} scope="col">
              Player {playerId + 1}
            </PlayerHeader>
          ))}
        </tr>
      </thead>
      <tbody>
        {scores[0].details.map((detail, index) => {
          const winners = getWinners(scores, index)
          return (
            <DetailRow key={detail.label}>
              <RowHeader scope="row">{detail.label}</RowHeader>
              {scores.map(({ playerId, details }) => {
                const CellComponent = winners.has(playerId) ? WinnerCell : Cell
                const value = details[index]?.value ?? 0
                return (
                  <CellComponent
                    key={`${playerId}-${detail.label}`}
                    {...(winners.has(playerId) && { 'aria-label': `${value}, point awarded` })}
                  >
                    {value}
                  </CellComponent>
                )
              })}
            </DetailRow>
          )
        })}
        <TotalRow>
          <RowHeader scope="row">Total</RowHeader>
          {scores.map(({ playerId, total }) => (
            <Cell key={`player-total-${playerId}`}>{total}</Cell>
          ))}
        </TotalRow>
      </tbody>
    </Board>
  )
}
