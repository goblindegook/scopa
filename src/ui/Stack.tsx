import React from 'react'
import styled from '@emotion/styled'
import { Card as CardType } from '../engine/cards'
import { Card } from './Card'

const StackArea = styled('aside')`
  position: relative;
`

const StackedCard = styled<typeof Card, { index: number }>(Card)`
  transition: transform 0.1s ease-in;
  position: absolute;
  z-index: ${({ index }) => index};
  top: -${({ index }) => index * 2}px;
  left: 0;

  &:hover ~ * {
    transform: translateY(-1rem);
  }
`

interface StackProps {
  className?: string
  pile: readonly CardType[]
  title: string
}

export const Stack = ({ className, pile, title }: StackProps) => (
  <StackArea className={className} title={title}>
    {pile.map((card, index) => (
      <StackedCard
        key={`${card.join('')}`}
        faceDown
        index={index}
        card={card}
      />
    ))}
  </StackArea>
)
