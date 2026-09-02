import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Player } from './Player'

afterEach(() => {
  cleanup()
})

test('names the hand so it can be reached by its avatar', () => {
  render(<Player avatar="🐵" captured={0} />)

  expect(screen.getByLabelText('🐵 hand')).toBeInTheDocument()
})

test('shows how many cards the player has captured', () => {
  render(<Player avatar="🐵" captured={7} />)

  expect(screen.getByLabelText('🐵 captured 7 cards')).toBeInTheDocument()
})

test('shows how many sweeps the player has made', () => {
  render(<Player avatar="🐵" captured={7} sweeps={2} />)

  expect(screen.getByLabelText('🐵 swept 2 times')).toBeInTheDocument()
})
