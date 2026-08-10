import styled from '@emotion/styled'
import type React from 'react'
import { useTranslation } from 'react-i18next'
import type { Score } from '../../engine/scores'
import { Button } from '../atoms/Button'
import { ModalOverlay, ModalPanel } from '../atoms/ModalOverlay'
import { ScoreBoard } from '../organisms/ScoreBoard'

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
  awaitingConfirmations?: boolean
  onNextRound: () => void
  onReset: () => void
}

export const GameOver: React.FC<GameOverProps> = ({
  scores,
  winner,
  runningScore,
  playerAvatars,
  awaitingConfirmations,
  onNextRound,
  onReset,
}) => {
  const { t } = useTranslation()

  const title = winner == null ? t('endOfRound') : t('winsGame', { avatar: playerAvatars[winner] })

  return (
    <ModalOverlay $absolute>
      <ModalPanel>
        <ScoreBoard scores={scores} title={title} runningScore={runningScore} playerAvatars={playerAvatars} />
        <Button onClick={winner == null ? onNextRound : onReset} disabled={awaitingConfirmations}>
          {winner == null ? t('nextRound') : t('backToTitle')}
        </Button>
        {awaitingConfirmations && <WaitingNotice role="status">{t('waitingForNextRound')}</WaitingNotice>}
      </ModalPanel>
    </ModalOverlay>
  )
}
