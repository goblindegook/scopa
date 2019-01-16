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
  max-height: 30vh;
  max-width: 10vw;
  border-radius: 1rem;
  margin: 1rem;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
`

const Back = styled('img')`
  max-height: 30vh;
  max-width: 10vw;
  border-radius: 1rem;
  margin: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
`

type CardProps = {
  className?: string
  hidden?: false
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
    />
  )
