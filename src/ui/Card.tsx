import React from 'react'
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

export const Card = ({ value, suit }: CardProps) => (
  <img
    src={require(`./assets/${SUITS[suit]}/${value}.jpg`)}
    title={name(value, suit)}
  />
)
