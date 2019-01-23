import React from 'react'
import styled from '@emotion/styled'
import { range } from 'ramda'
import { Card } from './Card'
import { Stack } from './Stack'

const OpponentArea = styled('section')`
  background-color: darkgreen;
  display: grid;
  grid-template-columns: auto 20vw;
  justify-items: center;
  padding-left: 20vw;
`

const OpponentPile = styled(Stack)`
  /* transform: perspective(1500px) rotateX(30deg) rotateY(0deg) rotateZ(0deg) scale(1); */
`

const OpponentCard = styled(Card)`
  display: inline-block;
  margin: 0.5rem;
`

type OpponentProps = {
  hand: number
  pile: number
  index: number
}

export const Opponent = ({ hand, index, pile }: OpponentProps) => (
  <OpponentArea>
    <aside>
      {range(0, hand).map(key => (
        <OpponentCard key={`${index}-${key}`} hidden={true} />
      ))}
    </aside>
    <OpponentPile
      size={pile}
      title={`Player ${index + 1} pile: ${pile} cards`}
    />
  </OpponentArea>
)
