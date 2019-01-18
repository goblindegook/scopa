import React from 'react'
import styled from '@emotion/styled'
import { range } from 'ramda'
import { Deck, Card as CardType } from '../engine/cards'
import { Card } from './Card'

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

const PlayerArea = styled('section')`
  background-color: green;
  display: grid;
  grid-gap: 1rem;
  grid-template-columns: auto 15vw;
  padding-left: 15vw;
  justify-items: center;
`

const StackedCard = styled(Card)`
  position: absolute;
  z-index: ${({ index = 1 }) => index};
  top: -${({ index = 0 }) => index * 2}px;
  left: 0;
`

const StackArea = styled('aside')`
  transform: perspective(1500px) rotateX(30deg) rotateY(0deg) rotateZ(0deg)
    scale(1);
  position: relative;
  justify-self: center;
  align-self: center;
  width: 15vw;
  height: 15vw;
`

type StackProps = {
  size: number
  title: string
}

const Stack = ({ size, title }: StackProps) => (
  <StackArea title={title}>
    {range(0, size).map(i => (
      <StackedCard hidden={true} index={i} key={`player-pile-${i}`} />
    ))}
  </StackArea>
)

type PlayerProps = {
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
    <Stack size={pile} title={`Player ${index + 1} pile: ${pile} cards`} />
  </PlayerArea>
)
