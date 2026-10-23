import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { env, exports } from 'cloudflare:workers'
import { vi } from 'vitest'

export interface Client {
  readonly received: unknown[]
  readonly send: (message: unknown) => void
  readonly close: () => void
}

const ALLOWED_ORIGIN = 'http://localhost:5173'

export const upgrade = (room: string, sid: string, origin = ALLOWED_ORIGIN): Promise<Response> =>
  exports.default.fetch(`https://scopa.test/parties/main/${room}?sid=${encodeURIComponent(sid)}`, {
    headers: { Upgrade: 'websocket', Origin: origin },
  })

export async function connect(room: string, sid: string): Promise<Client> {
  const response = await upgrade(room, sid)
  const socket = response.webSocket
  if (!socket) throw new Error(`Upgrade refused with ${response.status}`)
  socket.accept()

  const received: unknown[] = []
  socket.addEventListener('message', (event) => {
    received.push(JSON.parse(String(event.data)))
  })

  return {
    received,
    send: (message) => socket.send(JSON.stringify(message)),
    close: () => socket.close(1000),
  }
}

export const lastOfType = (messages: readonly unknown[], type: string): unknown =>
  messages.filter((message) => (message as { type: string }).type === type).at(-1)

// Socket delivery is asynchronous, so a test can only observe a reply by waiting for it.
export const arrival = (client: Client, type: string): Promise<unknown> =>
  vi.waitFor(() => {
    const message = lastOfType(client.received, type)
    if (message === undefined) throw new Error(`No '${type}' message yet`)
    return message
  })

const stub = (room: string) => env.Main.getByName(room)

export const stored = (room: string): Promise<unknown> =>
  runInDurableObject(stub(room), (_, state) => state.storage.get('room'))

export const store = (room: string, value: unknown): Promise<void> =>
  runInDurableObject(stub(room), (_, state) => state.storage.put('room', value))

export const runAlarm = (room: string): Promise<boolean> => runDurableObjectAlarm(stub(room))
