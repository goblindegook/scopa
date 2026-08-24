import { fold, isErr, type Result } from '@pacote/result'
import { shuffle } from '@pacote/shuffle'
import React from 'react'
import { AI_AVATARS, aiOptions, type Difficulty } from '../engine/ai'
import { deck } from '../engine/cards'
import { move } from '../engine/opponent'
import { deal, play, randomFirstPlayer } from '../engine/scopa'
import { score } from '../engine/scores'
import type { PlayerCount } from '../engine/sides'
import type { Move, State } from '../engine/state'
import { type PlayerProfile, Scopa } from './pages/Scopa'

export interface OfflineSession {
  readonly id: string
  readonly game: State
  readonly playerProfiles: readonly PlayerProfile[]
  readonly difficulty: Difficulty
}

export { DIFFICULTIES, type Difficulty } from '../engine/ai'

const dealShuffledDeck = (score?: readonly number[], players: PlayerCount = 2, previousFirstPlayer?: number) =>
  deal(shuffle(deck()), {
    players,
    score,
    previousFirstPlayer: previousFirstPlayer ?? randomFirstPlayer(players),
  })

export function createPlayerProfiles(
  playerOneAvatar: string,
  count: number,
  difficulty: Difficulty,
): readonly PlayerProfile[] {
  return [playerOneAvatar, ...AI_AVATARS]
    .slice(0, count)
    .map((avatar, index) => (index === 0 ? { avatar } : { avatar, ...aiOptions(difficulty, count) }))
}

export function startOfflineSession(
  playerOneAvatar: string,
  count: PlayerCount,
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
    (runningScore?: readonly number[], players: PlayerCount = 2, previousFirstPlayer?: number) =>
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
