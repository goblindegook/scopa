import React from 'react'
import styled from '@emotion/styled'
import { Card as CardType } from '../engine/cards'
import { Card } from './Card'
import { Stack } from './Stack'

export const OpponentCard = styled(Card)`
  display: inline-block;
  margin: 0.5rem;
`

const OpponentArea = styled('section')`
  background-color: darkgreen;
  display: grid;
  grid-template-columns: auto 20vw;
  justify-items: center;
  padding-left: 20vw;
`

const OpponentPile = styled(Stack)`
  margin: 1rem;
  /* transform: perspective(1500px) rotateX(30deg) rotateY(0deg) rotateZ(0deg) scale(1); */
`

type OpponentProps = React.PropsWithChildren<{
  pile: readonly CardType[]
  index: number
}>

export const Opponent = ({ children, index, pile }: OpponentProps) => (
  <OpponentArea>
    <aside data-testid={`p${index}-hand`}>{children}</aside>
    <OpponentPile
      pile={pile}
      title={`Player ${index + 1} pile: ${pile.length} cards`}
    />
  </OpponentArea>
)
