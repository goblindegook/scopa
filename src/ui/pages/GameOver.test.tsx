import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import '../i18n'
import { GameOver } from './GameOver'

afterEach(() => {
  cleanup()
})

test('keeps Next Round available until this player has confirmed', () => {
  render(
    <GameOver scores={[]} runningScore={[0, 0]} playerAvatars={['🐵', '🐶']} onNextRound={vi.fn()} onReset={vi.fn()} />,
  )

  expect(screen.getByRole('button', { name: /next round/i })).toBeEnabled()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('shows who the next round is still waiting on once this player has confirmed', () => {
  render(
    <GameOver
      scores={[]}
      runningScore={[0, 0]}
      playerAvatars={['🐵', '🐶']}
      awaitingConfirmations
      onNextRound={vi.fn()}
      onReset={vi.fn()}
    />,
  )

  expect(screen.getByRole('button', { name: /next round/i })).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent(/waiting for all players/i)
})
