import React from 'react'
import styled from '@emotion/styled'
import { range } from 'ramda'
import { Card } from './Card'

const StackArea = styled('aside')`
  position: relative;
`

const StackedCard = styled(Card)`
  transition: transform 0.1s ease-in;
  position: absolute;
  z-index: ${({ index = 1 }) => index};
  top: -${({ index = 0 }) => index * 2}px;
  left: 0;

  &:hover ~ * {
    transform: translateY(-1rem);
  }
`

type StackProps = {
  className?: string
  size: number
  title: string
}

export const Stack = ({ className, size, title }: StackProps) => (
  <StackArea className={className} title={title}>
    {range(0, size).map(i => (
      <StackedCard hidden={true} index={i} key={`player-pile-${i}`} />
    ))}
  </StackArea>
)
