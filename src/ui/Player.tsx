import React from 'react'
import styled from '@emotion/styled'
import { Deck, Card as CardType } from '../engine/cards'
import { Card } from './Card'

const PlayerCard = styled('button')`
  background-color: transparent;
  border: none;
  padding: 1rem;
  margin: 0.25rem;
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

const PlayerArea = styled('section')`
  background-color: green;
  padding: 1rem;
  display: grid;
  justify-items: center;
`

type PlayerProps = {
  hand: Deck
  disabled?: boolean
  onPlay: (card: CardType) => void
}

export const Player = ({ disabled, hand, onPlay }: PlayerProps) => (
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
  </PlayerArea>
)
