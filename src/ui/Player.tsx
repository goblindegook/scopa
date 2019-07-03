import React from 'react'
import styled from '@emotion/styled'
import { Deck, Card as CardType } from '../engine/cards'
import { Card } from './Card'
import { Stack } from './Stack'

const PlayerArea = styled('section')`
  background-color: green;
  display: grid;
  grid-gap: 0;
  grid-template-columns: auto 20vw;
  justify-items: center;
  padding-left: 20vw;
`

const PlayerPile = styled(Stack)`
  margin: 1rem;
  /* transform: perspective(1500px) rotateX(30deg) rotateY(0deg) rotateZ(0deg) scale(1); */
`

const PlayerCard = styled('button')`
  background-color: transparent;
  border: none;
  padding: 1rem;
  margin: 0.1rem;
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

interface PlayerProps {
  hand: Deck
  pile: number
  index: number
  disabled?: boolean
  onPlay: (card: CardType) => void
}

export const Player = ({
  disabled,
  hand,
  index,
  pile,
  onPlay
}: PlayerProps) => (
  <PlayerArea>
    <div>
      {hand.map(([value, suit]) => (
        <PlayerCard
          disabled={disabled}
          key={`${value}:${suit}`}
          onClick={() => onPlay([value, suit])}
        >
          <Card value={value} suit={suit} />
        </PlayerCard>
      ))}
    </div>
    <PlayerPile size={pile} title={`Player ${index + 1} pile: ${pile} cards`} />
  </PlayerArea>
)
