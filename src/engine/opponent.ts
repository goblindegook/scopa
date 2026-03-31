import { type Card, isDenari, isSame, isSettebello, type Pile, type Suit } from './cards'
import { findCardsToTake } from './move.ts'
import { primePoints } from './scores.ts'
import type { Move, State } from './state'

interface OpponentProfile {
  cardCount: number
  denariCount: number
  bestPrimes: Map<Suit, number>
}

interface CardCountContext {
  mine: OpponentProfile
  opponents: OpponentProfile[]
}

function buildProfile(pile: Pile): OpponentProfile {
  return {
    cardCount: pile.length,
    denariCount: pile.filter(isDenari).length,
    bestPrimes: bestPrimes(pile),
  }
}

function buildContext(game: State): CardCountContext {
  const mine = buildProfile(game.players[game.turn].pile)
  const opponents = game.players.filter((_, i) => i !== game.turn).map((p) => buildProfile(p.pile))
  return { mine, opponents }
}

function bestPrimes(pile: Pile, initial: Map<Suit, number> = new Map()): Map<Suit, number> {
  return pile.reduce((best, card) => {
    const pts = primePoints(card)
    if (pts > (best.get(card[1]) ?? 0)) best.set(card[1], pts)
    return best
  }, new Map<Suit, number>(initial))
}

function evaluatePrimes(cards: Pile, currentBest: Map<Suit, number>, ctx?: CardCountContext | null): number {
  const next = bestPrimes(cards, currentBest)
  return Array.from(next).reduce((delta, [suit, pts]) => {
    const gain = pts - (currentBest.get(suit) ?? 0)
    const trailingInSuit = ctx?.opponents.some((o) => (o.bestPrimes.get(suit) ?? 0) > (currentBest.get(suit) ?? 0))
    return delta + (trailingInSuit ? gain * 2 : gain)
  }, 0)
}

function evaluateTake(
  cards: Pile,
  table: Pile,
  currentBest: Map<Suit, number>,
  ownDenariCount: number,
  ctx?: CardCountContext | null,
): number {
  const scopaWeight = cards.length === table.length + 1 ? 1000 : 0

  const settebelloWeight = cards.some(isSettebello) ? 20 : 0

  const trailingCards = ctx?.opponents.some((o) => o.cardCount > ctx.mine.cardCount) ?? false
  const leadingCards = ctx?.opponents.every((o) => o.cardCount <= ctx.mine.cardCount) ?? false
  const cardUnitWeight = trailingCards ? 2 : leadingCards ? 0.5 : 1
  const cardsWeight = ctx != null ? (cards.length - 1) * cardUnitWeight : cards.length

  const takenDenari = ownDenariCount > 5 ? 5 : 10
  const trailingDenari = ctx?.opponents.some((o) => o.denariCount > ctx.mine.denariCount) ? 5 : 0
  const denariCards = cards.filter(isDenari)
  const denariWeight = denariCards.length * (takenDenari + trailingDenari)

  const primeWeight = evaluatePrimes(cards, currentBest, ctx)

  const takenCards = cards.slice(1)
  const remainingTable = table.filter((c) => !takenCards.some((t) => isSame(t, c)))
  const scopaGiftWeight =
    remainingTable.length > 0 &&
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((value) =>
      findCardsToTake(value, remainingTable).some((combo) => combo.length === remainingTable.length),
    )
      ? -30
      : 0

  return scopaWeight + settebelloWeight + denariWeight + primeWeight + cardsWeight + scopaGiftWeight
}

function enablesOpponentScopa(card: Card, table: Pile): boolean {
  const newTable = [...table, card]
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((value) =>
    findCardsToTake(value, newTable).some((cards) => cards.length === newTable.length),
  )
}

function evaluateDiscard(card: Card, table: Pile): number {
  const scopaPreventionWeight = enablesOpponentScopa(card, table) ? -1000 : 0
  const primeWeight = -primePoints(card)
  const denariWeight = isDenari(card) ? -10 : 0

  return scopaPreventionWeight + primeWeight + denariWeight
}

export async function move(game: State, canCountCards = false): Promise<Move> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const { hand, pile } = game.players[game.turn]
  const table = game.table
  const currentBestPrimes = bestPrimes(pile)
  const ownDenariCount = pile.filter(isDenari).length
  const ctx = canCountCards ? buildContext(game) : null

  let bestMove: Move | null = null
  let bestScore = -Infinity

  for (const card of hand) {
    const score = evaluateDiscard(card, table)
    if (score > bestScore) {
      bestScore = score
      bestMove = { card, take: [] }
    }

    const availableTakes = findCardsToTake(card[0], table)
    for (const takenCards of availableTakes) {
      const score = evaluateTake([card, ...takenCards], table, currentBestPrimes, ownDenariCount, ctx)
      if (score > bestScore) {
        bestScore = score
        bestMove = { card, take: takenCards }
      }
    }
  }

  return bestMove ?? { card: hand[0], take: [] }
}
