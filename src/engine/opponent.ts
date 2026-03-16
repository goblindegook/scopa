import { findCaptures } from './capture.ts'
import { type Card, isDenari, isSettebello, type Pile } from './cards'
import { primePoints } from './scores.ts'
import type { Move, State } from './state'

function evaluateCapture(card: Card, capture: Pile, tableSize: number, hasCapturedMostDenari: boolean): number {
  const scoredCards = [...capture, card]
  const averagePrimeWeight =
    scoredCards.reduce((total, scoredCard) => total + primePoints(scoredCard), 0) / scoredCards.length

  const denariWeight = hasCapturedMostDenari
    ? scoredCards.filter(isSettebello).length * 10
    : scoredCards.filter(isDenari).length * 10

  return averagePrimeWeight + denariWeight + (capture.length === tableSize ? 1000 : 0)
}

function enablesOpponentScopa(card: Card, table: Pile): boolean {
  const newTable = [...table, card]
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((value) =>
    findCaptures(value, newTable).some((capture) => capture.length === newTable.length),
  )
}

function evaluateDiscard(card: Card, table: Pile): number {
  return -primePoints(card) - (isDenari(card) ? 10 : 0) - (enablesOpponentScopa(card, table) ? 500 : 0)
}

export async function move(game: State): Promise<Move> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const hand = game.players[game.turn].hand
  const table = game.table
  const hasCapturedMostDenari = game.players[game.turn].pile.filter(isDenari).length > 5

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
      const score = evaluateCapture(card, capture, table.length, hasCapturedMostDenari)
      if (score > bestScore) {
        bestScore = score
        bestMove = { card, capture }
      }
    }
  }

  return bestMove ?? { card: hand[0], capture: [] }
}
