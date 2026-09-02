import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../atoms/Card'
import { PlayerPill } from '../molecules/PlayerPill'

export const OPPONENT_SCALE = 2 / 3
export const PLAYER_SCALE = 1.25

const handCardSize = (scale: number) => `
  --card-width: calc(var(--card-base-width) * ${scale});
  --card-height: calc(var(--card-base-width) * ${scale} * 14 / 8);
`

const SeatArea = styled('section')<{ $own: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);

  ${({ $own }) =>
    $own
      ? `
    background-color: var(--color-player-area);
    flex: 0 0 auto;
    padding: var(--space-4);

    @media (orientation: portrait) {
      flex: 0 0 35%;
      padding: var(--space-2);
    }
  `
      : `
    flex: 1;
    min-width: 0;
  `}

  @media (max-height: 600px) {
    gap: var(--space-2);
  }
`

const SeatHand = styled('div')<{ $own: boolean }>`
  ${({ $own }) => handCardSize($own ? PLAYER_SCALE : OPPONENT_SCALE)}

  display: flex;
  justify-content: center;
  align-items: ${({ $own }) => ($own ? 'flex-end' : 'center')};
  min-height: var(--card-height);

  @media (max-height: 600px) {
    ${({ $own }) => handCardSize($own ? 1 : OPPONENT_SCALE * 0.6)}
  }
`

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

export const OpponentSeats = styled('div')`
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

export const FanCard = styled('div')<{ $fanIndex: number; $fanTotal: number }>`
  margin: 0 calc(var(--fan-overlap) * -1);
  transform-origin: bottom center;
  transform: rotate(calc(var(--fan-rotation) * ${({ $fanIndex, $fanTotal }) => $fanIndex - ($fanTotal - 1) / 2}))
    translateY(calc(var(--card-height) * ${({ $fanIndex, $fanTotal }) => {
      if ($fanTotal <= 1) return 0
      const mid = ($fanTotal - 1) / 2
      const norm = ($fanIndex - mid) / mid
      return ((norm ** 2 - 1) * 0.12).toFixed(4)
    }}));
  transition: transform 0.2s ease-in;
  display: inline-block;
`

export const PlayerCard = styled('button')<{ $aimed?: boolean }>`
  background-color: transparent;
  border: none;
  border-radius: calc(var(--card-width) * var(--card-radius-ratio));
  overflow: hidden;
  transition: transform 0.2s ease-in, box-shadow 0.2s ease-in, opacity 0.2s ease-in;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:not(:disabled):focus,
  &:not(:disabled):hover {
    outline: 0;
    transform: translateY(-20px);
    border-radius: var(--space-4);
  }

  &:not(:disabled):focus {
    outline: 2px solid var(--color-focus-danger);
    outline-offset: -2px;
  }

  ${({ $aimed }) =>
    $aimed &&
    `
    transform: translateY(-8px) scale(1.1);
    box-shadow: 0 0 0 3px var(--color-focus-ring), 0 12px 24px var(--overlay-black-40);
    border-radius: var(--space-4);
    `}
`

type SeatProps = React.PropsWithChildren<{
  avatar: string
  own?: boolean
  active?: boolean
  away?: boolean
  captured?: number
  sweeps?: number
}>

export const Seat = React.forwardRef<HTMLElement, SeatProps>(
  ({ children, avatar, own = false, captured = 0, sweeps = 0, active = false, away = false }, ref) => {
    const { t } = useTranslation()

    return (
      <SeatArea $own={own}>
        <SeatHand $own={own} aria-label={t('playerHand', { avatar })}>
          {children}
        </SeatHand>
        <PlayerPill ref={ref} avatar={avatar} captured={captured} sweeps={sweeps} active={active} away={away} />
      </SeatArea>
    )
  },
)
Seat.displayName = 'Seat'
