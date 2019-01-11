import React from 'react'
import styled from '@emotion/styled'
import { Suit } from '../engine/cards'

type CardProps = {
  value: number
  suit: Suit
}

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

const Image = styled('img')`
  max-height: 30vh;
  border-radius: 1rem;
  margin: 1rem;
`

export const Card = ({ value, suit }: CardProps) => (
  <Image
    src={require(`./assets/${SUITS[suit]}/${value}.jpg`)}
    title={name(value, suit)}
  />
)
