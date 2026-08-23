import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '../i18n'
import { TitleScreen } from './TitleScreen'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

const renderTitleScreen = (props: Partial<React.ComponentProps<typeof TitleScreen>> = {}) =>
  render(<TitleScreen loadingProgress={1} onStart={vi.fn()} {...props} />)

describe('TitleScreen', () => {
  test('offers no resume option when there is nothing to resume', () => {
    renderTitleScreen()

    expect(screen.queryByText(/resume/i)).not.toBeInTheDocument()
  })

  test('offers every supported player count as a pressed button choice', () => {
    renderTitleScreen()

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /select player count/i }).map((button) => button.textContent)).toEqual(
      ['1 × 1', '1 × 1 × 1', '2 × 2', '2 × 2 × 2'],
    )
    expect(screen.getByLabelText('Select player count 1 × 1')).toHaveAttribute('aria-pressed', 'true')
  })

  test('exposes an accessible name for the start-offline-game button', () => {
    renderTitleScreen()

    expect(screen.getByRole('button', { name: /offline game/i })).toBeInTheDocument()
  })

  test('exposes an accessible name for the resume button', () => {
    renderTitleScreen({
      resume: { kind: 'local', avatars: ['🐵', '🤖'], score: [4, 2], onResume: vi.fn() },
    })

    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
  })

  test('starts an online room at the selected player count', () => {
    const onStartMultiplayer = vi.fn()
    renderTitleScreen({ onStartMultiplayer })

    fireEvent.click(screen.getByLabelText('Select player count 2 × 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Online game' }))

    expect(onStartMultiplayer).toHaveBeenCalledWith('🐵', 4)
  })

  test('places the start actions before the resume action', () => {
    renderTitleScreen({
      onStartMultiplayer: vi.fn(),
      resume: { kind: 'local', avatars: ['🐵', '🤖'], score: [4, 2], onResume: vi.fn() },
    })

    const buttons = screen.getAllByRole('button').map((button) => button.textContent)
    expect(buttons.indexOf('Offline game')).toBeLessThan(buttons.findIndex((text) => text?.includes('Resume')))
    expect(buttons.indexOf('Online game')).toBeLessThan(buttons.findIndex((text) => text?.includes('Resume')))
  })

  test('labels the language switcher in the language it switches to', () => {
    renderTitleScreen()

    const italian = screen.getByRole('button', { name: 'Italiano' })
    expect(italian).toHaveAttribute('lang', 'it')
  })

  test('resumes a local game from its running score', () => {
    const onResume = vi.fn()

    renderTitleScreen({ resume: { kind: 'local', avatars: ['🐵', '🤖'], score: [4, 2], onResume } })

    fireEvent.click(screen.getByText('🐵 4 · 🤖 2'))
    expect(onResume).toHaveBeenCalledOnce()
  })

  test('groups a saved team game resume caption by side, not by seat', () => {
    renderTitleScreen({
      resume: { kind: 'local', avatars: ['🐵', '🤖', '🦊', '🐱'], score: [5, 3], onResume: vi.fn() },
    })

    expect(screen.getByText('🐵🦊 5 · 🤖🐱 3')).toBeInTheDocument()
  })

  test('shows the running score of an online game too, labelled as one', () => {
    const onResume = vi.fn()

    renderTitleScreen({ resume: { kind: 'online', avatars: ['🦊', '🐵'], score: [3, 1], onResume } })

    expect(screen.getByText(/online game/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText('🦊 3 · 🐵 1'))
    expect(onResume).toHaveBeenCalledOnce()
  })

  test('counts filled seats while an online room is still filling', () => {
    renderTitleScreen({
      resume: { kind: 'online', avatars: ['🐵', '🦊'], score: [], size: 6, onResume: vi.fn() },
    })

    expect(screen.getByText('🐵 🦊 · 2/6')).toBeInTheDocument()
  })

  test('shows team scores once an online room is full', () => {
    renderTitleScreen({
      resume: { kind: 'online', avatars: ['🐵', '🐶', '🦊', '🐱'], score: [3, 5], size: 4, onResume: vi.fn() },
    })

    expect(screen.getByText('🐵🦊 3 · 🐶🐱 5')).toBeInTheDocument()
  })
})

describe('starting an offline game', () => {
  test('starts a game with 2 players at normal difficulty by default', () => {
    const onStart = vi.fn()
    renderTitleScreen({ onStart })

    fireEvent.click(screen.getByRole('button', { name: /offline game/i }))

    expect(onStart).toHaveBeenCalledWith(expect.any(String), 2, 'normal')
  })

  test('starts an offline game with the selected player count', () => {
    const onStart = vi.fn()
    renderTitleScreen({ onStart })

    fireEvent.click(screen.getByLabelText('Select player count 2 × 2'))
    fireEvent.click(screen.getByRole('button', { name: /offline game/i }))

    expect(onStart).toHaveBeenCalledWith(expect.any(String), 4, expect.any(String))
  })

  test('starts a game at the difficulty the player picked', () => {
    const onStart = vi.fn()
    renderTitleScreen({ onStart })

    fireEvent.click(screen.getByLabelText('Select difficulty Expert'))
    fireEvent.click(screen.getByLabelText('Select player count 1 × 1 × 1'))
    fireEvent.click(screen.getByRole('button', { name: /offline game/i }))

    expect(onStart).toHaveBeenCalledWith(expect.any(String), 3, 'expert')
  })

  test('shows the picked difficulty as the pressed one', () => {
    renderTitleScreen()

    fireEvent.click(screen.getByLabelText('Select difficulty Hard'))

    expect(screen.getByLabelText('Select difficulty Hard')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Select difficulty Normal')).toHaveAttribute('aria-pressed', 'false')
  })

  test('remembers the picked avatar, difficulty and player count across a remount', () => {
    const { unmount } = renderTitleScreen()

    fireEvent.click(screen.getByLabelText('Select avatar 🦊'))
    fireEvent.click(screen.getByLabelText('Select difficulty Expert'))
    fireEvent.click(screen.getByLabelText('Select player count 2 × 2'))
    unmount()

    const onStart = vi.fn()
    renderTitleScreen({ onStart })

    expect(screen.getByLabelText('Select avatar 🦊')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Select difficulty Expert')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Select player count 2 × 2')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /offline game/i }))
    expect(onStart).toHaveBeenCalledWith('🦊', 4, 'expert')
  })
})
