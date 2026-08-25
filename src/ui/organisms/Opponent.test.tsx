import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Opponent } from './Opponent'

afterEach(() => {
  cleanup()
})

test('shows how many cards the opponent has captured', () => {
  render(<Opponent avatar="🤖" capturedCount={4} />)

  expect(screen.getByLabelText('🤖 captured 4 cards')).toBeInTheDocument()
})

test('names an away seat as away', () => {
  render(<Opponent avatar="🐶" capturedCount={0} away />)

  expect(screen.getByLabelText('🐶 away')).toBeInTheDocument()
})

test('names an away seat that is also to play', () => {
  render(<Opponent avatar="🐶" capturedCount={0} active away />)

  expect(screen.getByLabelText('🐶 to play, away')).toBeInTheDocument()
})
