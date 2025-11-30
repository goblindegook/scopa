import styled from '@emotion/styled/base'
import type React from 'react'
import type { Score } from '../engine/scores'

const WinnerTitle = styled('h2')`
  margin: 0;
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-height: 600px) {
    font-size: 1.25rem;
  }
`

const Board = styled('table')`
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.5rem;
  min-width: 25vw;
  padding: 1rem;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-spacing: 0;
  overflow: hidden;

  @media (max-height: 600px) {
    font-size: 0.875rem;
    padding: 0.5rem;
  }
`

const PlayerHeader = styled('th')`
  font-weight: 600;
  padding: 1rem;
  text-align: center;
  text-transform: uppercase;

  @media (max-height: 600px) {
    padding: 0.5rem;
  }
`

const RowHeader = styled('th')`
  padding: 1rem;
  text-align: left;
  font-weight: 600;

  @media (max-height: 600px) {
    padding: 0.5rem;
  }
`

const Cell = styled('td')`
  color: white;
  padding: 1rem;
  text-align: center;

  @media (max-height: 600px) {
    padding: 0.5rem;
  }
`

const ScoreCell = styled(Cell)<{ winner?: boolean }>`
  position: relative;
  opacity: ${({ winner }) => (winner ? 1 : 0.8)};
  font-weight: ${({ winner }) => (winner ? 'bold' : 'normal')};
`

const CellContent = styled('div')`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 0.75rem;

  @media (max-height: 600px) {
    gap: 0.5rem;
  }
`

const ValueText = styled('span')`
  font-size: 0.875rem;
  justify-self: end;
`

const PointIndicator = styled('span')`
  color: #4ade80;
  font-weight: 600;
  justify-self: start;
`

const TotalRow = styled('tr')`
  font-weight: bold;
  font-size: 1.25rem;
  text-transform: uppercase;
`

interface ScoreBoardProps {
  scores: readonly Score[]
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores }) => {
  if (scores.length === 0) return null

  const maxTotal = Math.max(...scores.map(({ total }) => total))
  const minTotal = Math.min(...scores.map(({ total }) => total))
  const isDraw = maxTotal === minTotal
  const winner = scores.find(({ total }) => total === maxTotal)

  return (
    <>
      {isDraw ? (
        <WinnerTitle>It's a draw</WinnerTitle>
      ) : (
        winner && <WinnerTitle>Player {winner.playerId + 1} Wins</WinnerTitle>
      )}
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
            const isScope = detail.label === 'Scope'
            return (
              <tr key={detail.label}>
                <RowHeader scope="row">{detail.label}</RowHeader>
                {scores.map(({ playerId, details }) => {
                  const isWinner = winners.has(playerId)
                  const value = details[index]?.value ?? 0
                  return (
                    <ScoreCell
                      key={`${playerId}-${detail.label}`}
                      winner={isWinner}
                      {...(isWinner && !isScope && { 'aria-label': `${value}, bonus point awarded` })}
                    >
                      {!isScope ? (
                        <CellContent>
                          <ValueText>{value}</ValueText>
                          {isWinner && <PointIndicator>+1</PointIndicator>}
                        </CellContent>
                      ) : (
                        value
                      )}
                    </ScoreCell>
                  )
                })}
              </tr>
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
    </>
  )
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
