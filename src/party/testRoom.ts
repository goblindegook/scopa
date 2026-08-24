import type * as Party from 'partykit/server'
import type ScopaServer from './scopa'

export interface Opened {
  readonly connection: Party.Connection
  readonly received: unknown[]
}

export interface TestRoom {
  readonly room: Party.Room
  readonly broadcasts: unknown[]
  readonly open: (server: ScopaServer, sid: string) => Promise<Opened>
  readonly close: (server: ScopaServer, opened: Opened) => Promise<void>
  readonly stored: () => unknown
  readonly alarm: () => number | null
}

export const send = (server: ScopaServer, connection: Party.Connection, message: unknown): Promise<void> =>
  server.onMessage(JSON.stringify(message), connection)

// Only the surface ScopaServer actually touches is implemented. The casts are confined to
// this file so tests never have to know the fake is partial.
export function createTestRoom(): TestRoom {
  const storage = new Map<string, unknown>()
  const inboxes = new Map<string, unknown[]>()
  const connections = new Map<string, Party.Connection>()
  const broadcasts: unknown[] = []
  let alarm: number | null = null
  let nextId = 0

  const room = {
    id: 'test-room',
    env: {},
    // Durable Object storage is structured-clone, not JSON: a stored value must not stay
    // referentially shared with the caller, or a test could mutate the room from outside.
    storage: {
      get: async (key: string) => structuredClone(storage.get(key)),
      put: async (key: string, value: unknown) => {
        storage.set(key, structuredClone(value))
      },
      deleteAll: async () => {
        storage.clear()
      },
      setAlarm: async (time: number) => {
        alarm = time
      },
    },
    // `without` has to be honoured: it is how a human's own move is kept from echoing
    // back to them, which is behaviour the Worker tests assert on.
    broadcast: (message: string, without?: string[]) => {
      broadcasts.push(JSON.parse(message))
      for (const [id, inbox] of inboxes) {
        if (!without?.includes(id)) inbox.push(JSON.parse(message))
      }
    },
    getConnections: () => connections.values(),
  } as unknown as Party.Room

  return {
    room,
    broadcasts,

    async open(server: ScopaServer, sid: string): Promise<Opened> {
      nextId += 1
      const id = `conn-${nextId}`
      const received: unknown[] = []

      const connection = {
        id,
        state: null as unknown,
        setState(next: unknown) {
          ;(this as { state: unknown }).state = next
          return (this as { state: unknown }).state
        },
        send(message: string) {
          received.push(JSON.parse(message))
        },
      } as unknown as Party.Connection

      inboxes.set(id, received)
      connections.set(id, connection)

      // onConnect is what stamps the sid onto connection.state; skipping it would leave
      // every message looking like it came from an unseated stranger.
      await server.onConnect(connection, {
        request: new Request(`https://example.com/parties/main/test-room?sid=${sid}`),
      } as unknown as Party.ConnectionContext)

      return { connection, received }
    },

    async close(server: ScopaServer, opened: Opened): Promise<void> {
      connections.delete(opened.connection.id)
      inboxes.delete(opened.connection.id)
      await server.onClose(opened.connection)
    },

    stored: () => structuredClone(storage.get('room')),
    alarm: () => alarm,
  }
}
