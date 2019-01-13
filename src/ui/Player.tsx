import React from 'react'
import styled from '@emotion/styled'
import { Deck, Card as CardType } from '../engine/cards'
import { Card } from './Card'

const PlayerCard = styled('button')`
  background-color: transparent;
  border: none;
  padding: 0;
  &:focus {
    border: 3px solid red;
    border-radius: 1rem;
    margin: -3px;
  }
`

const PlayerArea = styled('section')`
  background-color: green;
  padding: 1rem;
`

type PlayerProps = {
  hand: Deck
  onPlay: (card: CardType) => void
}

export const Player = ({ hand, onPlay }: PlayerProps) => (
  <PlayerArea>
    {hand.map(([value, suit]) => (
      <PlayerCard
        key={`${value}:${suit}`}
        onClick={() => onPlay([value, suit])}
      >
        <Card value={value} suit={suit} />
      </PlayerCard>
    ))}
  </PlayerArea>
)
