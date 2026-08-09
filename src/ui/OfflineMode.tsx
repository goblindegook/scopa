import { fold, isErr, type Result } from '@pacote/result'
import { shuffle } from '@pacote/shuffle'
import React from 'react'
import { deck } from '../engine/cards'
import { move } from '../engine/opponent'
import { deal, play, randomFirstPlayer } from '../engine/scopa'
import { score } from '../engine/scores'
import type { Move, State } from '../engine/state'
import { type PlayerProfile, Scopa } from './Scopa'

export interface OfflineSession {
  readonly id: string
  readonly game: State
  readonly playerProfiles: readonly PlayerProfile[]
  readonly difficulty: Difficulty
}

const dealShuffledDeck = (score?: readonly number[], players: 2 | 3 = 2, previousFirstPlayer?: number) =>
  deal(shuffle(deck()), {
    players,
    score,
    previousFirstPlayer: previousFirstPlayer ?? randomFirstPlayer(players),
  })

export const DIFFICULTIES = ['easy', 'normal', 'hard', 'expert'] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

const POSTURE: Record<2 | 3, number> = { 2: -1, 3: 1 }

function opponentProfile(difficulty: Difficulty, count: 2 | 3): Omit<PlayerProfile, 'avatar'> {
  switch (difficulty) {
    case 'easy':
      return { aggression: 0, canCountCards: false }
    case 'normal':
      return { aggression: undefined, canCountCards: false }
    case 'hard':
      return { aggression: POSTURE[count], canCountCards: false }
    case 'expert':
      return { aggression: POSTURE[count], canCountCards: true, worlds: 100 }
  }
}

export function createPlayerProfiles(
  playerOneAvatar: string,
  count: 2 | 3,
  difficulty: Difficulty,
): readonly PlayerProfile[] {
  return [playerOneAvatar, '🤖', '👾']
    .slice(0, count)
    .map((avatar, index) => (index === 0 ? { avatar } : { avatar, ...opponentProfile(difficulty, count) }))
}

export function startOfflineSession(
  playerOneAvatar: string,
  count: 2 | 3,
  difficulty: Difficulty = 'normal',
): { readonly session: OfflineSession; readonly redealt: boolean } {
  const playerProfiles = createPlayerProfiles(playerOneAvatar, count, difficulty)
  let result = dealShuffledDeck(undefined, count)
  let redealt = false

  while (isErr(result)) {
    redealt = true
    result = dealShuffledDeck(undefined, count)
  }

  return { session: { id: crypto.randomUUID(), game: result.value, playerProfiles, difficulty }, redealt }
}

interface OfflineModeProps {
  readonly session: OfflineSession
  readonly onGameStateChange: (game: State) => void
  readonly onBack: () => void
  readonly onLeave: () => void
}

export const OfflineMode = ({ session, onGameStateChange, onBack, onLeave: onEnd }: OfflineModeProps) => {
  const apply = React.useCallback(
    (result: Result<State, Error>): Result<State, Error> => {
      fold(onGameStateChange, () => undefined, result)
      return result
    },
    [onGameStateChange],
  )

  const playMove = React.useCallback((playerMove: Move, game: State) => apply(play(playerMove, game)), [apply])

  const startRound = React.useCallback(
    (runningScore?: readonly number[], players: 2 | 3 = 2, previousFirstPlayer?: number) =>
      apply(dealShuffledDeck(runningScore, players, previousFirstPlayer)),
    [apply],
  )

  return (
    <Scopa
      playerId={0}
      initialState={session.game}
      onBack={onBack}
      onReset={onEnd}
      onStart={startRound}
      onPlay={playMove}
      onOpponentTurn={async (state, options) => {
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500))
        return move(state, options)
      }}
      onScore={score}
      playerProfiles={session.playerProfiles}
    />
  )
}
