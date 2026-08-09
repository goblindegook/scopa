import { isOk } from '@pacote/result'
import { type Card, deck, isDenari, isSame, isSettebello, type Pile, type Suit } from './cards.ts'
import { findCardsToTake } from './move.ts'
import { play } from './scopa.ts'
import { primePoints, score } from './scores.ts'
import type { Move, Player, State } from './state.ts'

export interface OpponentOptions {
  canCountCards?: boolean
  aggression?: number
  worlds?: number
  /** Never ship true: the search reads real hands. */
  cheats?: boolean
}

interface Temperament {
  eagerness: number
  caution: number
  defensiveBias: number
}

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

interface Evaluation {
  temperament: Temperament
  currentBestPrimes: Map<Suit, number>
  ownDenariCount: number
  ctx: CardCountContext | null
  isLastTable: boolean
}

function evaluationContext(game: State, { canCountCards = false, aggression }: OpponentOptions): Evaluation {
  const effectiveAggression = aggression ?? dynamicAggression(game, canCountCards)
  const aggressiveBias = Math.max(effectiveAggression, 0)
  const defensiveBias = Math.max(-effectiveAggression, 0)
  const { pile } = game.players[game.turn]

  return {
    temperament: {
      eagerness: 1 + aggressiveBias * 0.8 - defensiveBias * 0.4,
      caution: 1 - aggressiveBias * 0.4 + defensiveBias * 1.2,
      defensiveBias,
    },
    currentBestPrimes: bestPrimes(pile),
    ownDenariCount: pile.filter(isDenari).length,
    ctx: canCountCards ? buildContext(game) : null,
    isLastTable: game.pile.length === 0,
  }
}

function scoreMove({ card, take }: Move, game: State, evaluation: Evaluation): number {
  const { temperament, currentBestPrimes, ownDenariCount, ctx, isLastTable } = evaluation
  return take.length === 0
    ? evaluateDiscard(card, game.table, temperament)
    : evaluateTake([card, ...take], game.table, currentBestPrimes, ownDenariCount, temperament, ctx, isLastTable)
}

function legalMoves(game: State): readonly Move[] {
  return game.players[game.turn].hand.flatMap((card) => {
    const takes = findCardsToTake(card[0], game.table)
    return takes.length === 0 ? [{ card, take: [] }] : takes.map((take) => ({ card, take }))
  })
}

function bestScoredMove(game: State, options: OpponentOptions): { move: Move; score: number } {
  const evaluation = evaluationContext(game, options)
  const candidates = legalMoves(game)

  return candidates.reduce<{ move: Move; score: number }>(
    (best, candidate) => {
      const score = scoreMove(candidate, game, evaluation)
      return score > best.score ? { move: candidate, score } : best
    },
    { move: candidates[0] ?? { card: game.players[game.turn].hand[0], take: [] }, score: -Infinity },
  )
}

export function move(game: State, options: OpponentOptions = {}): Move {
  return options.canCountCards ? searchMove(game, options) : bestScoredMove(game, options).move
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

const WINNING_SCORE = 11
const HALF_DECK = 20
const HALF_DENARI = 5
const MAX_PRIMIERA = 84

const TABLE_CONTROL_BASE = 0.5
const TABLE_CONTROL_DEFENSIVE = 6

function dynamicAggression(game: State, canCountCards: boolean): number {
  const myScore = game.score[game.turn] ?? 0
  const opponentsScore = game.score.filter((_, index) => index !== game.turn)
  const prospectiveWinner = Math.max(...game.score)
  const bestOpponentScore = opponentsScore.length > 0 ? Math.max(...opponentsScore) : myScore

  if (myScore < prospectiveWinner) return clamp((prospectiveWinner - myScore) / WINNING_SCORE, 0, 1)

  if (myScore > bestOpponentScore) return clamp(-(0.35 + (myScore - bestOpponentScore) / WINNING_SCORE), -1, -0.2)

  if (canCountCards) {
    const roundTotals = score(game.players).map(({ total }) => total)
    const myRoundTotal = roundTotals[game.turn] ?? 0
    const bestOpponentRoundTotal = roundTotals
      .filter((_, index) => index !== game.turn)
      .reduce((best, total) => Math.max(best, total), 0)
    return clamp((bestOpponentRoundTotal - myRoundTotal) / 2, -0.8, 0.8)
  }

  const pile = game.players[game.turn]?.pile ?? []
  const cardsReadiness = 1 - clamp(Math.abs(HALF_DECK - pile.length) / HALF_DECK, 0, 1)
  const primieraReadiness = clamp(
    bestPrimes(pile)
      .values()
      .reduce((total, pts) => total + pts, 0) / MAX_PRIMIERA,
    0,
    1,
  )
  const denariReadiness = 1 - clamp(Math.abs(HALF_DENARI - pile.filter(isDenari).length) / HALF_DENARI, 0, 1)
  const settebelloReadiness = pile.some(isSettebello) ? 1 : 0
  const readiness = cardsReadiness * 0.35 + primieraReadiness * 0.3 + denariReadiness * 0.25 + settebelloReadiness * 0.1

  return clamp((0.5 - readiness) * 0.6, -0.35, 0.35)
}

function tableCapturePotential(table: Pile): number {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((total, value) => total + findCardsToTake(value, table).length, 0)
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

function sweepingValues(table: Pile): readonly number[] {
  if (table.length === 0) return []
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((value) =>
    findCardsToTake(value, table).some((combo) => combo.length === table.length),
  )
}

function evaluateTake(
  cards: Pile,
  table: Pile,
  currentBest: Map<Suit, number>,
  ownDenariCount: number,
  temperament: Temperament,
  ctx?: CardCountContext | null,
  isLastTable = false,
): number {
  const scopaWeight = cards.length === table.length + 1 ? 1000 : 0

  const settebelloWeight = cards.some(isSettebello) ? 1200 : 0

  const trailingCards = ctx?.opponents.some((o) => o.cardCount > ctx.mine.cardCount) ?? false
  const leadingCards = ctx?.opponents.every((o) => o.cardCount <= ctx.mine.cardCount) ?? false
  const cardUnitWeight = trailingCards ? 2 : leadingCards ? 0.5 : 1
  const cardsWeight = (ctx != null ? (cards.length - 1) * cardUnitWeight : cards.length) * temperament.eagerness

  const takenDenari = ownDenariCount > 5 ? 5 : 10
  const trailingDenari = ctx != null && ctx.nextOpponent.denariCount > ctx.mine.denariCount ? 5 : 0
  const denariCards = cards.filter(isDenari)
  const denariWeight = denariCards.length * (takenDenari + trailingDenari) * temperament.eagerness

  const primeWeight = evaluatePrimes(cards, currentBest, ctx) * temperament.eagerness

  const takenCards = cards.slice(1)
  const remainingTable = table.filter((c) => !takenCards.some((t) => isSame(t, c)))
  const scopaGiftWeight = sweepingValues(remainingTable).length > 0 ? -30 * temperament.caution : 0

  const blockOpponentWeight =
    -tableCapturePotential(remainingTable) * (TABLE_CONTROL_BASE + TABLE_CONTROL_DEFENSIVE * temperament.defensiveBias)

  const lastTableBonus = isLastTable ? takenCards.length * 10 * temperament.eagerness : 0

  return (
    scopaWeight +
    settebelloWeight +
    denariWeight +
    primeWeight +
    cardsWeight +
    scopaGiftWeight +
    blockOpponentWeight +
    lastTableBonus
  )
}

function evaluateDiscard(card: Card, table: Pile, temperament: Temperament): number {
  const scopaPreventionWeight = sweepingValues([...table, card]).length > 0 ? -1000 * temperament.caution : 0
  const settebelloWeight = isSettebello(card) ? -1700 * temperament.caution : 0
  const primeWeight = -primePoints(card) * temperament.caution
  const denariWeight = isDenari(card) ? -10 * temperament.caution : 0
  const blockOpponentWeight =
    -tableCapturePotential([...table, card]) *
    (TABLE_CONTROL_BASE + TABLE_CONTROL_DEFENSIVE * temperament.defensiveBias)

  return scopaPreventionWeight + settebelloWeight + primeWeight + denariWeight + blockOpponentWeight
}

function unseenFrom(game: State): Pile {
  const seen = [...game.players[game.turn].hand, ...game.table, ...game.players.flatMap((player) => player.pile)]
  return deck().filter((card) => !seen.some((known) => isSame(known, card)))
}

// Seeded from the position, not Math.random: the benchmark needs the policy to be a pure function of state.
function positionSeed(game: State): number {
  const me = game.players[game.turn]
  return [...game.table, ...me.hand, ...me.pile].reduce(
    (hash, [value, suit]) => Math.imul(hash ^ (value * 4 + suit), 16777619) >>> 0,
    Math.imul(2166136261 ^ game.turn, 16777619) >>> 0,
  )
}

function seededShuffle(cards: Pile, seed: number): Pile {
  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let x = Math.imul(state ^ (state >>> 15), 1 | state)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
  const shuffled = [...cards]
  for (let i = 0; i < shuffled.length - 1; i += 1) {
    const j = i + Math.floor(random() * (shuffled.length - i))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function determinize(game: State, index: number): State {
  const pool = seededShuffle(unseenFrom(game), positionSeed(game) ^ Math.imul(index + 1, 0x9e3779b9))
  let taken = 0
  const players = game.players.map((player, playerIndex) => {
    if (playerIndex === game.turn) return player
    const hand = pool.slice(taken, taken + player.hand.length)
    taken += player.hand.length
    return { ...player, hand }
  })
  return { ...game, players, pile: pool.slice(taken, taken + game.pile.length) }
}

function searchMove(game: State, options: OpponentOptions): Move {
  const evaluation = evaluationContext(game, options)
  const candidates = legalMoves(game)
  const worlds = options.cheats
    ? [game]
    : Array.from({ length: Math.max(1, options.worlds ?? 1) }, (_, index) => determinize(game, index))

  const replyIn = (candidate: Move, world: State): number => {
    const next = play(candidate, world)
    return isOk(next) && next.value.state !== 'stop' ? bestScoredMove(next.value, options).score : 0
  }

  return candidates.reduce<{ move: Move; value: number }>(
    (best, candidate) => {
      const reply = worlds.reduce((total, world) => total + replyIn(candidate, world), 0) / worlds.length
      const value = scoreMove(candidate, game, evaluation) - reply
      return value > best.value ? { move: candidate, value } : best
    },
    { move: candidates[0] ?? { card: game.players[game.turn].hand[0], take: [] }, value: -Infinity },
  ).move
}
