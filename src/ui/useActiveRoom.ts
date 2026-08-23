import React from 'react'

// sessionStorage, not localStorage: the seat this points at is per-tab, since
// `sid` and `avatar` are. A wider scope would offer a resume the session cannot
// honour — a new tab rejoins with a fresh sid and is refused once play started.
const storageKey = 'scopa:mp-active-room'

export interface ActiveRoomGame {
  readonly roomId: string
  readonly avatars: readonly string[]
  readonly score: readonly number[]
  readonly size: number
}

const read = (): ActiveRoomGame | null => {
  const stored = window.sessionStorage.getItem(storageKey)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

interface ActiveRoom {
  readonly game: ActiveRoomGame | null
  readonly remember: (game: ActiveRoomGame) => void
  readonly forget: () => void
}

export function useActiveRoom(): ActiveRoom {
  return {
    game: read(),
    remember: React.useCallback((game: ActiveRoomGame) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(game))
    }, []),
    forget: React.useCallback(() => window.sessionStorage.removeItem(storageKey), []),
  }
}
