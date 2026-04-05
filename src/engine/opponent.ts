import { type Card, isDenari, isSame, isSettebello, type Pile, type Suit } from './cards'
import { findCardsToTake } from './move.ts'
import { primePoints } from './scores.ts'
import type { Move, Player, State } from './state'

const LOOKAHEAD_DISCOUNT = 0.4

interface OpponentProfile {
  cardCount: number
  denariCount: number
  bestPrimes: Map<Suit, number>
}

interface CardCountContext {
  mine: OpponentProfile
  opponents: OpponentProfile[]
  nextOpponent: OpponentProfile
}

export async function move(
  game: State,
  { canCountCards = false, canLookAhead = false }: OpponenOptions,
): Promise<Move> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const { hand, pile } = game.players[game.turn]
  const table = game.table
  const currentBestPrimes = bestPrimes(pile)
  const ownDenariCount = pile.filter(isDenari).length
  const ctx = canCountCards ? buildContext(game) : null
  const isLastTable = game.pile.length === 0
  const uncountedCards = canLookAhead && canCountCards ? inferUncountedCards(game) : []

  let bestMove: Move | null = null
  let bestScore = -Infinity

  for (const card of hand) {
    const remainingHand = hand.filter((c) => !isSame(c, card))

    const discardTable = [...table, card]
    const discardTables = canLookAhead
      ? canCountCards
        ? simulatedOpponentTables(discardTable, uncountedCards)
        : [discardTable]
      : []
    const discardLookahead = canLookAhead
      ? LOOKAHEAD_DISCOUNT *
        lookaheadScore(remainingHand, discardTables, currentBestPrimes, ownDenariCount, isLastTable)
      : 0
    const discardScore = evaluateDiscard(card, table) + discardLookahead
    if (discardScore > bestScore) {
      bestScore = discardScore
      bestMove = { card, take: [] }
    }

    const availableTakes = findCardsToTake(card[0], table)
    for (const takenCards of availableTakes) {
      const nextTable = table.filter((c) => !takenCards.some((t) => isSame(t, c)))
      const takeTables = canLookAhead
        ? canCountCards
          ? simulatedOpponentTables(nextTable, uncountedCards)
          : [nextTable]
        : []
      const takeLookahead = canLookAhead
        ? LOOKAHEAD_DISCOUNT * lookaheadScore(remainingHand, takeTables, currentBestPrimes, ownDenariCount, isLastTable)
        : 0
      const takeScore =
        evaluateTake([card, ...takenCards], table, currentBestPrimes, ownDenariCount, ctx, isLastTable) + takeLookahead
      if (takeScore > bestScore) {
        bestScore = takeScore
        bestMove = { card, take: takenCards }
      }
    }
  }

  return bestMove ?? { card: hand[0], take: [] }
}

function buildProfile(pile: Pile): OpponentProfile {
  return {
    cardCount: pile.length,
    denariCount: pile.filter(isDenari).length,
    bestPrimes: bestPrimes(pile),
  }
}

function getOpponents(game: State): readonly Player[] {
  return game.players.filter((_, i) => i !== game.turn)
}

function buildContext(game: State): CardCountContext {
  const nextTurn = (game.turn - 1 + game.players.length) % game.players.length
  return {
    mine: buildProfile(game.players[game.turn].pile),
    opponents: getOpponents(game).map((p) => buildProfile(p.pile)),
    nextOpponent: buildProfile(game.players[nextTurn].pile),
  }
}

export function inferUncountedCards(game: State): Pile {
  return [...game.pile, ...getOpponents(game).flatMap((p) => p.hand)]
}

export function simulatedOpponentTables(nextTable: Pile, uncountedCards: Pile): readonly Pile[] {
  const tables: Pile[] = [nextTable]
  for (const card of uncountedCards) {
    const captures = findCardsToTake(card[0], nextTable)
    for (const taken of captures) {
      if (taken.length > 0) {
        tables.push(nextTable.filter((c) => !taken.some((t) => isSame(t, c))))
      }
    }
  }
  return tables
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
    const trailingInSuit = (ctx?.nextOpponent.bestPrimes.get(suit) ?? 0) > (currentBest.get(suit) ?? 0)
    return delta + (trailingInSuit ? gain * 2 : gain)
  }, 0)
}

function evaluateTake(
  cards: Pile,
  table: Pile,
  currentBest: Map<Suit, number>,
  ownDenariCount: number,
  ctx?: CardCountContext | null,
  isLastTable = false,
): number {
  const scopaWeight = cards.length === table.length + 1 ? 1000 : 0

  const settebelloWeight = cards.some(isSettebello) ? 1200 : 0

  const trailingCards = ctx?.opponents.some((o) => o.cardCount > ctx.mine.cardCount) ?? false
  const leadingCards = ctx?.opponents.every((o) => o.cardCount <= ctx.mine.cardCount) ?? false
  const cardUnitWeight = trailingCards ? 2 : leadingCards ? 0.5 : 1
  const cardsWeight = ctx != null ? (cards.length - 1) * cardUnitWeight : cards.length

  const takenDenari = ownDenariCount > 5 ? 5 : 10
  const trailingDenari = ctx != null && ctx.nextOpponent.denariCount > ctx.mine.denariCount ? 5 : 0
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

  const lastTableBonus = isLastTable ? takenCards.length * 10 : 0

  return scopaWeight + settebelloWeight + denariWeight + primeWeight + cardsWeight + scopaGiftWeight + lastTableBonus
}

function enablesOpponentScopa(card: Card, table: Pile): boolean {
  const newTable = [...table, card]
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((value) =>
    findCardsToTake(value, newTable).some((cards) => cards.length === newTable.length),
  )
}

function evaluateDiscard(card: Card, table: Pile): number {
  const scopaPreventionWeight = enablesOpponentScopa(card, table) ? -1000 : 0
  const settebelloWeight = isSettebello(card) ? -1700 : 0
  const primeWeight = -primePoints(card)
  const denariWeight = isDenari(card) ? -10 : 0

  return scopaPreventionWeight + settebelloWeight + primeWeight + denariWeight
}

export function lookaheadScore(
  remainingHand: Pile,
  tables: readonly Pile[],
  currentBestPrimes: Map<Suit, number>,
  ownDenariCount: number,
  isLastTable: boolean,
): number {
  if (tables.length === 0) return 0
  let total = 0
  for (const table of tables) {
    let best = -Infinity
    for (const card of remainingHand) {
      const discardScore = evaluateDiscard(card, table)
      if (discardScore > best) best = discardScore
      for (const taken of findCardsToTake(card[0], table)) {
        const takeScore = evaluateTake([card, ...taken], table, currentBestPrimes, ownDenariCount, null, isLastTable)
        if (takeScore > best) best = takeScore
      }
    }
    total += best === -Infinity ? 0 : best
  }
  return total / tables.length
}

interface OpponenOptions {
  canCountCards?: boolean
  canLookAhead?: boolean
}
