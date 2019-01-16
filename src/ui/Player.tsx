import React from 'react'
import styled from '@emotion/styled'
import { Deck, Card as CardType } from '../engine/cards'
import { Card } from './Card'

const PlayerCard = styled('button')`
  background-color: transparent;
  border: none;
  padding: 0;

  &:focus {
    outline: 0;
    border: 3px solid red;
    border-radius: 1rem;
    margin: -3px;
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
