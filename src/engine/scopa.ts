import { contains, without, splitAt, splitEvery, sort } from 'ramda'
import { Either, right, left } from 'fp-ts/lib/Either'
import { Deck, Card } from './cards'
import { findMatches } from './match'
import { Player, State, Move } from './state'

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

function next({ card, targets }: Move, game: State): State {
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

const sortCards = sort<Card>(
  ([va, sa], [vb, sb]) => sb * 10 + vb - (sa * 10 + va)
)

export function play(
  { card, targets }: Move,
  game: State
): Either<Error, State> {
  const { table, turn, players } = game

  const hasCard = contains(card, players[turn].hand)

  const possibleTargets = findMatches(card[0], sortCards(table))
  const mustPick = Math.min(...possibleTargets.map(t => t.length))
  const validTargets = possibleTargets.filter(t => t.length === mustPick)

  const autoTargets =
    !targets.length && validTargets.length < 2 ? validTargets[0] || [] : null
  const hasTarget = autoTargets || contains(sortCards(targets), validTargets)

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
