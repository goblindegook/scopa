import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '../i18n'
import { inviteUrl, Lobby } from './Lobby'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const ROOM = 'room-123'

const seat = (avatar: string, connected = true, confirmed = false) => ({ avatar, connected, confirmed })

const renderLobby = (props: Partial<React.ComponentProps<typeof Lobby>> = {}) =>
  render(
    <Lobby
      seats={[seat('🐵'), seat('🐶')]}
      size={2}
      host={0}
      isHost={false}
      roomId={ROOM}
      onSit={vi.fn()}
      onStart={vi.fn()}
      onLeave={vi.fn()}
      {...props}
    />,
  )

describe('Lobby', () => {
  test('groups seats by team', () => {
    render(
      <Lobby
        seats={[seat('🐵'), seat('🐶'), seat('🦊'), seat('🐱')]}
        size={4}
        host={0}
        isHost
        roomId="r"
        onSit={vi.fn()}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />,
    )

    expect(
      within(screen.getByRole('group', { name: 'Team 1' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['🐵', '🦊'])
    expect(
      within(screen.getByRole('group', { name: 'Team 2' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['🐶', '🐱'])
  })

  test('offers a vacant seat to sit in', async () => {
    const onSit = vi.fn()
    render(
      <Lobby
        seats={[seat('🐵'), null, null, null]}
        size={4}
        host={0}
        isHost
        roomId="r"
        onSit={onSit}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Sit in seat 3' }))

    expect(onSit).toHaveBeenCalledWith(2)
  })

  test('offers a disconnected player seat to sit in', async () => {
    const onSit = vi.fn()
    render(
      <Lobby
        seats={[seat('🐵'), seat('🐶', false), seat('🦊'), seat('🐱')]}
        size={4}
        host={0}
        isHost
        roomId="r"
        onSit={onSit}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Sit in seat 2' }))

    expect(onSit).toHaveBeenCalledWith(1)
  })

  test('enables start for the host once every seat is filled and connected', () => {
    render(
      <Lobby
        seats={[seat('🐵'), seat('🐶'), seat('🦊'), seat('🐱')]}
        size={4}
        host={0}
        isHost
        roomId="r"
        onSit={vi.fn()}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  test('disables start while a seat is empty', () => {
    render(
      <Lobby
        seats={[seat('🐵'), seat('🐶'), seat('🦊'), null]}
        size={4}
        host={0}
        isHost
        roomId="r"
        onSit={vi.fn()}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })

  test('disables start and keeps the waiting status when every seat is filled but one occupant is disconnected', () => {
    render(
      <Lobby
        seats={[seat('🐵'), seat('🐶'), seat('🦊'), seat('🐱', false)]}
        size={4}
        host={0}
        isHost
        roomId="r"
        onSit={vi.fn()}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByText(/waiting for every seat/i)).toBeInTheDocument()
  })

  test('only vacant or disconnected seats are offered as clickable', () => {
    render(
      <Lobby
        seats={[seat('🐵'), null, seat('🦊', false), seat('🐱')]}
        size={4}
        host={0}
        isHost
        roomId="r"
        onSit={vi.fn()}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />,
    )

    expect(
      screen.getAllByRole('button', { name: /^Sit in seat/ }).map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Sit in seat 3', 'Sit in seat 2'])
  })

  test('lists every player by avatar, including a disconnected one', () => {
    renderLobby({ seats: [seat('🐵'), seat('🐶', false)] })

    expect(screen.getByText('🐵')).toBeInTheDocument()
    expect(screen.getByText('🐶')).toBeInTheDocument()
  })

  test("marks a disconnected occupant's seat as visually distinct from a connected one", () => {
    renderLobby({ seats: [seat('🐵'), seat('🐶', false)] })

    expect(screen.getByText('🐵').closest('li')).toHaveAttribute('data-connected', 'true')
    expect(screen.getByText('🐶').closest('li')).toHaveAttribute('data-connected', 'false')
  })

  test('gives the host seat a real accessible marker, not just a hover tooltip', () => {
    renderLobby({ host: 0, seats: [seat('🐵'), seat('🐶')] })

    expect(screen.getByRole('img', { name: 'Host' }).closest('li')).toHaveTextContent('🐵')
  })

  test('shows a confirmation tick only for players who have confirmed', () => {
    renderLobby({ seats: [seat('🐵', true, true), seat('🐶')] })

    expect(screen.getAllByText('✓')).toHaveLength(1)
  })

  test('offers an invite link that omits the avatar, so a friend can pick their own', () => {
    renderLobby()

    expect(screen.getByLabelText(/share this link/i)).toHaveValue(inviteUrl(ROOM))
  })

  test('copies the invite link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderLobby()

    await userEvent.click(screen.getByRole('button', { name: /copy/i }))

    expect(writeText).toHaveBeenCalledWith(inviteUrl(ROOM))
  })

  test('tells players it is waiting while a seat is still empty', () => {
    renderLobby({ seats: [seat('🐵'), null] })

    expect(screen.getByText(/waiting for every seat/i)).toBeInTheDocument()
  })

  test('treats an empty seats array as waiting, not ready to start', () => {
    renderLobby({ seats: [], isHost: true })

    expect(screen.getByText(/waiting for every seat/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })

  test('keeps each team row as its own list, distinct from the team grouping', () => {
    render(
      <Lobby
        seats={[seat('🐵'), seat('🐶'), seat('🦊'), seat('🐱')]}
        size={4}
        host={0}
        isHost
        roomId="r"
        onSit={vi.fn()}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('list')).toHaveLength(2)
  })

  test('tells players they can begin once every seat is filled and connected', () => {
    renderLobby({ seats: [seat('🐵'), seat('🐶')] })

    expect(screen.getByText(/start when you're ready/i)).toBeInTheDocument()
  })

  test('only the host sees a Start button', () => {
    renderLobby({ isHost: false })

    expect(screen.queryByRole('button', { name: /^start$/i })).toBeNull()
  })

  test('the host can start the game', async () => {
    const onStart = vi.fn()
    renderLobby({ isHost: true, seats: [seat('🐵'), seat('🐶')], onStart })

    await userEvent.click(screen.getByRole('button', { name: /^start$/i }))

    expect(onStart).toHaveBeenCalledOnce()
  })

  test('offers a way back out of the room', async () => {
    const onLeave = vi.fn()
    renderLobby({ onLeave })

    await userEvent.click(screen.getByRole('button', { name: /back to title/i }))

    expect(onLeave).toHaveBeenCalledOnce()
  })
})
