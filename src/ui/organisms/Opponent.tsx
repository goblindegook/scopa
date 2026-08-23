import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Card as CardType } from '../../engine/cards'
import { Card } from '../atoms/Card'
import { CapturedCount, Stack } from '../molecules/Stack'

export const OPPONENT_SCALE = 2 / 3

const CardWrapper = styled.div<{ opacity?: number }>`
  display: inline-block;
  padding: var(--space-2);
  opacity: ${({ opacity = 1 }) => opacity};
`

export const OpponentCard = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Card> & { opacity?: number }>(
  ({ opacity, ...props }, ref) => (
    <CardWrapper ref={ref} opacity={opacity}>
      <Card {...props} />
    </CardWrapper>
  ),
)
OpponentCard.displayName = 'OpponentCard'

export const Opponents = styled('div')`
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  height: 20vh;
`

const OpponentArea = styled('section')`
  display: grid;
  flex: 1;
  grid-template-columns: 1fr 10vw;
  height: 20vh;
  padding: 0 0 0 10vw;
`

const CompactOpponentArea = styled('section')`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  height: 20vh;
`

const OpponentHand = styled('aside')<{ compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--card-height);
  transform: scale(${OPPONENT_SCALE});
  margin-bottom: ${({ compact }) => (compact ? `calc(var(--card-height) * ${(OPPONENT_SCALE - 1) / 2})` : '0')};

  @media (max-height: 600px) {
    transform: scale(${OPPONENT_SCALE * 0.6});
    margin-bottom: ${({ compact }) => (compact ? `calc(var(--card-height) * ${(OPPONENT_SCALE * 0.6 - 1) / 2})` : '0')};
  }
`

const OpponentPile = styled(Stack)`
  transform: scale(${OPPONENT_SCALE});

  @media (max-height: 600px) {
    transform: scale(${OPPONENT_SCALE * 0.6});
  }
`

type OpponentProps = React.PropsWithChildren<{
  pile: readonly CardType[]
  capturedCount?: number
  index: number
  avatar: string
  compact?: boolean
  active?: boolean
}>

export const Opponent = React.forwardRef<HTMLElement, OpponentProps>(
  ({ children, avatar, pile, capturedCount = pile.length, compact, active = false }, ref) => {
    const { t } = useTranslation()
    const hand = (
      <OpponentHand aria-label={t('playerHand', { avatar })} compact={compact}>
        {children}
      </OpponentHand>
    )

    if (compact) {
      return (
        <CompactOpponentArea>
          {hand}
          <CapturedCount ref={ref} avatar={avatar} count={capturedCount} active={active} />
        </CompactOpponentArea>
      )
    }

    return (
      <OpponentArea>
        {hand}
        <OpponentPile ref={ref} pile={pile} title={t('playerPile', { avatar, count: capturedCount })} />
      </OpponentArea>
    )
  },
)
Opponent.displayName = 'Opponent'
