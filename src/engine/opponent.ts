import { findCaptures } from './capture.ts'
import { type Card, isCard, isSuit, type Pile, Suit } from './cards'
import { PRIME_POINTS, SETTEBELLO } from './scores.ts'
import type { Move, State } from './state'

function countDenari(cards: Pile): number {
  return cards.filter((card) => isSuit(card, Suit.DENARI)).length
}

function hasSettebello(cards: Pile): boolean {
  return cards.some((card) => isCard(card, SETTEBELLO))
}

function primieraValue(cards: Pile): number {
  return cards.reduce<number>(
    (acc, [value]: Card) => acc + (PRIME_POINTS[value] ?? 0),
    0,
  )
}

function evaluateCapture(card: Card, capture: Pile, tableSize: number): number {
  let score = 0

  if (capture.length === tableSize) {
    score += 1000
  }

  const capturedWithCard = [...capture, card]
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
  if (isSuit(card, Suit.DENARI)) score -= 5
  if (isCard(card, SETTEBELLO)) score -= 1000
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
