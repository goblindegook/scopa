import styled from '@emotion/styled'
import type React from 'react'
import { useTranslation } from 'react-i18next'
import type { Score } from '../../engine/scores'
import { ActionButton } from '../atoms/Button'
import { ModalOverlay, ModalPanel } from '../atoms/ModalOverlay'
import { shortLandscape } from '../media'
import { ScoreBoard } from '../organisms/ScoreBoard'
import { sideLabels } from '../sideLabels'

const Summary = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  min-width: 0;

  & > button {
    margin-top: var(--space-4);
  }

  @media (max-height: 600px) {
    gap: var(--space-2);
  }

  ${shortLandscape} {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto 1fr;
    gap: clamp(var(--space-2), 4vh, var(--space-4)) clamp(var(--space-4), 3vw, var(--space-8));

    & > table {
      grid-column: 1;
      grid-row: 1 / -1;
    }

    & > button {
      align-self: end;
      margin-top: 0;
    }
  }
`

const RoundTitle = styled('h2')`
  margin: 0;
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  color: white;

  @media (max-height: 600px) {
    font-size: 1.25rem;
  }

  ${shortLandscape} {
    font-size: clamp(1.25rem, 7vh, 2.5rem);
  }
`

const RunningTotal = styled('p')`
  margin: 0;
  width: 100%;
  display: flex;
  gap: var(--space-4);

  @media (max-height: 600px) {
    gap: var(--space-2);
  }
`

const RunningTotalBox = styled('span')`
  flex: 1;
  min-width: 0;
  color: white;
  text-align: center;
  font-weight: 600;
  font-size: 1.25rem;
  line-height: 1;
  padding: var(--space-4);
  background-color: var(--overlay-white-05);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid var(--overlay-white-25);
  border-radius: var(--space-2);
  white-space: nowrap;
  letter-spacing: 0.1rem;

  @media (max-height: 600px) {
    padding: var(--space-2);
  }
`

const WaitingNotice = styled('p')`
  margin: 0;
  color: var(--overlay-white-75);
  font-size: 0.95rem;
  text-align: center;
`

interface GameOverProps {
  scores: readonly Score[]
  runningScore: readonly number[]
  playerAvatars: string[]
  winner?: number | null
  readonly waitingFor?: readonly string[]
  onNextRound: () => void
  onReset: () => void
}

export const GameOver: React.FC<GameOverProps> = ({
  scores,
  winner,
  runningScore,
  playerAvatars,
  waitingFor = [],
  onNextRound,
  onReset,
}) => {
  const { t } = useTranslation()

  const labels = sideLabels(playerAvatars)

  return (
    <ModalOverlay $absolute>
      <ModalPanel>
        <Summary>
          <RoundTitle>{winner == null ? t('endOfRound') : t('winsGame', { avatar: labels[winner] })}</RoundTitle>
          <RunningTotal aria-label={t('gameScore')}>
            {labels.map((label, index) => (
              <RunningTotalBox key={`running-total-${label}`}>
                {label} {runningScore[index]}
              </RunningTotalBox>
            ))}
          </RunningTotal>
          <ScoreBoard scores={scores} playerAvatars={playerAvatars} />
          <ActionButton onClick={winner == null ? onNextRound : onReset} disabled={waitingFor.length > 0}>
            {winner == null ? t('nextRound') : t('backToTitle')}
          </ActionButton>
          {waitingFor.length > 0 && (
            <WaitingNotice role="status">{t('waitingFor', { avatars: waitingFor.join(' ') })}</WaitingNotice>
          )}
        </Summary>
      </ModalPanel>
    </ModalOverlay>
  )
}
