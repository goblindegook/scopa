import { useCallback, useEffect, useMemo, useState } from 'react'
import type { State } from '../engine/state'

type Updater<T> = T | ((current: T) => T)

export function useLocalStorage<T>(key: string, fallback: T): [T, (updater: Updater<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    const raw = window?.localStorage?.getItem?.(`scopa:${key}`) ?? null
    if (raw == null) return fallback
    try {
      return JSON.parse(raw) ?? fallback
    } catch {
      return raw as unknown as T
    }
  })

  const update = useCallback(
    (updater: Updater<T>) => {
      setValue((current) => {
        const next = typeof updater === 'function' ? (updater as (current: T) => T)(current) : updater
        const serialized = JSON.stringify(next)
        // Bailing out keeps a caller that rebuilds its session each render from looping.
        if (serialized === JSON.stringify(current)) return current
        window?.localStorage?.setItem?.(`scopa:${key}`, serialized)
        return next
      })
    },
    [key],
  )

  return [value, update]
}

interface PersistedGameState {
  game: Omit<State, 'score' | 'firstPlayer'> & {
    score?: readonly number[]
    wins?: readonly number[]
    firstPlayer?: number
  }
  playerAvatars: string[]
}

interface SavedPlayerProfile {
  avatar: string
}

interface SavedGameState {
  game: State
  playerProfiles: readonly SavedPlayerProfile[]
}

export function useSavedGameStorage(session: SavedGameState | null) {
  const [persistedGameState, setPersistedGameState] = useLocalStorage<PersistedGameState | null>('saved-game', null)
  const savedGameState = useMemo(() => normalizeSavedGameState(persistedGameState), [persistedGameState])

  useEffect(() => {
    if (!session || session.game.state === 'initial') return
    setPersistedGameState({
      game: session.game,
      playerAvatars: session.playerProfiles.map((profile) => profile.avatar),
    })
  }, [session, setPersistedGameState])

  useEffect(() => {
    if (!hasLegacyGameState(persistedGameState) || !savedGameState) return

    setPersistedGameState({
      game: savedGameState.game,
      playerAvatars: savedGameState.playerProfiles.map((profile) => profile.avatar),
    })
  }, [persistedGameState, savedGameState, setPersistedGameState])

  const clearSavedGame = useCallback(() => setPersistedGameState(null), [setPersistedGameState])

  return { savedGameState, clearSavedGame }
}

function normalizeSavedGameState(savedGameState: PersistedGameState | null): SavedGameState | null {
  if (!savedGameState) return null

  const { game, playerAvatars } = savedGameState
  const { wins, score, firstPlayer, ...rest } = game

  return {
    playerProfiles: playerAvatars.map((avatar, _i) => ({
      avatar,
    })),
    game: {
      ...rest,
      score: score ?? wins ?? Array<number>(playerAvatars.length).fill(0),
      firstPlayer: firstPlayer ?? rest.turn,
    },
  }
}

function hasLegacyGameState(state: PersistedGameState | null): boolean {
  return state != null && state.game.score == null && state.game.wins != null
}
