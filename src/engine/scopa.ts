import { windowed } from '@pacote/array'
import { Err, Ok, type Result } from '@pacote/result'
import { includes, splitAt, without } from 'ramda'
import { findCaptures } from './capture.ts'
import type { Pile } from './cards'
import type { Move, Player, State } from './state'

interface Options {
  players?: 2 | 3 | 4 | 6
}

const DEFAULT_OPTIONS: Required<Options> = {
  players: 2,
}

const createPlayers = (cards: Pile): readonly Player[] =>
  windowed(3, 3, cards).map((hand, index) => ({
    id: index,
    hand,
    pile: [],
    scope: 0,
  }))

export function deal(cards: Pile, options?: Options): Result<State, Error> {
  const { players } = { ...DEFAULT_OPTIONS, ...options }
  const [table, rest] = splitAt(4, cards)
  const dealtKings = table.filter(([value]) => value === 10).length

  const [playerCards, pile] = splitAt(players * 3, rest)

  return dealtKings <= 2
    ? Ok({
        state: 'play',
        turn: Math.floor(Math.random() * players),
        players: createPlayers(playerCards),
        pile,
        table,
      })
    : Err(Error('More than two kings on the table. Deal again.'))
}

function next({ card, capture }: Move, game: State): State {
  const { turn, table, players, pile } = game

  const tableAfterMove = capture.length
    ? without(capture, table)
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
          pile: [...player.pile, ...capture, ...(capture.length ? [card] : [])],
          scope: tableAfterMove.length ? player.scope : player.scope + 1,
        },
  )

  const nextTurn = turn < players.length - 1 ? turn + 1 : 0
  const nextState = nextPlayers[nextTurn].hand.length ? 'play' : 'stop'

  return {
    state: nextState,
    pile: nextPile,
    table: nextTable,
    players: nextPlayers,
    turn: nextTurn,
  }
}

const sort = (cards: Pile) =>
  cards.toSorted(([va, sa], [vb, sb]) => sb * 10 + vb - (sa * 10 + va))

export function play(
  { card, capture }: Move,
  game: State,
): Result<State, Error> {
  const { table, turn, players } = game

  const hasCard = includes(card, players[turn].hand)

  const validCaptures = findCaptures(card[0], sort(table))

  const autoCapture =
    !capture.length && validCaptures.length < 2 ? validCaptures[0] || [] : null
  const canCapture = autoCapture ?? includes(sort(capture), validCaptures)

  return hasCard
    ? canCapture
      ? Ok(next({ card, capture: autoCapture ?? capture }, game))
      : Err(
          capture.length
            ? Error('The targeted cards may not be captured.')
            : Error('Choose the cards to capture.'),
        )
    : Err(Error('Not your turn.'))
}
