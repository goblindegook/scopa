import React from 'react'
import styled from '@emotion/styled'
import { Suit } from '../engine/cards'

const VALUES: { [key: number]: string } = {
  1: 'Asso',
  2: 'Due',
  3: 'Tre',
  4: 'Quattro',
  5: 'Cinque',
  6: 'Sei',
  7: 'Sette',
  8: 'Fante',
  9: 'Cavallo',
  10: 'Re'
}

const SUITS = {
  [Suit.BASTONI]: 'bastoni',
  [Suit.COPPE]: 'coppe',
  [Suit.DENARI]: 'denari',
  [Suit.SPADE]: 'spade'
}

function name(value: number, suit: Suit) {
  return `${VALUES[value]} di ${SUITS[suit]}`
}

const Face = styled('img')`
  height: 13.5vw;
  width: 7.5vw;
  border-radius: 0.75vw;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
`

const Back = styled('div')`
  height: 13.5vw;
  width: 7.5vw;
  border-radius: 0.75vw;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  background-color: blue;
  border: 1px solid white;
`

type CardProps = {
  className?: string
  index?: number
  hidden?: boolean
  suit?: Suit
  value?: number
}

export const Card = ({ className, hidden = false, value, suit }: CardProps) =>
  hidden || value === undefined || suit === undefined ? (
    <Back className={className} />
  ) : (
    <Face
      className={className}
      src={require(`./assets/${SUITS[suit]}/${value}.jpg`)}
      title={name(value, suit)}
      alt={name(value, suit)}
    />
  )
