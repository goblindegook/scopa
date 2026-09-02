import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../atoms/Card'
import { PlayerPill } from '../molecules/PlayerPill'

export const OPPONENT_SCALE = 2 / 3

const CardWrapper = styled.div<{ opacity?: number }>`
  display: inline-block;
  padding: 0 var(--space-2);
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
  flex-wrap: wrap;
  justify-content: center;
  row-gap: var(--space-2);
  flex: 0 0 auto;
  padding: var(--space-2) 0;

  @media (orientation: portrait) {
    section {
      flex: 0 1 auto;
      min-width: 33%;
    }
  }
`

const OpponentArea = styled('section')`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  min-width: 0;

  @media (max-height: 600px) {
    gap: var(--space-2);
  }
`

const OpponentHand = styled('aside')`
  --card-width: calc(var(--card-base-width) * ${OPPONENT_SCALE});
  --card-height: calc(var(--card-base-width) * ${OPPONENT_SCALE} * 14 / 8);

  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--card-height);

  @media (max-height: 600px) {
    --card-width: calc(var(--card-base-width) * ${OPPONENT_SCALE * 0.6});
    --card-height: calc(var(--card-base-width) * ${OPPONENT_SCALE * 0.6} * 14 / 8);
  }
`

type OpponentProps = React.PropsWithChildren<{
  avatar: string
  active?: boolean
  away?: boolean
  captured?: number
  sweeps?: number
}>

export const Opponent = React.forwardRef<HTMLElement, OpponentProps>(
  ({ children, avatar, captured = 0, sweeps = 0, active = false, away = false }, ref) => {
    const { t } = useTranslation()

    return (
      <OpponentArea>
        <OpponentHand aria-label={t('playerHand', { avatar })}>{children}</OpponentHand>
        <PlayerPill ref={ref} avatar={avatar} captured={captured} sweeps={sweeps} active={active} away={away} />
      </OpponentArea>
    )
  },
)
Opponent.displayName = 'Opponent'
