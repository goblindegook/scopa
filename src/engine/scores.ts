import { contains, groupBy, map, pipe, reduce, sort, uniq } from 'ramda'
import { Suit, Card } from './cards'
import { State } from './state'

const SETTEBELLO: Card = [7, Suit.DENARI]

interface ScoreDetail {
  label: string
  value?: string | number
  cards?: readonly Card[]
}

export interface Score {
  details: readonly ScoreDetail[]
  total: number
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

type CardPoints = [Card, number]

const cardPoints = (card: Card): CardPoints => [card, PRIME_POINTS[card[0]]]
const suit = ([[, suit]]: CardPoints) => `${suit}`
const mostPoints = ([, p1]: CardPoints, [, p2]: CardPoints) => p2 - p1

const prime = pipe(
  map(cardPoints),
  sort(mostPoints),
  groupBy(suit),
  Object.values,
  map(([highest]) => highest),
  reduce<CardPoints, [Card[], number]>(
    ([cards, total], [card, points]) => [[...cards, card], total + points],
    [[], 0]
  ),
  ([cards, value]) => ({ cards, value })
)

export function score(game: State): readonly Score[] {
  const cards = game.players.map(({ pile }) => pile.length)
  const cardTie = uniq(cards).length === 1
  const cardMax = Math.max(...cards)

  const denari = game.players.map(
    ({ pile }) => pile.filter(([, suit]) => suit === Suit.DENARI).length
  )
  const denariTie = uniq(denari).length === 1
  const denariMax = Math.max(...denari)

  const primes = game.players.map(({ pile }) => prime(pile))
  const primeTotals = primes.map(({ value }) => value)
  const primeTie = uniq(primeTotals).length === 1
  const primeMax = Math.max(...primeTotals)

  return game.players.map(({ scope: score, pile }, idx) => {
    const settebello = contains(SETTEBELLO, pile)
    const denariCards = pile.filter(([, suit]) => suit === Suit.DENARI)

    return {
      details: [
        { label: 'Scope', value: score },
        { label: 'Captured', value: pile.length, cards: pile },
        { label: 'Denari', value: denari[idx], cards: denariCards },
        { label: 'Sette Bello', cards: settebello ? [SETTEBELLO] : [] },
        { label: 'Primiera', ...primes[idx] }
      ],
      total:
        score +
        (settebello ? 1 : 0) +
        (!cardTie && cards[idx] === cardMax ? 1 : 0) +
        (!denariTie && denari[idx] === denariMax ? 1 : 0) +
        (!primeTie && primeTotals[idx] === primeMax ? 1 : 0)
    }
  })
}
