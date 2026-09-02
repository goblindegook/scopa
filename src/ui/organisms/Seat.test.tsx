import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Seat } from './Seat'

afterEach(() => {
  cleanup()
})

test('names the hand so it can be reached by its avatar', () => {
  render(<Seat avatar="🐵" captured={0} />)

  expect(screen.getByLabelText('🐵 hand')).toBeInTheDocument()
})

test('shows how many cards the seat has captured', () => {
  render(<Seat avatar="🐵" captured={7} />)

  expect(screen.getByLabelText('🐵 captured 7 cards')).toBeInTheDocument()
})

test('shows how many sweeps the seat has made', () => {
  render(<Seat avatar="🐵" captured={7} sweeps={2} />)

  expect(screen.getByLabelText('🐵 swept 2 times')).toBeInTheDocument()
})

test('names an away seat as away', () => {
  render(<Seat avatar="🐶" captured={0} away />)

  expect(screen.getByLabelText('🐶 away')).toBeInTheDocument()
})

test('names an away seat that is also to play', () => {
  render(<Seat avatar="🐶" captured={0} active away />)

  expect(screen.getByLabelText('🐶 to play, away')).toBeInTheDocument()
})
