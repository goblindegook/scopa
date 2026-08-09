import { describe, expect, it } from 'vitest'
import { startOfflineSession } from './OfflineMode'

describe('startOfflineSession', () => {
  it('keeps the chosen avatar for the human player', () => {
    expect(startOfflineSession('🦊', 2).session.playerProfiles[0].avatar).toBe('🦊')
  })

  it('seats one opponent for a two-player game and two for a three-player game', () => {
    expect(startOfflineSession('🐵', 2).session.playerProfiles).toHaveLength(2)
    expect(startOfflineSession('🐵', 3).session.playerProfiles).toHaveLength(3)
  })

  it('remembers the difficulty it was started at', () => {
    expect(startOfflineSession('🐵', 2, 'expert').session.difficulty).toBe('expert')
  })

  it('starts at normal when no difficulty is given', () => {
    expect(startOfflineSession('🐵', 2).session.difficulty).toBe('normal')
  })
})
