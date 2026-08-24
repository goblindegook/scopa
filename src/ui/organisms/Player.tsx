import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Card as CardType } from '../../engine/cards'
import { CapturedCount, Stack } from '../molecules/Stack'

const PlayerArea = styled('section')`
  background-color: var(--color-player-area);
  display: grid;
  grid-gap: 0;
  grid-template-columns: 1fr 20vw;
  justify-items: center;
  align-items: center;
  padding-left: 20vw;
  flex: 0 0 35vh;
`

const CompactPlayerArea = styled('section')`
  background-color: var(--color-player-area);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  flex: 0 0 35vh;
`

const PlayerHand = styled('div')<{ compact?: boolean }>`
  min-height: var(--card-height);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: ${({ compact }) => (compact ? '0' : 'var(--space-4)')};
`

export const FanCard = styled('div')<{ $fanIndex: number; $fanTotal: number }>`
  margin: 0 -26px;
  transform-origin: bottom center;
  transform: rotate(${({ $fanIndex, $fanTotal }) => ($fanIndex - ($fanTotal - 1) / 2) * 10}deg)
    translateY(${({ $fanIndex, $fanTotal }) => {
      if ($fanTotal <= 1) return 0
      const mid = ($fanTotal - 1) / 2
      const norm = ($fanIndex - mid) / mid
      return (norm ** 2 - 1) * 10
    }}px);
  transition: transform 0.2s ease-in;
  display: inline-block;
`

export const PlayerCard = styled('button')<{ $aimed?: boolean }>`
  background-color: transparent;
  border: none;
  border-radius: 0.75vw;
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
  pile: readonly CardType[]
  capturedCount?: number
  avatar: string
  compact?: boolean
  active?: boolean
  away?: boolean
}>

export const Player = React.forwardRef<HTMLElement, PlayerProps>(
  ({ children, avatar, pile, capturedCount = pile.length, compact, active = false, away = false }, ref) => {
    const { t } = useTranslation()

    if (compact) {
      return (
        <CompactPlayerArea>
          <PlayerHand compact aria-label={t('playerHand', { avatar })}>
            {children}
          </PlayerHand>
          <CapturedCount ref={ref} avatar={avatar} count={capturedCount} active={active} away={away} />
        </CompactPlayerArea>
      )
    }

    return (
      <PlayerArea>
        <PlayerHand aria-label={t('playerHand', { avatar })}>{children}</PlayerHand>
        <Stack ref={ref} pile={pile} title={t('playerPile', { avatar, count: capturedCount })} />
      </PlayerArea>
    )
  },
)
Player.displayName = 'Player'
