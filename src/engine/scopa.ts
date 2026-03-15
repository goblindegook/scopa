import { windowed } from '@pacote/array'
import { Err, Ok, type Result } from '@pacote/result'
import { findCaptures } from './capture.ts'
import { hasCard, isSame, type Pile } from './cards'
import { score } from './scores.ts'
import type { Move, Player, State } from './state'

interface Options {
  players?: 2 | 3 | 4 | 6
  wins?: readonly number[]
}

const DEFAULT_PLAYERS = 2

const createPlayers = (cards: Pile): readonly Player[] =>
  windowed(3, 3, cards).map((hand, index) => ({
    id: index,
    hand,
    pile: [],
    scope: 0,
  }))

const splitAt = <T>(index: number, list: readonly T[]): readonly [readonly T[], readonly T[]] => [
  list.slice(0, index),
  list.slice(index),
]

const withoutCards = (toRemove: readonly Pile[number][], cards: readonly Pile[number][]): readonly Pile[number][] =>
  cards.filter((card) => !toRemove.some((candidate) => isSame(candidate, card)))

const hasCapture = (captures: readonly Pile[], capture: readonly Pile[number][]): boolean =>
  captures.some((candidate) => candidate.length === capture.length && candidate.every((card) => hasCard(capture, card)))

function computeHandWinner(players: readonly Player[]): number | null {
  const scores = score(players)
  const maxTotal = Math.max(...scores.map((s) => s.total))
  const winners = scores.filter((s) => s.total === maxTotal)
  return winners.length === 1 ? winners[0].playerId : null
}

export function deal(cards: Pile, options?: Options): Result<State, Error> {
  const players = options?.players ?? DEFAULT_PLAYERS
  const wins = options?.wins ?? Array.from({ length: players }, () => 0)
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
        lastCaptured: [],
        wins,
      })
    : Err(Error('More than two kings on the table. Deal again.'))
}

function next({ card, capture }: Move, game: State): State {
  const { turn, table, players, pile } = game
  const lastCapturer = capture.length ? turn : game.lastCapturer

  const tableAfterMove = capture.length ? withoutCards(capture, table) : [...table, card]

  const handAfterMove = withoutCards([card], players[turn].hand)

  const [nextHand, pileAfterDeal] = handAfterMove.length ? [handAfterMove, pile] : splitAt(3, pile)

  const [nextTable, nextPile] = tableAfterMove.length ? [tableAfterMove, pileAfterDeal] : splitAt(4, pileAfterDeal)

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

  const finalPlayers =
    nextState === 'stop' && lastCapturer != null
      ? nextPlayers.map((player, idx) =>
          idx === lastCapturer ? { ...player, pile: [...player.pile, ...nextTable] } : player,
        )
      : nextPlayers

  const finalTable = nextState === 'stop' && lastCapturer != null ? [] : nextTable

  if (nextState === 'stop') {
    const winner = computeHandWinner(finalPlayers)
    const wins = game.wins.map((w, idx) => (idx === winner ? w + 1 : w))
    return {
      state: nextState,
      pile: nextPile,
      table: finalTable,
      players: finalPlayers,
      turn: nextTurn,
      lastCaptured: capture,
      lastCapturer,
      wins,
    }
  }

  return {
    state: nextState,
    pile: nextPile,
    table: finalTable,
    players: finalPlayers,
    turn: nextTurn,
    lastCaptured: capture,
    lastCapturer,
    wins: game.wins,
  }
}

export function play({ card, capture }: Move, game: State): Result<State, Error> {
  const { table, turn, players } = game

  if (!hasCard(players[turn].hand, card)) {
    return Err(Error('Not your turn.'))
  }

  const validCaptures = findCaptures(card[0], table)

  if (!capture.length && validCaptures.length > 1) {
    return Err(Error('Choose the cards to capture.'))
  }

  if (capture.length && !hasCapture(validCaptures, capture)) {
    return Err(Error('The chosen cards may not be captured.'))
  }

  if (!capture.length && validCaptures.length === 0) {
    return Ok(next({ card, capture: [] }, game))
  }

  return Ok(next({ card, capture: capture.length ? capture : validCaptures[0] }, game))
}
