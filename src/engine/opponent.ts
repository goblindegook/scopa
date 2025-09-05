import { findCaptures } from './capture.ts'
import { type Card, type Pile, Suit } from './cards'
import type { Move, State } from './state'

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

function countDenari(cards: Pile): number {
  return cards.filter(([, suit]) => suit === Suit.DENARI).length
}

function hasSettebello(cards: Pile): boolean {
  return cards.some((c) => c[0] === 7 && c[1] === Suit.DENARI)
}

function primieraValue(cards: Pile): number {
  return cards.reduce<number>(
    (acc, [value]: Card) => acc + (PRIME_POINTS[value] ?? 0),
    0,
  )
}

function evaluateCapture(card: Card, capture: Pile, tableSize: number): number {
  let score = 0

  if (capture.length > 0 && capture.length === tableSize) {
    score += 1000
  }

  const capturedWithCard: Pile = [...capture, card]
  if (hasSettebello(capturedWithCard)) {
    score += 500
  }

  score += countDenari(capturedWithCard) * 5
  score += primieraValue(capturedWithCard) / 10
  score += capture.length

  return score
}

function evaluateDiscard(card: Card): number {
  let score = -PRIME_POINTS[card[0]]
  if (card[1] === Suit.DENARI) score -= 5
  if (card[0] === [7, Suit.DENARI][0] && card[1] === [7, Suit.DENARI][1])
    score -= 1000
  return score
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
