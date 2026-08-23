import styled from '@emotion/styled'
import type React from 'react'
import { useTranslation } from 'react-i18next'
import type { Score } from '../../engine/scores'
import { Button } from '../atoms/Button'
import { ModalOverlay, ModalPanel } from '../atoms/ModalOverlay'
import { ScoreBoard } from '../organisms/ScoreBoard'
import { sideLabels } from '../sideLabels'

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

  const title = winner == null ? t('endOfRound') : t('winsGame', { avatar: sideLabels(playerAvatars)[winner] })

  return (
    <ModalOverlay $absolute>
      <ModalPanel>
        <ScoreBoard scores={scores} title={title} runningScore={runningScore} playerAvatars={playerAvatars} />
        <Button onClick={winner == null ? onNextRound : onReset} disabled={waitingFor.length > 0}>
          {winner == null ? t('nextRound') : t('backToTitle')}
        </Button>
        {waitingFor.length > 0 && (
          <WaitingNotice role="status">{t('waitingFor', { avatars: waitingFor.join(' ') })}</WaitingNotice>
        )}
      </ModalPanel>
    </ModalOverlay>
  )
}
