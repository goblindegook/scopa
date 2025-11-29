import styled from '@emotion/styled'
import type React from 'react'
import type { Card as CardType } from '../engine/cards'
import { Stack } from './Stack'

const PlayerArea = styled('section')`
  background-color: green;
  display: grid;
  grid-gap: 0;
  grid-template-columns: auto 20vw;
  justify-items: center;
  padding-left: 20vw;
  flex-shrink: 0;
  min-height: 200px;
`

const PlayerHand = styled('div')`
  min-height: 150px;
  padding: 2rem;
`

const PlayerPile = styled(Stack)`
  margin: 3rem;
`

export const PlayerCard = styled('button')`
  background-color: transparent;
  border: none;
  padding: 1rem;
  transition: transform 0.2s ease-in;

  &:focus,
  &:hover {
    outline: 0;
    transform: translateY(-20px);
    border-radius: 1rem;
  }

  &:focus {
    border: 2px solid red;
    padding: calc(1rem - 2px);
  }
`

type PlayerProps = React.PropsWithChildren<{
  pile: readonly CardType[]
  index: number
}>

export const Player: React.FC<PlayerProps> = ({ children, index, pile }) => (
  <PlayerArea>
    <PlayerHand>{children}</PlayerHand>
    <PlayerPile pile={pile} title={`Player ${index + 1} pile: ${pile.length} cards`} />
  </PlayerArea>
)
