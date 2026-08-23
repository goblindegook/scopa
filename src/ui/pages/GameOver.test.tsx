import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { Score } from '../../engine/scores'
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

test('names the whole winning side', () => {
  const fourPlayerScores: Score[] = [
    { sideId: 0, details: [], total: 11 },
    { sideId: 1, details: [], total: 5 },
  ]

  render(
    <GameOver
      scores={fourPlayerScores}
      runningScore={[11, 5]}
      playerAvatars={['🐵', '🤖', '👾', '👽']}
      winner={0}
      onNextRound={vi.fn()}
      onReset={vi.fn()}
    />,
  )

  expect(screen.getByRole('heading')).toHaveTextContent('🐵👾')
})
