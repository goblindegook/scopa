import type { PartySocket } from 'partysocket'
import { usePartySocket } from 'partysocket/react'
import React from 'react'
import type { Move, State } from '../engine/state'

function isLocalHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return true
  if (hostname.startsWith('10.')) return true
  if (hostname.startsWith('192.168.')) return true

  if (!hostname.startsWith('172.')) return false

  const secondOctet = Number(hostname.split('.')[1])
  return secondOctet >= 16 && secondOctet <= 31
}

const PARTYKIT_HOST = (() => {
  return import.meta.env.PARTYKIT_HOST?.trim() || (isLocalHostname(window.location.hostname) ? '127.0.0.1:1999' : '')
})()

interface MoveQueue<T> {
  readonly push: (item: T) => void
  readonly next: () => Promise<T>
  readonly clear: () => void
}

function createMoveQueue<T>(): MoveQueue<T> {
  const buffered: T[] = []
  let waiting: ((item: T) => void) | null = null

  return {
    push(item: T) {
      const resolve = waiting
      waiting = null
      if (resolve) resolve(item)
      else buffered.push(item)
    },

    next() {
      const queued = buffered.shift()
      if (queued !== undefined) return Promise.resolve(queued)

      // One waiter, not a queue: a fresh ask supersedes an abandoned one, which would
      // otherwise swallow the next move and hang the turn.
      return new Promise<T>((resolve) => {
        waiting = resolve
      })
    },

    // A snapshot supersedes buffered moves; a live waiter still needs the next real one.
    clear() {
      buffered.length = 0
    },
  }
}

export interface LobbyPlayer {
  readonly avatar: string
  readonly connected: boolean
  readonly confirmed: boolean
}

type ServerMessage =
  | { readonly type: 'seated'; readonly index: number }
  | { readonly type: 'lobby'; readonly players: readonly LobbyPlayer[] }
  | { readonly type: 'move'; readonly move: Move }
  | { readonly type: 'state'; readonly state: State }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'ended' }

interface MultiplayerSessionOptions {
  readonly roomId: string
  readonly initialAvatar?: string | null
}

export interface MultiplayerSession {
  readonly avatar: string | null
  readonly lobby: readonly LobbyPlayer[]
  readonly state: State | null
  readonly seat: number | null
  readonly ended: boolean
  readonly error: string | null
  readonly chooseAvatar: (avatar: string) => void
  readonly clearSession: () => void
  readonly nextMove: () => Promise<Move>
  readonly start: () => void
  readonly confirm: () => void
  readonly sendMove: (move: Move) => void
}

const sidStorageKey = (roomId: string) => `scopa:mp-sid-${roomId}`
const avatarStorageKey = (roomId: string) => `scopa:mp-avatar-${roomId}`

function normalizeStoredValue(value: string | null | undefined): string | null {
  return value && value.length > 0 ? value : null
}

export function useMultiplayerSession({ roomId, initialAvatar }: MultiplayerSessionOptions): MultiplayerSession {
  const [avatar, setAvatar] = React.useState<string | null>(
    () =>
      normalizeStoredValue(initialAvatar) ??
      normalizeStoredValue(window.sessionStorage.getItem(avatarStorageKey(roomId))),
  )
  const [sid, setSid] = React.useState<string>(() => window.sessionStorage.getItem(sidStorageKey(roomId)) ?? '')
  const [lobby, setLobby] = React.useState<readonly LobbyPlayer[]>([])
  const [state, setState] = React.useState<State | null>(null)
  const [seat, setSeat] = React.useState<number | null>(null)
  const [ended, setEnded] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const nextAvatar = normalizeStoredValue(initialAvatar)
    if (!nextAvatar) return

    if (window.sessionStorage.getItem(avatarStorageKey(roomId)) !== nextAvatar) {
      window.sessionStorage.setItem(avatarStorageKey(roomId), nextAvatar)
    }

    if (avatar !== nextAvatar) {
      setAvatar(nextAvatar)
    }
  }, [avatar, initialAvatar, roomId])

  React.useEffect(() => {
    if (!avatar || sid) return
    const nextSid = crypto.randomUUID()
    window.sessionStorage.setItem(sidStorageKey(roomId), nextSid)
    setSid(nextSid)
  }, [avatar, roomId, sid])

  const queue = React.useRef<MoveQueue<Move> | null>(null)
  if (queue.current === null) queue.current = createMoveQueue<Move>()
  const moves = queue.current

  const socket: PartySocket = usePartySocket({
    enabled: Boolean(PARTYKIT_HOST && sid && avatar),
    host: PARTYKIT_HOST,
    room: roomId,
    query: sid ? { sid } : undefined,
    onOpen() {
      if (!avatar) return
      socket.send(JSON.stringify({ type: 'join', avatar }))
    },
    onMessage(event: MessageEvent<string>) {
      const message: ServerMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'seated':
          setSeat(message.index)
          break

        case 'lobby':
          setLobby(message.players)
          break

        case 'ended':
          setEnded(true)
          break

        case 'state':
          moves.clear()
          setState(message.state)
          break

        case 'move':
          moves.push(message.move)
          break

        case 'error':
          setError(message.message)
          if (seat === null) {
            window.sessionStorage.removeItem(avatarStorageKey(roomId))
            setAvatar(null)
          }
          break
      }
    },
  })

  const nextMove = React.useCallback((): Promise<Move> => moves.next(), [moves])

  const chooseAvatar = React.useCallback(
    (nextAvatar: string) => {
      window.sessionStorage.setItem(avatarStorageKey(roomId), nextAvatar)
      setError(null)
      setAvatar(nextAvatar)
    },
    [roomId],
  )

  const clearSession = React.useCallback(() => {
    window.sessionStorage.removeItem(avatarStorageKey(roomId))
    window.sessionStorage.removeItem(sidStorageKey(roomId))
    setAvatar(null)
    setSid('')
    setLobby([])
    setState(null)
    setSeat(null)
    setEnded(false)
    setError(null)
    moves.clear()
  }, [moves, roomId])

  const send = React.useCallback(
    (message: unknown) => {
      if (!sid) return
      socket.send(JSON.stringify(message))
    },
    [sid, socket],
  )

  return {
    avatar,
    lobby,
    state,
    seat,
    ended,
    error,
    chooseAvatar,
    clearSession,
    nextMove,
    start: React.useCallback(() => send({ type: 'start' }), [send]),
    confirm: React.useCallback(() => send({ type: 'confirm' }), [send]),
    sendMove: React.useCallback((move: Move) => send({ type: 'move', move }), [send]),
  }
}
