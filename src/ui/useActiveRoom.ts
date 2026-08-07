import React from 'react'

// sessionStorage, not localStorage: the seat this points at is per-tab, since
// `sid` and `avatar` are. A wider scope would offer a resume the session cannot
// honour — a new tab rejoins with a fresh sid and is refused once play started.
const storageKey = 'scopa:mp-active-room'

const read = (): string | null => {
  const stored = window.sessionStorage.getItem(storageKey)
  return stored && stored.length > 0 ? stored : null
}

interface ActiveRoom {
  readonly roomId: string | undefined
  readonly remember: (roomId: string) => void
  readonly forget: () => void
}

export function useActiveRoom(): ActiveRoom {
  const [roomId] = React.useState(read)

  return {
    roomId: roomId ?? undefined,
    remember: React.useCallback((id: string) => window.sessionStorage.setItem(storageKey, id), []),
    forget: React.useCallback(() => window.sessionStorage.removeItem(storageKey), []),
  }
}
