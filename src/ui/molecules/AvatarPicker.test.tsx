import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '../i18n'
import { AvatarPicker } from './AvatarPicker'

afterEach(cleanup)

describe('AvatarPicker', () => {
  test('picks an avatar', async () => {
    const onSelect = vi.fn()

    render(<AvatarPicker onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Select avatar 🦊' }))
    expect(onSelect).toHaveBeenCalledWith('🦊')
  })

  test('marks the current selection', () => {
    render(<AvatarPicker selected="🦊" onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Select avatar 🦊' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select avatar 🐵' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('rules out avatars already taken by other players', async () => {
    const onSelect = vi.fn()

    render(<AvatarPicker taken={['🐵']} onSelect={onSelect} />)

    const taken = screen.getByRole('button', { name: 'Select avatar 🐵' })
    expect(taken).toBeDisabled()

    await userEvent.click(taken)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
