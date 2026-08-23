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

  it('seats four players in a four player game', () => {
    expect(startOfflineSession('🐵', 4).session.playerProfiles).toHaveLength(4)
  })

  it('seats six players in a six player game', () => {
    expect(startOfflineSession('🐵', 6).session.playerProfiles).toHaveLength(6)
  })

  it('gives every seat a distinct avatar in a four player game', () => {
    const avatars = startOfflineSession('🐵', 4).session.playerProfiles.map((profile) => profile.avatar)

    expect(new Set(avatars).size).toBe(4)
  })

  it('gives every seat a distinct avatar in a six player game', () => {
    const avatars = startOfflineSession('🐵', 6).session.playerProfiles.map((profile) => profile.avatar)

    expect(new Set(avatars).size).toBe(6)
  })

  it('deals a hand for every seated player in a four player game', () => {
    const { session } = startOfflineSession('🐵', 4)

    expect(session.game.players).toHaveLength(session.playerProfiles.length)
  })
})
