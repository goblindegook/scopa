import { mean, sum } from 'ramda'
import { findCaptures } from './capture.ts'
import { type Card, isDenari, isSettebello, type Pile } from './cards'
import { primePoints } from './scores.ts'
import type { Move, State } from './state'

function evaluateCapture(card: Card, capture: Pile, tableSize: number): number {
  const scoredCards = [...capture, card]

  return sum([
    capture.length,
    mean(scoredCards.map(primePoints)),
    scoredCards.filter(isDenari).length * 10,
    scoredCards.some(isSettebello) ? 500 : 0,
    capture.length === tableSize ? 1000 : 0,
  ])
}

function evaluateDiscard(card: Card): number {
  return -primePoints(card) + (isDenari(card) ? -5 : 0)
}

export async function move(game: State): Promise<Move> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const hand = game.players[game.turn].hand
  const table = game.table

  let bestMove: Move | null = null
  let bestScore = -Infinity

  for (const card of hand) {
    const score = evaluateDiscard(card)
    if (score > bestScore) {
      bestScore = score
      bestMove = { card, capture: [] }
    }

    const availableCaptures = findCaptures(card[0], table)
    for (const capture of availableCaptures) {
      const score = evaluateCapture(card, capture, table.length)
      if (score > bestScore) {
        bestScore = score
        bestMove = { card, capture }
      }
    }
  }

  return bestMove ?? { card: hand[0], capture: [] }
}
