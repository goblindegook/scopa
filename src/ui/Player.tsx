import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Card as CardType } from '../engine/cards'
import { Stack } from './Stack'

const PlayerArea = styled('section')`
  background-color: green;
  display: grid;
  grid-gap: 0;
  grid-template-columns: 1fr 20vw;
  justify-items: center;
  align-items: center;
  padding-left: 20vw;
  flex: 0 0 35vh;
`

const PlayerHand = styled('div')`
  min-height: 150px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 1rem;
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

export const PlayerCard = styled('button')`
  background-color: transparent;
  border: none;
  border-radius: 0.75vw;
  overflow: hidden;
  transition: transform 0.2s ease-in;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:not(:disabled):focus,
  &:not(:disabled):hover {
    outline: 0;
    transform: translateY(-20px);
    border-radius: 1rem;
  }

  &:not(:disabled):focus {
    border: 2px solid red;
    padding: -2px;
  }
`

type PlayerProps = React.PropsWithChildren<{
  pile: readonly CardType[]
  avatar: string
}>

export const Player = React.forwardRef<HTMLElement, PlayerProps>(({ children, avatar, pile }, ref) => {
  const { t } = useTranslation()
  return (
    <PlayerArea>
      <PlayerHand>{children}</PlayerHand>
      <Stack ref={ref} pile={pile} title={t('playerPile', { avatar, count: pile.length })} />
    </PlayerArea>
  )
})
Player.displayName = 'Player'
