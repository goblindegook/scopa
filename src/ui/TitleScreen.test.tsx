import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import './i18n'
import { TitleScreen } from './TitleScreen'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
