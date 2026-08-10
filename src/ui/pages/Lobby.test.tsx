import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '../i18n'
import { inviteUrl, Lobby } from './Lobby'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const ROOM = 'room-123'

const player = (avatar: string, connected = true, confirmed = false) => ({ avatar, connected, confirmed })

const renderLobby = (props: Partial<React.ComponentProps<typeof Lobby>> = {}) =>
  render(
    <Lobby
      players={[player('🐵'), player('🐶')]}
      isCreator={false}
      roomId={ROOM}
      onStart={vi.fn()}
      onLeave={vi.fn()}
      {...props}
    />,
  )

describe('Lobby', () => {
  test('lists every player by avatar', () => {
    renderLobby({ players: [player('🐵'), player('🐶', false)] })

    expect(screen.getByText('🐵')).toBeInTheDocument()
    expect(screen.getByText('🐶')).toBeInTheDocument()
  })

  test('marks a disconnected player so the others can see who they are waiting on', () => {
    renderLobby({ players: [player('🐵'), player('🐶', false)] })

    expect(screen.getByText('🐶').closest('li')).toHaveAttribute('data-connected', 'false')
  })

  test('shows a confirmation tick only for players who have confirmed', () => {
    renderLobby({ players: [player('🐵', true, true), player('🐶')] })

    expect(screen.getAllByText('✓')).toHaveLength(1)
  })

  test('offers an invite link that omits the avatar, so a friend can pick their own', () => {
    renderLobby()

    expect(screen.getByLabelText(/share this link/i)).toHaveValue(inviteUrl(ROOM))
    expect(screen.getByLabelText(/share this link/i)).not.toHaveValue(expect.stringContaining('avatar'))
  })

  test('copies the invite link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderLobby()

    fireEvent.click(screen.getByRole('button', { name: /copy/i }))

    expect(writeText).toHaveBeenCalledWith(inviteUrl(ROOM))
  })

  test('tells players it is waiting while a seat is still empty', () => {
    renderLobby({ players: [player('🐵')] })

    expect(screen.getByText(/waiting for another player/i)).toBeInTheDocument()
  })

  test('tells players they can begin once two are connected', () => {
    renderLobby()

    expect(screen.getByText(/start when you're ready/i)).toBeInTheDocument()
  })

  test('only the creator sees a Start button', () => {
    renderLobby({ isCreator: false })

    expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument()
  })

  test('the creator can start once two players are connected', () => {
    const onStart = vi.fn()
    renderLobby({ isCreator: true, onStart })

    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))

    expect(onStart).toHaveBeenCalledOnce()
  })

  test('disables Start while fewer than two players are connected', () => {
    renderLobby({ isCreator: true, players: [player('🐵'), player('🐶', false)] })

    expect(screen.getByRole('button', { name: /^start$/i })).toBeDisabled()
  })

  test('offers a way back out of the room', () => {
    const onLeave = vi.fn()
    renderLobby({ onLeave })

    fireEvent.click(screen.getByRole('button', { name: /back to title/i }))

    expect(onLeave).toHaveBeenCalledOnce()
  })
})
