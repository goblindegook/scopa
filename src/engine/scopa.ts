import { contains, without, splitAt, splitEvery, uniq, sum } from 'ramda'
import { Either, right, left } from 'fp-ts/lib/Either'
import { Deck, Card, Suit } from './cards'
import { findMatches } from './match'

type State = 'play' | 'stop'

type Player = {
  hand: Deck
  pile: Deck
  scope: number
}

export type Game = {
  state: State
  turn: number
  pile: Deck
  players: ReadonlyArray<Player>
  table: Deck
}

type Move = {
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

export function deal(cards: Deck, options?: Options): Either<Error, Game> {
  const { players } = { ...DEFAULT_OPTIONS, ...options }
  const [table, rest] = splitAt(4, cards)
  const isValid = table.filter(([value]) => value === 10).length <= 2

  const [playerCards, pile] = splitAt(players * 3, rest)

  return isValid
    ? right<Error, Game>({
        state: 'play',
        turn: Math.floor(Math.random() * players),
        players: createPlayers(playerCards, players),
        pile,
        table
      })
    : left(Error())
}

function next({ card, targets = [] }: Move, game: Game): Game {
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
  const nextState: State = nextPlayers[nextTurn].hand.length ? 'play' : 'stop'

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
  game: Game
): Either<Error, Game> {
  const { table, turn, players } = game

  const hasCard = contains(card, players[turn].hand)

  const validTargets = findMatches(card[0], table)
  const defaultTargets = validTargets.length < 2 ? validTargets[0] || [] : null
  const hasTarget = defaultTargets || contains(targets, validTargets)

  return hasCard && hasTarget
    ? right(next({ card, targets: defaultTargets || targets }, game))
    : left(Error())
}

export function score(game: Game): Score {
  const cards = game.players.map(({ pile }) => pile.length)
  const cardTie = uniq(cards).length === 1

  const denari = game.players.map(
    ({ pile }) => pile.filter(([value, suit]) => suit === Suit.DENARI).length
  )
  const denariTie = uniq(denari).length === 1

  return game.players.map(
    ({ scope, pile }, idx) =>
      scope +
      (contains([7, Suit.DENARI], pile) ? 1 : 0) +
      (!cardTie && cards[idx] === Math.max(...cards) ? 1 : 0) +
      (!denariTie && denari[idx] === Math.max(...denari) ? 1 : 0)
  )
}

function replaceMaxAt(value: number, index: number, list: number[]): number[] {
  return list.map((v, i) => (i === index ? Math.max(value, v) : v))
}

export function prime(cards: Deck): number {
  return sum(
    cards.reduce<number[]>(
      (points, [value, suit]) =>
        replaceMaxAt(
          value === 7
            ? 21
            : value === 6
            ? 18
            : value === 1
            ? 16
            : value === 5
            ? 15
            : value === 4
            ? 14
            : value === 3
            ? 13
            : value === 2
            ? 12
            : 10,
          suit,
          points
        ),
      [0, 0, 0, 0]
    )
  )
}
