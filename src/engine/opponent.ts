import { type Card, type Deck, Suit } from './cards'
import { findMatches } from './match'
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

function countDenari(cards: Deck): number {
  return cards.filter(([, suit]) => suit === Suit.DENARI).length
}

function hasSettebello(cards: Deck): boolean {
  return cards.some((c) => c[0] === 7 && c[1] === Suit.DENARI)
}

function primieraValue(cards: Deck): number {
  return cards.reduce<number>(
    (acc, [value]: Card) => acc + (PRIME_POINTS[value] ?? 0),
    0,
  )
}

function evaluateCapture(
  playedCard: Card,
  targets: Deck,
  tableSize: number,
): number {
  let score = 0

  if (targets.length > 0 && targets.length === tableSize) {
    score += 1000
  }

  const capturedWithCard: Deck = [...targets, playedCard]
  if (hasSettebello(capturedWithCard)) {
    score += 500
  }

  score += countDenari(capturedWithCard) * 5
  score += primieraValue(capturedWithCard) / 10
  score += targets.length

  return score
}

function evaluateDiscard(card: Card): number {
  let score = -PRIME_POINTS[card[0]]
  if (card[1] === Suit.DENARI) score -= 2
  if (card[0] === [7, Suit.DENARI][0] && card[1] === [7, Suit.DENARI][1])
    score -= 100
  return score
}

export async function move(game: State): Promise<Move> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const hand = game.players[game.turn].hand
  const table = game.table

  let bestMove: Move | null = null
  let bestScore = -Infinity

  for (const card of hand) {
    const possibleTargets = findMatches(card[0], table)

    if (possibleTargets.length === 0) {
      const score = evaluateDiscard(card)
      if (score > bestScore) {
        bestScore = score
        bestMove = { card, targets: [] }
      }
    }

    for (const targets of possibleTargets) {
      const score = evaluateCapture(card, targets, table.length)
      if (score > bestScore) {
        bestScore = score
        bestMove = { card, targets }
      }
    }
  }

  return bestMove ?? { card: hand[0], targets: [] }
}
