import { contains, without, range } from 'ramda'
import { Either, right, left } from 'fp-ts/lib/Either'
import { Deck, Card } from './cards'
import { findMatches } from './match'

type Player = {
  hand: Deck
  pile: Deck
  scope: number
}

export type Game = {
  turn: number
  pile: Deck
  players: ReadonlyArray<Player>
  table: Deck
}

type Move = {
  card: Card
  targets?: Deck
}

type Options = {
  players?: 2 | 3 | 4 | 6
}

const DEFAULT_OPTIONS: Required<Options> = {
  players: 2
}

const createPlayer = (hand: Deck): Player => ({ hand, pile: [], scope: 0 })

const createPlayers = (cards: Deck, n: number): ReadonlyArray<Player> =>
  range(0, n).map(i => {
    return createPlayer(cards.slice(i * 3 + 4, i * 3 + 7))
  })

export function deal(cards: Deck, options?: Options): Either<Error, Game> {
  const { players } = { ...DEFAULT_OPTIONS, ...options }
  const table = cards.slice(0, 4)
  const isValid = table.filter(([value]) => value === 10).length <= 2

  return isValid
    ? right({
        turn: Math.floor(Math.random() * players),
        players: createPlayers(cards, players),
        pile: cards.slice(players * 3 + 4),
        table
      })
    : left(Error())
}

function next({ card, targets = [] }: Move, game: Game): Game {
  const { turn, table, players } = game

  const nextTable = targets.length ? without(targets, table) : [...table, card]
  const nextTurn = turn < players.length - 1 ? turn + 1 : 0

  const nextPlayers = players.map((player, idx) =>
    idx === turn
      ? {
          ...player,
          hand: without([card], player.hand),
          pile: [...player.pile, ...targets, ...(targets.length ? [card] : [])],
          scope: nextTable.length ? player.scope : player.scope + 1
        }
      : player
  )

  return {
    ...game,
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
