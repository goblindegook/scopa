import { range } from '@pacote/array'

export enum Suit {
  DENARI = 0,
  COPPE = 1,
  BASTONI = 2,
  SPADE = 3,
}

export type Card = [number, Suit]

export type Deck = readonly Card[]

export function deck(): Deck {
  const suits = [Suit.DENARI, Suit.COPPE, Suit.BASTONI, Suit.SPADE]
  const cards = suits.reduce<Deck>(
    (all, suit) => all.concat(range(1, 11).map<Card>((v) => [v, suit])),
    [],
  )

  return cards
}
