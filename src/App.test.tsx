import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest'
import App from './App'
import { coppe, denari, spade } from './engine/cards'
import type { State } from './engine/state'

type SocketOptions = {
  readonly onMessage?: (event: MessageEvent<string>) => void
}

const mockedSocket = vi.hoisted(() => ({
  options: null as SocketOptions | null,
  send: vi.fn(),
}))

vi.mock('partysocket/react', () => ({
  usePartySocket: vi.fn((options: SocketOptions) => {
    mockedSocket.options = options
    return { send: mockedSocket.send }
  }),
}))

const onlineState: State = {
  state: 'play',
  turn: 0,
  firstPlayer: 0,
  pile: [],
  players: [
    { id: 0, hand: [denari(1)], pile: [], scope: 0 },
    { id: 1, hand: [coppe(2)], pile: [], scope: 0 },
  ],
  table: [spade(3)],
  lastTaken: [],
  score: [0, 0],
}

function receive(message: unknown) {
  act(() => {
    mockedSocket.options?.onMessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))
  })
}

function joinOnlineGame() {
  window.sessionStorage.setItem('scopa:mp-sid-room', 'sid')
  window.sessionStorage.setItem('scopa:mp-avatar-room', '🦊')
  window.history.replaceState({}, '', '/?room=room')

  render(<App />)

  receive({
    type: 'lobby',
    players: [
      { avatar: '🦊', connected: true, confirmed: false },
      { avatar: '🐵', connected: true, confirmed: false },
    ],
  })
  receive({ type: 'seated', index: 0 })
  receive({ type: 'state', state: onlineState })
}

const OriginalImage = window.Image

beforeAll(() => {
  class MockImage {
    onload: null | (() => void) = null
    onerror: null | (() => void) = null

    set src(_value: string) {
      setTimeout(() => this.onload?.(), 0)
    }
  }

  window.Image = MockImage as typeof window.Image
})

afterAll(() => {
  window.Image = OriginalImage
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/')
  mockedSocket.options = null
  mockedSocket.send.mockReset()
})

test('render without crashing', () => {
  const div = document.createElement('div')
  const root = createRoot(div)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  root.unmount()
})

test('shows the title screen on load', async () => {
  render(<App />)

  expect(await screen.findByRole('button', { name: /offline game/i })).toBeInTheDocument()
  expect(screen.getByRole('combobox')).toBeInTheDocument()
})

test('starts a local game from the title screen', async () => {
  render(<App />)

  fireEvent.click(await screen.findByRole('button', { name: /offline game/i }))

  expect(await screen.findByLabelText('Game score')).toBeInTheDocument()
})

test('uses the selected avatar in the local game header', async () => {
  render(<App />)

  fireEvent.click(await screen.findByRole('button', { name: 'Select avatar 🦊' }))
  fireEvent.click(screen.getByRole('button', { name: /offline game/i }))

  expect(await screen.findByLabelText('🦊 0')).toBeInTheDocument()
})

test('resumes a saved local game from the title screen', async () => {
  window.localStorage.setItem(
    'scopa:saved-game',
    JSON.stringify({
      game: {
        state: 'play',
        turn: 0,
        firstPlayer: 0,
        score: [4, 2],
        players: [
          { id: 0, hand: [[1, 0]], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        pile: [],
        table: [],
        lastTaken: [],
      },
      playerAvatars: ['🦊', '🤖'],
    }),
  )

  render(<App />)

  fireEvent.click(await screen.findByRole('button', { name: /resume/i }))

  expect(await screen.findByLabelText('🦊 4')).toBeInTheDocument()
  expect(screen.getByLabelText('🤖 2')).toBeInTheDocument()
})

test('opens the title screen over a local game and resumes it in place', async () => {
  render(<App />)

  fireEvent.click(await screen.findByRole('button', { name: 'Select avatar 🦊' }))
  fireEvent.click(screen.getByRole('button', { name: /offline game/i }))
  expect(await screen.findByLabelText('🦊 0')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Scopa' }))
  expect(await screen.findByRole('button', { name: /offline game/i })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /resume\s*🦊 0 · 🤖 0/i }))

  expect(screen.getByLabelText('🦊 0')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /offline game/i })).not.toBeInTheDocument()
})

test('starting a offline game from the overlay replaces the game in progress', async () => {
  render(<App />)

  fireEvent.click(await screen.findByRole('button', { name: 'Select avatar 🦊' }))
  fireEvent.click(screen.getByRole('button', { name: /offline game/i }))
  expect(await screen.findByLabelText('🦊 0')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Scopa' }))
  fireEvent.change(await screen.findByRole('combobox'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: /offline game/i }))

  expect(await screen.findByLabelText('👾 0')).toBeInTheDocument()
})

test('opens the title screen over an online game without touching the URL', async () => {
  joinOnlineGame()

  expect(await screen.findByLabelText('Game score')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Scopa' }))

  expect(await screen.findByRole('button', { name: /offline game/i })).toBeInTheDocument()
  expect(window.location.search).toBe('?room=room')
})

test('resumes the online game from the overlay with its state intact', async () => {
  joinOnlineGame()

  expect(await screen.findByLabelText('Game score')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Scopa' }))
  fireEvent.click(await screen.findByRole('button', { name: /online game · resume\s*🦊 0 · 🐵 0/i }))

  expect(screen.getByLabelText('Game score')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /offline game/i })).not.toBeInTheDocument()
})

test('starting a local game from the overlay leaves the online game behind', async () => {
  joinOnlineGame()

  expect(await screen.findByLabelText('Game score')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Scopa' }))
  fireEvent.click(await screen.findByRole('button', { name: /offline game/i }))

  expect(await screen.findAllByLabelText('Game score')).toHaveLength(1)
  expect(window.location.search).toBe('')
  expect(window.sessionStorage.getItem('scopa:mp-sid-room')).toBeNull()
  expect(window.sessionStorage.getItem('scopa:mp-avatar-room')).toBeNull()
  expect(window.sessionStorage.getItem('scopa:mp-active-room')).toBeNull()
})

test('starting a offline game ignores the saved running score', async () => {
  window.localStorage.setItem(
    'scopa:saved-game',
    JSON.stringify({
      game: {
        state: 'play',
        turn: 0,
        firstPlayer: 0,
        score: [4, 2],
        players: [
          { id: 0, hand: [[1, 0]], pile: [], scope: 0 },
          { id: 1, hand: [], pile: [], scope: 0 },
        ],
        pile: [],
        table: [],
        lastTaken: [],
      },
      playerAvatars: ['🦊', '🤖'],
    }),
  )

  render(<App />)

  fireEvent.click(await screen.findByRole('button', { name: /offline game/i }))

  expect(await screen.findByLabelText('🐵 0')).toBeInTheDocument()
  expect(screen.getByLabelText('🤖 0')).toBeInTheDocument()
})
