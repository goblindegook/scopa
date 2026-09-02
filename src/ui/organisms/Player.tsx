import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { PlayerPill } from '../molecules/PlayerPill'

const PlayerArea = styled('section')`
  background-color: var(--color-player-area);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  flex: 0 0 auto;
  padding: var(--space-4) var(--space-2) var(--space-2);

  @media (max-height: 600px) {
    gap: var(--space-2);
  }
`

const PlayerHand = styled('div')`
  min-height: var(--card-height);
  display: flex;
  align-items: flex-end;
  justify-content: center;
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
    border: 2px solid var(--color-focus-danger);
    padding: -2px;
  }

  ${({ $aimed }) =>
    $aimed &&
    `
    transform: translateY(-8px) scale(1.1);
    box-shadow: 0 0 0 3px var(--color-focus-ring), 0 12px 24px var(--overlay-black-40);
    border-radius: var(--space-4);
    `}

`

type PlayerProps = React.PropsWithChildren<{
  avatar: string
  active?: boolean
  away?: boolean
  captured?: number
  sweeps?: number
}>

export const Player = React.forwardRef<HTMLElement, PlayerProps>(
  ({ children, avatar, captured = 0, sweeps = 0, active = false, away = false }, ref) => {
    const { t } = useTranslation()

    return (
      <PlayerArea>
        <PlayerHand aria-label={t('playerHand', { avatar })}>{children}</PlayerHand>
        <PlayerPill ref={ref} avatar={avatar} captured={captured} sweeps={sweeps} active={active} away={away} />
      </PlayerArea>
    )
  },
)
Player.displayName = 'Player'
