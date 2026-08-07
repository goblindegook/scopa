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
  test('offers no resume options when there is nothing to resume', () => {
    renderTitleScreen()

    expect(screen.queryByText(/resume/i)).not.toBeInTheDocument()
  })

  test('offers only the online resume when both online and local games are resumable', () => {
    const onResume = vi.fn()
    const onResumeOnline = vi.fn()

    renderTitleScreen({
      savedGame: { avatars: ['🐵', '🤖'], score: [4, 2] },
      onResume,
      onResumeOnline,
    })

    expect(screen.queryByText('🐵 4 · 🤖 2')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Online Game'))
    expect(onResumeOnline).toHaveBeenCalledOnce()
    expect(onResume).not.toHaveBeenCalled()
  })
})
