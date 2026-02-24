import styled from '@emotion/styled'
import React from 'react'
import type { Card as CardType } from '../engine/cards'
import { Card } from './Card'

const StackArea = styled('aside')`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`

const StackedCard = styled(Card)`
  transition: transform 0.1s ease-in;
  position: absolute;
  z-index: ${({ index }) => index};
  top: calc(50% - ${({ index }) => (index ?? 0) * 2}px);
  left: 50%;
  transform: translate(-50%, -50%);

  &:hover ~ * {
    transform: translate(-50%, calc(-50% - 1rem));
  }
`

interface StackProps {
  className?: string
  pile: readonly CardType[]
  title: string
}

export const Stack = React.forwardRef<HTMLElement, StackProps>(({ className, pile, title }, ref) => (
  <StackArea ref={ref} className={className} title={title}>
    {pile.map((card, index) => (
      <StackedCard key={card.join('-')} faceDown index={index} card={card} />
    ))}
  </StackArea>
))
Stack.displayName = 'Stack'
