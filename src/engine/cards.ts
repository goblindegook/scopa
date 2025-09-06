export enum Suit {
  DENARI,
  COPPE,
  BASTONI,
  SPADE,
}

export type Value = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type Card<V extends Value = Value, S extends Suit = Suit> = [V, S]

export type Pile<
  V extends Value = Value,
  S extends Suit = Suit,
> = readonly Card<V, S>[]

export function denari<V extends Value>(value: V): Card<V, Suit.DENARI> {
  return [value, Suit.DENARI]
}

export function coppe<V extends Value>(value: V): Card<V, Suit.COPPE> {
  return [value, Suit.COPPE]
}

export function bastoni<V extends Value>(value: V): Card<V, Suit.BASTONI> {
  return [value, Suit.BASTONI]
}

export function spade<V extends Value>(value: V): Card<V, Suit.SPADE> {
  return [value, Suit.SPADE]
}

export function isDenari<V extends Value>(
  card: Card,
): card is Card<V, Suit.DENARI> {
  return card[1] === Suit.DENARI
}

export function isSettebello(card: Card): card is Card<7, Suit.DENARI> {
  return card[0] === 7 && card[1] === Suit.DENARI
}

export function deck(): Pile {
  const suits = [Suit.DENARI, Suit.COPPE, Suit.BASTONI, Suit.SPADE]
  const values: Value[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  return suits.reduce<Pile>(
    (all, suit) => all.concat(values.map((v) => [v, suit])),
    [],
  )
}
