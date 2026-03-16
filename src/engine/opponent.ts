import { findCaptures } from './capture.ts'
import { type Card, isDenari, isSettebello, type Pile, type Suit } from './cards'
import { primePoints } from './scores.ts'
import type { Move, State } from './state'

function bestPrimes(pile: Pile, initial: Map<Suit, number> = new Map()): Map<Suit, number> {
  return pile.reduce((best, card) => {
    const pts = primePoints(card)
    if (pts > (best.get(card[1]) ?? 0)) best.set(card[1], pts)
    return best
  }, new Map<Suit, number>(initial))
}

function evaluatePrimes(cards: Pile, currentBest: Map<Suit, number>): number {
  const next = bestPrimes(cards, currentBest)
  return Array.from(next).reduce((delta, [suit, pts]) => delta + pts - (currentBest.get(suit) ?? 0), 0)
}

function evaluateCapture(card: Card, capture: Pile, tableSize: number, currentBest: Map<Suit, number>): number {
  const scopaWeight = capture.length === tableSize ? 1000 : 0
  const scoredCards = [...capture, card]
  const settebelloWeight = scoredCards.some(isSettebello) ? 20 : 0
  const denariWeight = scoredCards.filter(isDenari).length * 10
  const primeWeight = evaluatePrimes(scoredCards, currentBest)

  return scopaWeight + settebelloWeight + denariWeight + primeWeight + capture.length
}

function enablesOpponentScopa(card: Card, table: Pile): boolean {
  const newTable = [...table, card]
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((value) =>
    findCaptures(value, newTable).some((capture) => capture.length === newTable.length),
  )
}

function evaluateDiscard(card: Card, table: Pile): number {
  const scopaPreventionWeight = enablesOpponentScopa(card, table) ? -1000 : 0
  const primeWeight = -primePoints(card)
  const denariWeight = isDenari(card) ? -10 : 0

  return scopaPreventionWeight + primeWeight + denariWeight
}

export async function move(game: State): Promise<Move> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const { hand, pile } = game.players[game.turn]
  const table = game.table
  const currentBestPrimes = bestPrimes(pile)

  let bestMove: Move | null = null
  let bestScore = -Infinity

  for (const card of hand) {
    const score = evaluateDiscard(card, table)
    if (score > bestScore) {
      bestScore = score
      bestMove = { card, capture: [] }
    }

    const availableCaptures = findCaptures(card[0], table)
    for (const capture of availableCaptures) {
      const score = evaluateCapture(card, capture, table.length, currentBestPrimes)
      if (score > bestScore) {
        bestScore = score
        bestMove = { card, capture }
      }
    }
  }

  return bestMove ?? { card: hand[0], capture: [] }
}
