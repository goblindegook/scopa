import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import './i18n'
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

  test('resumes a local game from its running score', () => {
    const onResume = vi.fn()

    renderTitleScreen({ resume: { kind: 'local', avatars: ['🐵', '🤖'], score: [4, 2], onResume } })

    fireEvent.click(screen.getByText('🐵 4 · 🤖 2'))
    expect(onResume).toHaveBeenCalledOnce()
  })

  test('shows the running score of an online game too, labelled as one', () => {
    const onResume = vi.fn()

    renderTitleScreen({ resume: { kind: 'online', avatars: ['🦊', '🐵'], score: [3, 1], onResume } })

    expect(screen.getByText(/online game/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText('🦊 3 · 🐵 1'))
    expect(onResume).toHaveBeenCalledOnce()
  })
})

describe('difficulty', () => {
  test('starts a game at normal without the player choosing', () => {
    const onStart = vi.fn()
    render(<TitleScreen loadingProgress={1} onStart={onStart} />)

    fireEvent.click(screen.getAllByText('2 Players')[0])

    expect(onStart).toHaveBeenCalledWith(expect.any(String), 2, 'normal')
  })

  test('starts a game at the difficulty the player picked', () => {
    const onStart = vi.fn()
    render(<TitleScreen loadingProgress={1} onStart={onStart} />)

    fireEvent.click(screen.getByLabelText('Select difficulty Expert'))
    fireEvent.click(screen.getAllByText('3 Players')[0])

    expect(onStart).toHaveBeenCalledWith(expect.any(String), 3, 'expert')
  })

  test('shows the picked difficulty as the pressed one', () => {
    render(<TitleScreen loadingProgress={1} onStart={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Select difficulty Hard'))

    expect(screen.getByLabelText('Select difficulty Hard')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Select difficulty Normal')).toHaveAttribute('aria-pressed', 'false')
  })

  test('remembers the picked avatar and difficulty across a remount', () => {
    const { unmount } = render(<TitleScreen loadingProgress={1} onStart={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Select avatar 🦊'))
    fireEvent.click(screen.getByLabelText('Select difficulty Expert'))
    unmount()

    const onStart = vi.fn()
    render(<TitleScreen loadingProgress={1} onStart={onStart} />)

    expect(screen.getByLabelText('Select avatar 🦊')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Select difficulty Expert')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getAllByText('2 Players')[0])
    expect(onStart).toHaveBeenCalledWith('🦊', 2, 'expert')
  })
})
