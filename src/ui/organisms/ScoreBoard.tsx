import styled from '@emotion/styled'
import type React from 'react'
import { useTranslation } from 'react-i18next'
import type { Score } from '../../engine/scores'
import { sideLabels } from '../sideLabels'

const Board = styled('table')`
  margin: 0;
  color: white;
  border: 1px solid var(--overlay-white-25);
  border-radius: var(--space-2);
  width: 100%;
  background-color: var(--overlay-white-05);
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
  padding: var(--space-4);
  text-align: center;
  text-transform: uppercase;

  @media (max-height: 600px) {
    padding: var(--space-2);
  }
`

const RowHeader = styled('th')`
  padding: var(--space-4);
  text-align: left;
  font-weight: 600;

  @media (max-height: 600px) {
    padding: var(--space-2);
  }
`

const Cell = styled('td')`
  color: white;
  padding: var(--space-4);
  text-align: center;

  @media (max-height: 600px) {
    padding: var(--space-2);
  }
`

const ScoreCell = styled(Cell)<{ winner?: boolean }>`
  opacity: ${({ winner }) => (winner ? 1 : 0.8)};
  font-weight: ${({ winner }) => (winner ? 'bold' : 'normal')};
`

const PointIndicator = styled('span')`
  color: var(--color-accent);
  font-weight: 600;
  margin-left: var(--space-2);
`

const TotalRow = styled('tr')`
  font-weight: bold;
  font-size: 1.25rem;
  text-transform: uppercase;
`

interface ScoreBoardProps {
  scores: readonly Score[]
  playerAvatars: readonly string[]
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores, playerAvatars }) => {
  const { t } = useTranslation()

  if (scores.length === 0) return null

  const labels = sideLabels(playerAvatars)

  return (
    <Board aria-label={t('gameScoreboard')}>
      <caption className="sr-only">{t('gameScoreboardCaption')}</caption>
      <thead>
        <tr>
          <th scope="col" className="sr-only">
            {t('scoreCategory')}
          </th>
          {scores.map(({ sideId }) => (
            <PlayerHeader key={`side-header-${sideId}`} scope="col">
              {labels[sideId]}
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
              {scores.map(({ sideId, details }) => {
                const isWinner = winnerId === sideId
                const value = details[detailIndex]?.value ?? 0
                return (
                  <ScoreCell
                    key={`${detail.label}-${sideId}`}
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
          {scores.map(({ sideId, total }) => (
            <Cell key={`side-total-${sideId}`}>{total}</Cell>
          ))}
        </TotalRow>
      </tbody>
    </Board>
  )
}

const findWinner = (scores: readonly Score[], index: number): number => {
  const values = scores.map(({ details }) => details[index]?.value ?? 0)
  const maxValue = Math.max(...values)
  const winners = scores
    .map(({ sideId, details }) => (details[index]?.value === maxValue ? sideId : null))
    .filter((id) => id != null)
  return winners.length === 1 ? winners[0] : -1
}
