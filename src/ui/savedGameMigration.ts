import type { State } from '../engine/state'

interface SavedGameState {
  game: State
  playerAvatars: string[]
  playerAggressiveness: readonly number[]
}

type PersistedGameState = Omit<State, 'score'> & {
  score?: readonly number[]
  wins?: readonly number[]
}

export interface LegacySavedGameState {
  game: PersistedGameState
  playerAvatars: string[]
  playerAggressiveness?: readonly number[]
}

export function normalizeSavedGameState(savedGameState: LegacySavedGameState | null): SavedGameState | null {
  if (!savedGameState) return null

  const { game, playerAvatars, playerAggressiveness } = savedGameState
  const { wins, score, ...rest } = game

  return {
    playerAvatars,
    playerAggressiveness: Array.from({ length: playerAvatars.length }, (_, i) => playerAggressiveness?.[i] ?? 0),
    game: {
      ...rest,
      score: score ?? wins ?? Array<number>(playerAvatars.length).fill(0),
    },
  }
}

export function hasLegacyGameState(state: LegacySavedGameState | null): boolean {
  return state != null && (state.playerAggressiveness == null || (state.game.score == null && state.game.wins != null))
}
