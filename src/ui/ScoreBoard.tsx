import styled from '@emotion/styled'
import type React from 'react'
import { useTranslation } from 'react-i18next'
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
  width: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-spacing: 0;

  @media (max-height: 600px) {
    font-size: 0.875rem;
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
  opacity: ${({ winner }) => (winner ? 1 : 0.8)};
  font-weight: ${({ winner }) => (winner ? 'bold' : 'normal')};
`

const PointIndicator = styled('span')`
  color: #4ade80;
  font-weight: 600;
  margin-left: 0.5rem;
`

const TotalRow = styled('tr')`
  font-weight: bold;
  font-size: 1.25rem;
  text-transform: uppercase;
`

const ScoreBoardStack = styled('section')`
  width: 100%;
  min-width: 0;
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
    font-size: 1.5rem;
    padding: 0.5rem;
  }
`

interface ScoreBoardProps {
  scores: readonly Score[]
  title: string
  runningScore: readonly number[]
  playerAvatars: readonly string[]
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores, title, runningScore, playerAvatars }) => {
  const { t } = useTranslation()

  if (scores.length === 0) return null

  return (
    <ScoreBoardStack>
      <WinnerTitle>{title}</WinnerTitle>
      <RunningTotal aria-label={t('gameScore')}>
        {playerAvatars.map((playerAvatar, index) => (
          <RunningTotalBox key={`running-total-${playerAvatar}`}>
            {playerAvatar} {runningScore[index]}
          </RunningTotalBox>
        ))}
      </RunningTotal>
      <Board aria-label={t('gameScoreboard')}>
        <caption className="sr-only">{t('gameScoreboardCaption')}</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              {t('scoreCategory')}
            </th>
            {scores.map(({ playerId }) => (
              <PlayerHeader key={`player-header-${playerId}`} scope="col">
                {playerAvatars[playerId]}
              </PlayerHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {scores[0].details.map((detail, detailIndex) => {
            const winnerId = findWinner(scores, detailIndex)
            const isScope = detail.label === 'Scope'
            return (
              <tr key={detail.label}>
                <RowHeader scope="row">{t(`scores.${detail.label}`)}</RowHeader>
                {scores.map(({ playerId, details }) => {
                  const isWinner = winnerId === playerId
                  const value = details[detailIndex]?.value ?? 0
                  return (
                    <ScoreCell
                      key={`${detail.label}-${playerId}`}
                      winner={isWinner}
                      {...(isWinner && !isScope && { 'aria-label': t('bonusPoint', { value }) })}
                    >
                      {value}
                      {isWinner && !isScope && <PointIndicator>+1</PointIndicator>}
                    </ScoreCell>
                  )
                })}
              </tr>
            )
          })}
          <TotalRow>
            <RowHeader scope="row">{t('scores.Total')}</RowHeader>
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
  min-width: 0;
  gap: 2rem;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 3rem;
  max-width: 540px;
  width: 100%;

  @media (max-height: 600px) {
    gap: 1rem;
    padding: 2rem;
  }
`

interface GameOverProps {
  scores: readonly Score[]
  runningScore: readonly number[]
  playerAvatars: string[]
  winner?: number | null
  onNextRound: () => void
  onReset: () => void
}

export const GameOver: React.FC<GameOverProps> = ({
  scores,
  winner,
  runningScore,
  playerAvatars,
  onNextRound,
  onReset,
}) => {
  const { t } = useTranslation()

  const title = winner == null ? t('endOfRound') : t('winsGame', { avatar: playerAvatars[winner] })

  return (
    <GameOverContainer>
      <GameOverContent>
        <ScoreBoard scores={scores} title={title} runningScore={runningScore} playerAvatars={playerAvatars} />
        <Button onClick={winner == null ? onNextRound : onReset}>
          {winner == null ? t('nextRound') : t('backToTitle')}
        </Button>
      </GameOverContent>
    </GameOverContainer>
  )
}

const findWinner = (scores: readonly Score[], index: number): number => {
  const values = scores.map(({ details }) => details[index]?.value ?? 0)
  const maxValue = Math.max(...values)
  const winners = scores
    .map(({ playerId, details }) => (details[index]?.value === maxValue ? playerId : null))
    .filter((id) => id != null)
  return winners.length === 1 ? winners[0] : -1
}
