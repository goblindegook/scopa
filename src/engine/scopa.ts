import { windowed } from '@pacote/array'
import { Err, Ok, type Result } from '@pacote/result'
import { hasCard, isSame, type Pile } from './cards'
import { findCardsToTake } from './move.ts'
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

const hasTakenCards = (allowedCards: readonly Pile[], cardsToTake: readonly Pile[number][]): boolean =>
  allowedCards.some(
    (candidate) => candidate.length === cardsToTake.length && candidate.every((card) => hasCard(cardsToTake, card)),
  )

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
        lastTaken: [],
        wins,
      })
    : Err(Error('More than two kings on the table. Deal again.'))
}

function next({ card, take }: Move, game: State): State {
  const { turn, table, players, pile } = game
  const lastTaker = take.length ? turn : game.lastTaker

  const nextTable = take.length ? withoutCards(take, table) : [...table, card]

  const handAfterMove = withoutCards([card], players[turn].hand)

  const nextTurn = turn > 0 ? turn - 1 : players.length - 1
  const allHandsEmpty =
    handAfterMove.length === 0 && players.every((player, idx) => idx === turn || player.hand.length === 0)
  const isLastMove = allHandsEmpty && pile.length === 0

  const playersAfterMove = players.map((player, idx) =>
    idx !== turn
      ? player
      : {
          ...player,
          hand: handAfterMove,
          pile: [...player.pile, ...take, ...(take.length ? [card] : [])],
          scope: nextTable.length || isLastMove ? player.scope : player.scope + 1,
        },
  )

  const cardsPerPlayer = Math.min(3, Math.floor(pile.length / players.length))
  const [dealCards, remainingPile] = splitAt(players.length * cardsPerPlayer, pile)
  const [nextPlayers, nextPile] =
    allHandsEmpty && pile.length > 0
      ? [
          playersAfterMove.map((player, idx) => ({
            ...player,
            hand: dealCards.slice(idx * cardsPerPlayer, (idx + 1) * cardsPerPlayer),
          })),
          remainingPile,
        ]
      : [playersAfterMove, pile]

  const nextState = nextPlayers[nextTurn].hand.length ? 'play' : 'stop'

  const finalPlayers =
    nextState === 'stop' && lastTaker != null
      ? nextPlayers.map((player, idx) =>
          idx === lastTaker ? { ...player, pile: [...player.pile, ...nextTable] } : player,
        )
      : nextPlayers

  const finalTable = nextState === 'stop' && lastTaker != null ? [] : nextTable

  if (nextState === 'stop') {
    const winner = computeHandWinner(finalPlayers)
    const wins = game.wins.map((w, idx) => (idx === winner ? w + 1 : w))
    return {
      state: nextState,
      pile: nextPile,
      table: finalTable,
      players: finalPlayers,
      turn: nextTurn,
      lastTaken: take,
      lastTaker,
      wins,
    }
  }

  return {
    state: nextState,
    pile: nextPile,
    table: finalTable,
    players: finalPlayers,
    turn: nextTurn,
    lastTaken: take,
    lastTaker,
    wins: game.wins,
  }
}

export function play({ card, take }: Move, game: State): Result<State, Error> {
  const { table, turn, players } = game

  if (!hasCard(players[turn].hand, card)) {
    return Err(Error('Not your turn.'))
  }

  const validTakes = findCardsToTake(card[0], table)

  if (!take.length && validTakes.length > 1) {
    return Err(Error('Choose the cards to take.'))
  }

  if (take.length && !hasTakenCards(validTakes, take)) {
    return Err(Error('The chosen cards may not be taken.'))
  }

  if (!take.length && validTakes.length === 0) {
    return Ok(next({ card, take: [] }, game))
  }

  return Ok(next({ card, take: take.length ? take : validTakes[0] }, game))
}
