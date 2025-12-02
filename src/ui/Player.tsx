import styled from '@emotion/styled'
import React from 'react'
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
  overflow: hidden;
`

const PlayerHand = styled('div')`
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`

export const PlayerCard = styled('button')`
  background-color: transparent;
  border: none;
  transition: transform 0.2s ease-in;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:focus,
  &:hover {
    outline: 0;
    transform: translateY(-20px);
    border-radius: 1rem;
  }

  &:focus {
    border: 2px solid red;
    padding: -2px;
  }
`

type PlayerProps = React.PropsWithChildren<{
  pile: readonly CardType[]
  index: number
}>

export const Player = React.forwardRef<HTMLElement, PlayerProps>(({ children, index, pile }, ref) => (
  <PlayerArea>
    <PlayerHand>{children}</PlayerHand>
    <Stack ref={ref} pile={pile} title={`Player ${index + 1} pile: ${pile.length} cards`} />
  </PlayerArea>
))
Player.displayName = 'Player'
