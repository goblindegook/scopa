import React from 'react'
import styled from '@emotion/styled'
import { Stack } from './Stack'

const PlayerArea = styled('section')`
  background-color: green;
  display: grid;
  grid-gap: 0;
  grid-template-columns: auto 20vw;
  justify-items: center;
  padding-left: 20vw;
`

const PlayerPile = styled(Stack)`
  margin: 1rem;
  /* transform: perspective(1500px) rotateX(30deg) rotateY(0deg) rotateZ(0deg) scale(1); */
`

type PlayerProps = React.PropsWithChildren<{
  pile: number
  index: number
}>

export const Player = ({ children, index, pile }: PlayerProps) => (
  <PlayerArea>
    <div>{children}</div>
    <PlayerPile size={pile} title={`Player ${index + 1} pile: ${pile} cards`} />
  </PlayerArea>
)
