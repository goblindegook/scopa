import styled from '@emotion/styled'
import React from 'react'
import type { Card as CardType } from '../engine/cards'
import { Card } from './Card'
import { Stack } from './Stack'

const CardWrapper = styled.div<{ opacity?: number }>`
  display: inline-block;
  padding: 0.5rem;
  opacity: ${({ opacity = 1 }) => opacity};
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
  grid-template-columns: auto 20vw;
  justify-items: center;
  padding-left: 20vw;
  flex-shrink: 0;
  min-height: 200px;
`

const OpponentHand = styled('aside')`
  min-height: 150px;
  padding: 2rem;
`

const OpponentPile = styled(Stack)`
  margin: 3rem;
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
