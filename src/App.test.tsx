import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import App from './App'

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

  expect(await screen.findByRole('button', { name: /new local game\s*2 players/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /new local game\s*3 players/i })).toBeInTheDocument()
})

test('starts a local game from the title screen', async () => {
  render(<App />)

  fireEvent.click(await screen.findByRole('button', { name: /new local game\s*2 players/i }))

  expect(await screen.findByLabelText('Game score')).toBeInTheDocument()
})

test('uses the selected avatar in the local game header', async () => {
  render(<App />)

  fireEvent.click(await screen.findByRole('button', { name: 'Select avatar 🦊' }))
  fireEvent.click(screen.getByRole('button', { name: /new local game\s*2 players/i }))

  expect(await screen.findByText('🦊 0')).toBeInTheDocument()
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

  expect(await screen.findByText('🦊 4')).toBeInTheDocument()
  expect(screen.getByText('🤖 2')).toBeInTheDocument()
})

test('starting a new local game ignores the saved running score', async () => {
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

  fireEvent.click(await screen.findByRole('button', { name: /new local game\s*2 players/i }))

  expect(await screen.findByText('🐵 0')).toBeInTheDocument()
  expect(screen.getByText('🤖 0')).toBeInTheDocument()
})
