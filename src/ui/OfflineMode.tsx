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
  readonly game: State
  readonly playerProfiles: readonly PlayerProfile[]
}

const dealShuffledDeck = (score?: readonly number[], players: 2 | 3 = 2, previousFirstPlayer?: number) =>
  deal(shuffle(deck()), {
    players,
    score,
    previousFirstPlayer: previousFirstPlayer ?? randomFirstPlayer(players),
  })

function createPlayerProfiles(playerOneAvatar: string, count: 2 | 3): readonly PlayerProfile[] {
  return [playerOneAvatar, '🤖', '👾'].slice(0, count).map((avatar) => ({
    avatar,
    canCountCards: Math.random() >= 0.5,
    canLookAhead: false,
    aggression: Math.random() >= 0.5 ? Math.random() * 2 - 1 : undefined,
  }))
}

export function startOfflineSession(
  playerOneAvatar: string,
  count: 2 | 3,
): { readonly session: OfflineSession; readonly redealt: boolean } {
  const playerProfiles = createPlayerProfiles(playerOneAvatar, count)
  let result = dealShuffledDeck(undefined, count)
  let redealt = false

  while (isErr(result)) {
    redealt = true
    result = dealShuffledDeck(undefined, count)
  }

  return { session: { game: result.value, playerProfiles }, redealt }
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
