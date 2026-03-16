import styled from '@emotion/styled'
import React from 'react'
import type { Card as CardType } from '../engine/cards'
import { Card } from './Card'
import { Stack } from './Stack'

export const OPPONENT_SCALE = 2 / 3

const CardWrapper = styled.div<{ opacity?: number }>`
  display: inline-block;
  padding: 0.5rem;
  opacity: ${({ opacity = 1 }) => opacity};
  transform: scale(${OPPONENT_SCALE});

  @media (max-height: 600px) {
    transform: scale(${OPPONENT_SCALE * 0.6});
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
  flex: 0 0 20vh;
  height: 20vh;
`

const OpponentHand = styled('aside')`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
`

const OpponentPile = styled(Stack)`
  transform: scale(${OPPONENT_SCALE});

  @media (max-height: 600px) {
    transform: scale(${OPPONENT_SCALE * 0.6});
  }
`

type OpponentProps = React.PropsWithChildren<{
  pile: readonly CardType[]
  index: number
}>

export const Opponent = React.forwardRef<HTMLElement, OpponentProps>(({ children, index, pile }, ref) => (
  <OpponentArea>
    <OpponentHand data-testid={`p${index}-hand`}>{children}</OpponentHand>
    <OpponentPile ref={ref} pile={pile} title={`Player ${index + 1} pile: ${pile.length} cards`} />
  </OpponentArea>
))
Opponent.displayName = 'Opponent'
