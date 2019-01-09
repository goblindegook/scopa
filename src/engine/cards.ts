import { range } from 'ramda'

export enum Suit {
  DENARI,
  COPPE,
  BASTONI,
  SPADE
}

export type Card = [number, Suit]

export type Deck = ReadonlyArray<Card>

function swap(i: number, j: number, cards: Deck): Deck {
  return cards.map((card, idx) =>
    idx === i ? cards[j] : idx === j ? cards[i] : card
  )
}

export function shuffle(cards: Deck): Deck {
  return cards.reduce(
    (shuffled, _, i) => swap(i, Math.floor(Math.random() * i), shuffled),
    cards
  )
}

export function deck(): Deck {
  const suits = [Suit.DENARI, Suit.COPPE, Suit.BASTONI, Suit.SPADE]
  const cards = suits.reduce<Deck>(
    (all, suit) => all.concat(range(1, 11).map<Card>(v => [v, suit])),
    []
  )

  return cards
}
