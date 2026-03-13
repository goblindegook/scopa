import styled from '@emotion/styled'
import type React from 'react'
import type { Score } from '../engine/scores'
import { Button } from './Button'

const WinnerTitle = styled('h2')`
  margin: 0;
  padding-bottom: 1rem;
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  color: white;

  @media (max-height: 600px) {
    padding-bottom: 0.5rem;
    font-size: 1.25rem;
  }
`

const Board = styled('table')`
  margin: 0;
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
  font-size: 1.5rem;
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

const ScoreBoardStack = styled('section')`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  @media (max-height: 600px) {
    gap: 0.5rem;
  };
`

const RunningTotal = styled('p')`
  margin: 0;
  width: 100%;
  display: flex;
  gap: 1rem;
  @media (max-height: 600px) {
    gap: 0.5rem;
  };
`

const RunningTotalBox = styled('span')`
  flex: 1;
  min-width: 0;
  color: white;
  text-align: center;
  font-weight: 600;
  font-size: 2rem;
  line-height: 1;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.5rem;
  letter-spacing: 0.35rem;

  @media (max-height: 600px) {
    font-size: 1.8rem;
    padding: 0.5rem;
  }
`

interface ScoreBoardProps {
  scores: readonly Score[]
  title: string
  handWins: readonly [number, number]
  playerAvatars: readonly string[]
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores, title, handWins, playerAvatars }) => {
  if (scores.length === 0) return null

  return (
    <ScoreBoardStack>
      <WinnerTitle>{title}</WinnerTitle>
      <RunningTotal aria-label="Hands won">
        {playerAvatars.map((playerAvatar, index) => (
          <RunningTotalBox key={`running-total-${playerAvatar}`}>
            {playerAvatar} {handWins[index]}
          </RunningTotalBox>
        ))}
      </RunningTotal>
      <Board aria-label="Game scoreboard">
        <caption className="sr-only">Game scoreboard showing scores for each player</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Score category
            </th>
            {scores.map(({ playerId }) => (
              <PlayerHeader key={`player-header-${playerId}`} scope="col">
                {playerAvatars[playerId]}
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
    </ScoreBoardStack>
  )
}

const GameOverContainer = styled('main')`
  position: absolute;
  inset: 0;
  z-index: 10002;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.25);
`

const GameOverContent = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 2.5rem;
  max-width: 540px;
  width: 100%;

  @media (max-height: 600px) {
    padding: 1rem;
    gap: 1rem;
  }
`

interface GameOverProps {
  scores: readonly Score[]
  handWins: readonly [number, number]
  playerAvatars: string[]
  handWinner?: number | null
  gameWinner?: number | null
  onNextHand: () => void
  onReset: () => void
}

export const GameOver: React.FC<GameOverProps> = ({
  scores,
  gameWinner,
  handWinner,
  handWins,
  playerAvatars,
  onNextHand,
  onReset,
}) => (
  <GameOverContainer>
    <GameOverContent>
      <ScoreBoard
        scores={scores}
        title={
          handWinner == null
            ? "It's a draw"
            : gameWinner == null
              ? `${playerAvatars[handWinner]} wins the hand`
              : `${playerAvatars[gameWinner]} wins the game`
        }
        handWins={handWins}
        playerAvatars={playerAvatars}
      />
      <Button onClick={gameWinner == null ? onNextHand : onReset}>{gameWinner == null ? 'Next Hand' : 'OK'}</Button>
    </GameOverContent>
  </GameOverContainer>
)

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
