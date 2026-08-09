import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, test } from 'vitest'
import { coppe, denari } from '../engine/cards'
import type { State } from '../engine/state'
import { startOfflineSession } from './OfflineMode'
import { useSavedGameStorage } from './useLocalStorage'

const playerProfiles = [{ avatar: '🐵' }, { avatar: '🤖' }]

const game = (score: readonly number[], state: State['state'] = 'play'): State => ({
  state,
  turn: 0,
  firstPlayer: 0,
  pile: [],
  players: [
    { id: 0, hand: [denari(1)], pile: [], scope: 0 },
    { id: 1, hand: [coppe(2)], pile: [], scope: 0 },
  ],
  table: [],
  lastTaken: [],
  score,
})

const storedGame = () => JSON.parse(window.localStorage.getItem('scopa:saved-game') ?? 'null')

afterEach(() => {
  window.localStorage.clear()
})

describe('useSavedGameStorage', () => {
  test('saves the session it is given', () => {
    renderHook(() => useSavedGameStorage({ game: game([4, 2]), playerProfiles, difficulty: 'normal' }))

    expect(storedGame()).toMatchObject({ playerAvatars: ['🐵', '🤖'] })
  })

  test('saves nothing until a game has been dealt', () => {
    renderHook(() => useSavedGameStorage({ game: game([], 'initial'), playerProfiles, difficulty: 'normal' }))

    expect(storedGame()).toBeNull()
  })

  test('forgets the saved game when asked', () => {
    const session = { game: game([4, 2]), playerProfiles, difficulty: 'normal' as const }
    const { result } = renderHook(() => useSavedGameStorage(session))

    act(() => result.current.clearSavedGame())

    expect(storedGame()).toBeNull()
  })
})

describe('difficulty across a resume', () => {
  it('restores the difficulty the game was started with', () => {
    const { session } = startOfflineSession('🐵', 2, 'expert')
    const { result } = renderHook(() => useSavedGameStorage(session))

    expect(result.current.savedGameState?.difficulty).toBe('expert')
  })

  it('treats a game saved before difficulties existed as normal', () => {
    window.localStorage.setItem(
      'scopa:saved-game',
      JSON.stringify({ game: startOfflineSession('🐵', 2).session.game, playerAvatars: ['🐵', '🤖'] }),
    )
    const { result } = renderHook(() => useSavedGameStorage(null))

    expect(result.current.savedGameState?.difficulty).toBe('normal')
  })
})
