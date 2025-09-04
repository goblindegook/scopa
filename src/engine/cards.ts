export enum Suit {
  DENARI,
  COPPE,
  BASTONI,
  SPADE,
}

export type Value = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type Card = [Value, Suit]

export type Deck = readonly Card[]

export function deck(): Deck {
  const suits = [Suit.DENARI, Suit.COPPE, Suit.BASTONI, Suit.SPADE]
  const values: Value[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  return suits.reduce<Deck>(
    (all, suit) => all.concat(values.map<Card>((v) => [v, suit])),
    [],
  )
}
