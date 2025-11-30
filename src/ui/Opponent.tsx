import styled from '@emotion/styled'
import React from 'react'
import type { Card as CardType } from '../engine/cards'
import { Card } from './Card'
import { Stack } from './Stack'

const CardWrapper = styled.div<{ opacity?: number }>`
  display: inline-block;
  padding: 0.5rem;
  opacity: ${({ opacity = 1 }) => opacity};

  @media (max-height: 600px) {
    transform: scale(0.6);
  }
`

export const OpponentCard = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Card> & { opacity?: number }>(
  ({ opacity, ...props }, ref) => (
    <CardWrapper ref={ref} opacity={opacity}>
      <Card {...props} />
    </CardWrapper>
  ),
)
OpponentCard.displayName = 'OpponentCard'

const OpponentArea = styled('section')`
  display: grid;
  grid-template-columns: 1fr 20vw;
  padding-left: 20vw;
  max-height: 20vh;
`

const OpponentHand = styled('aside')`
  display: flex;
  align-items: center;
  justify-content: center;
`

const OpponentPile = styled(Stack)`

`

type OpponentProps = React.PropsWithChildren<{
  pile: readonly CardType[]
  index: number
}>

export const Opponent = ({ children, index, pile }: OpponentProps) => (
  <OpponentArea>
    <OpponentHand data-testid={`p${index}-hand`}>{children}</OpponentHand>
    <OpponentPile pile={pile} title={`Player ${index + 1} pile: ${pile.length} cards`} />
  </OpponentArea>
)
