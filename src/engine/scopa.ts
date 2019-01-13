import { contains, without, splitAt, splitEvery, uniq, sum } from 'ramda'
import { Either, right, left } from 'fp-ts/lib/Either'
import { Deck, Card, Suit } from './cards'
import { findMatches } from './match'

type Player = {
  hand: Deck
  pile: Deck
  scope: number
}

export type State = {
  state: 'play' | 'stop'
  turn: number
  pile: Deck
  players: ReadonlyArray<Player>
  table: Deck
}

export type Move = {
  card: Card
  targets?: Deck
}

type Score = ReadonlyArray<number>

type Options = {
  players?: 2 | 3 | 4 | 6
}

const DEFAULT_OPTIONS: Required<Options> = {
  players: 2
}

const createPlayers = (cards: Deck, n: number): ReadonlyArray<Player> =>
  splitEvery(3, cards).map(hand => ({ hand, pile: [], scope: 0 }))

export function deal(cards: Deck, options?: Options): Either<Error, State> {
  const { players } = { ...DEFAULT_OPTIONS, ...options }
  const [table, rest] = splitAt(4, cards)
  const isValid = table.filter(([value]) => value === 10).length <= 2

  const [playerCards, pile] = splitAt(players * 3, rest)

  return isValid
    ? right<Error, State>({
        state: 'play',
        turn: Math.floor(Math.random() * players),
        players: createPlayers(playerCards, players),
        pile,
        table
      })
    : left(Error('More than two kings on the table. Deal again.'))
}

function next({ card, targets = [] }: Move, game: State): State {
  const { turn, table, players, pile } = game

  const tableAfterMove = targets.length
    ? without(targets, table)
    : [...table, card]

  const handAfterMove = without([card], players[turn].hand)

  const [nextHand, pileAfterDeal] = handAfterMove.length
    ? [handAfterMove, pile]
    : splitAt(3, pile)

  const [nextTable, nextPile] = tableAfterMove.length
    ? [tableAfterMove, pileAfterDeal]
    : splitAt(4, pileAfterDeal)

  const nextPlayers = players.map((player, idx) =>
    idx !== turn
      ? player
      : {
          ...player,
          hand: nextHand,
          pile: [...player.pile, ...targets, ...(targets.length ? [card] : [])],
          scope: tableAfterMove.length ? player.scope : player.scope + 1
        }
  )

  const nextTurn = turn < players.length - 1 ? turn + 1 : 0
  const nextState = nextPlayers[nextTurn].hand.length ? 'play' : 'stop'

  return {
    state: nextState,
    pile: nextPile,
    table: nextTable,
    players: nextPlayers,
    turn: nextTurn
  }
}

export function play(
  { card, targets = [] }: Move,
  game: State
): Either<Error, State> {
  const { table, turn, players } = game

  const hasCard = contains(card, players[turn].hand)

  const possibleTargets = findMatches(card[0], table)
  const mustPick = Math.min(...possibleTargets.map(t => t.length))
  const validTargets = possibleTargets.filter(t => t.length === mustPick)

  const autoTargets =
    !targets.length && validTargets.length < 2 ? validTargets[0] || [] : null
  const hasTarget = autoTargets || contains(targets, validTargets)

  return hasCard
    ? hasTarget
      ? right(next({ card, targets: autoTargets || targets }, game))
      : left(
          targets.length
            ? Error('The targetted cards may not be captured.')
            : Error('Choose the cards to capture.')
        )
    : left(Error('Not your turn.'))
}

export function score(game: State): Score {
  const cards = game.players.map(({ pile }) => pile.length)
  const cardTie = uniq(cards).length === 1

  const denari = game.players.map(
    ({ pile }) => pile.filter(([value, suit]) => suit === Suit.DENARI).length
  )
  const denariTie = uniq(denari).length === 1

  const primes = game.players.map(({ pile }) => prime(pile))
  const primeTie = uniq(primes).length === 1

  return game.players.map(
    ({ scope, pile }, idx) =>
      scope +
      (contains([7, Suit.DENARI], pile) ? 1 : 0) +
      (!cardTie && cards[idx] === Math.max(...cards) ? 1 : 0) +
      (!denariTie && denari[idx] === Math.max(...denari) ? 1 : 0) +
      (!primeTie && primes[idx] === Math.max(...primes) ? 1 : 0)
  )
}

function replaceMaxAt(value: number, suit: number, points: number[]): number[] {
  return points.map((v, i) => (i === suit ? Math.max(value, v) : v))
}

const PRIME_POINTS: { [value: number]: number } = {
  1: 16,
  2: 12,
  3: 13,
  4: 14,
  5: 15,
  6: 18,
  7: 21,
  8: 10,
  9: 10,
  10: 10
}

export function prime(cards: Deck): number {
  return sum(
    cards.reduce<number[]>(
      (points, [value, suit]) =>
        replaceMaxAt(PRIME_POINTS[value], suit, points),
      [0, 0, 0, 0]
    )
  )
}
