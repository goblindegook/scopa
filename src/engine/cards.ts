export const Suit = {
  DENARI: 0,
  COPPE: 1,
  BASTONI: 2,
  SPADE: 3,
} as const

export type Suit = (typeof Suit)[keyof typeof Suit]

export type Value = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type Card<V extends Value = Value, S extends Suit = Suit> = [V, S]

export type Pile<V extends Value = Value, S extends Suit = Suit> = readonly Card<V, S>[]

export function denari<V extends Value>(value: V): Card<V, typeof Suit.DENARI> {
  return [value, Suit.DENARI]
}

export function coppe<V extends Value>(value: V): Card<V, typeof Suit.COPPE> {
  return [value, Suit.COPPE]
}

export function bastoni<V extends Value>(value: V): Card<V, typeof Suit.BASTONI> {
  return [value, Suit.BASTONI]
}

export function spade<V extends Value>(value: V): Card<V, typeof Suit.SPADE> {
  return [value, Suit.SPADE]
}

export function isDenari<V extends Value>(card: Card): card is Card<V, typeof Suit.DENARI> {
  return card[1] === Suit.DENARI
}

export function isSettebello(card: Card): card is Card<7, typeof Suit.DENARI> {
  return card[0] === 7 && card[1] === Suit.DENARI
}

export function isSame(a?: Card | null, b?: Card | null): boolean {
  return a && b ? a[0] === b[0] && a[1] === b[1] : a === b
}

export function hasCard(cards: readonly Card[], card: Card): boolean {
  return cards.some((c) => isSame(c, card))
}

export function deck(): Pile {
  const suits = [Suit.DENARI, Suit.COPPE, Suit.BASTONI, Suit.SPADE]
  const values: Value[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  return suits.reduce<Pile>((all, suit) => all.concat(values.map((v) => [v, suit])), [])
}
