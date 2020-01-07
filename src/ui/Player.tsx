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

export const PlayerCard = styled('button')`
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
