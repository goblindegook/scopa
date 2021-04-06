import { contains, groupBy, map, reduce, sort } from 'ramda'
import { flow } from '@pacote/pipe'
import { Suit, Card } from './cards'
import { Player } from './state'

interface ScoreDetail {
  label: string
  value: number
  cards: readonly Card[]
}

export interface Score {
  details: readonly ScoreDetail[]
  total: number
}

const isDenari = ([, suit]: Card) => suit === Suit.DENARI

const SETTEBELLO: Card = [7, Suit.DENARI]

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
  10: 10,
}

type CardPoints = [Card, number]

const cardPoints = (card: Card): CardPoints => [card, PRIME_POINTS[card[0]]]
const suit = ([[, suit]]: CardPoints) => String(suit)
const mostPoints = ([, p1]: CardPoints, [, p2]: CardPoints) => p2 - p1

const prime = flow(
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

function findWinner(totals: number[]): number | null {
  const maximum = Math.max(...totals)
  const singleWinner = totals.filter((total) => total === maximum).length === 1
  return singleWinner ? totals.indexOf(maximum) : null
}

export function score(players: readonly Player[]): readonly Score[] {
  const cardTotal = players.map(({ pile }) => pile.length)
  const mostCards = findWinner(cardTotal)

  const denariTotal = players.map(({ pile }) => pile.filter(isDenari).length)
  const mostDenari = findWinner(denariTotal)

  const primes = players.map(({ pile }) => prime(pile))
  const highestPrime = findWinner(primes.map(({ value }) => value))

  return players.map(({ scope, pile }, player) => {
    const settebello = contains(SETTEBELLO, pile) ? 1 : 0
    const denariCards = pile.filter(isDenari)

    return {
      details: [
        { label: 'Scope', value: scope, cards: [] },
        { label: 'Captured', value: pile.length, cards: pile },
        { label: 'Denari', value: denariTotal[player], cards: denariCards },
        {
          label: 'Sette Bello',
          value: settebello,
          cards: settebello === 1 ? [SETTEBELLO] : [],
        },
        { label: 'Primiera', ...primes[player] },
      ],
      total:
        scope +
        settebello +
        (mostCards === player ? 1 : 0) +
        (mostDenari === player ? 1 : 0) +
        (highestPrime === player ? 1 : 0),
    }
  })
}
