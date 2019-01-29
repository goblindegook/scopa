import { contains, uniq, sum } from 'ramda'
import { Deck, Suit, Card } from './cards'
import { State } from './state'

const SETTEBELLO: Card = [7, Suit.DENARI]

type ScoreDetail = {
  label: string
  value?: string | number
  cards?: ReadonlyArray<Card>
}

export type Score = {
  details: ReadonlyArray<ScoreDetail>
  total: number
}

export function score(game: State): ReadonlyArray<Score> {
  const cards = game.players.map(({ pile }) => pile.length)
  const cardTie = uniq(cards).length === 1
  const cardMax = Math.max(...cards)

  const denari = game.players.map(
    ({ pile }) => pile.filter(([_, suit]) => suit === Suit.DENARI).length
  )
  const denariTie = uniq(denari).length === 1
  const denariMax = Math.max(...denari)

  const primes = game.players.map(({ pile }) => prime(pile))
  const primeTie = uniq(primes).length === 1
  const primeMax = Math.max(...primes)

  return game.players.map(({ scope: score, pile }, idx) => {
    const settebello = contains(SETTEBELLO, pile)
    const denariCards = pile.filter(([_, suit]) => suit === Suit.DENARI)

    return {
      details: [
        { label: 'Scope', value: score },
        { label: 'Captured', value: pile.length, cards: pile },
        { label: 'Denari', value: denari[idx], cards: denariCards },
        { label: 'Sette Bello', cards: settebello ? [SETTEBELLO] : [] },
        { label: 'Primiera', value: primes[idx], cards: [] }
      ],
      total:
        score +
        (settebello ? 1 : 0) +
        (!cardTie && cards[idx] === cardMax ? 1 : 0) +
        (!denariTie && denari[idx] === denariMax ? 1 : 0) +
        (!primeTie && primes[idx] === primeMax ? 1 : 0)
    }
  })
}

function replaceMaxAt(value: number, suit: number, points: number[]): number[] {
  return points.map((v, i) => (i === suit ? Math.max(value, v) : v))
}

const PRIME_POINTS: { [value: number]: number } = {
  1: 16,
  2: 12,
  3: 13,
  4: 14,
  5: 15,
  6: 18,
  7: 21,
  8: 10,
  9: 10,
  10: 10
}

export function prime(cards: Deck): number {
  return sum(
    cards.reduce<number[]>(
      (points, [value, suit]) =>
        replaceMaxAt(PRIME_POINTS[value], suit, points),
      [0, 0, 0, 0]
    )
  )
}
