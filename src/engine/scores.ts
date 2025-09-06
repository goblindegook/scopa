import { flow } from '@pacote/pipe'
import { groupBy, map, reduce, sort, values } from 'ramda'
import { type Card, denari, isDenari, isSettebello, type Pile } from './cards'
import type { Player } from './state'

interface ScoreDetail {
  label: string
  value: number
  cards: Pile
}

export interface Score {
  playerId: number
  details: readonly ScoreDetail[]
  total: number
}

const PRIME_POINTS: Record<number, number> = {
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

export const primePoints = ([value]: Card): number => PRIME_POINTS[value] ?? 0

type CardPoints = [Card, number]

const prime = flow(
  map((card: Card): CardPoints => [card, primePoints(card)]),
  sort(([, p1], [, p2]) => p2 - p1),
  groupBy(([[, suit]]) => String(suit)),
  values,
  map((points) => points![0]),
  reduce<CardPoints, ScoreDetail>(
    ({ cards, value, ...rest }, [card, points]) => ({
      cards: [...cards, card],
      value: value + points,
      ...rest,
    }),
    { label: 'Primiera', cards: [], value: 0 },
  ),
)

function findWinners(totals: number[]): number[] {
  const maximum = Math.max(...totals)
  if (maximum === 0) return []
  return totals.reduce<number[]>(
    (winners, total, currentIndex) =>
      total === maximum ? [...winners, currentIndex] : winners,
    [],
  )
}

export function score(players: readonly Player[]): readonly Score[] {
  const cardTotal = players.map(({ pile }) => pile.length)
  const mostCards = findWinners(cardTotal)

  const denariTotal = players.map(({ pile }) => pile.filter(isDenari).length)
  const mostDenari = findWinners(denariTotal)

  const primes = players.map(({ pile }) => prime(pile))
  const highestPrime = findWinners(primes.map(({ value }) => value))

  return players.map(({ scope, pile }, player) => {
    const settebello = pile.some(isSettebello) ? 1 : 0

    return {
      playerId: player,
      details: [
        { label: 'Scope', value: scope, cards: [] },
        { label: 'Captured', value: pile.length, cards: pile },
        {
          label: 'Denari',
          value: denariTotal[player],
          cards: pile.filter(isDenari),
        },
        {
          label: 'Sette Bello',
          value: settebello,
          cards: settebello === 1 ? [denari(7)] : [],
        },
        primes[player],
      ],
      total:
        scope +
        settebello +
        (mostCards.includes(player) ? 1 : 0) +
        (mostDenari.includes(player) ? 1 : 0) +
        (highestPrime.includes(player) ? 1 : 0),
    }
  })
}
