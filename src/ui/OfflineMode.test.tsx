import { describe, expect, it } from 'vitest'
import { startOfflineSession } from './OfflineMode'

const opponentProfiles = (count: 2 | 3) => startOfflineSession('🐵', count).session.playerProfiles.slice(1)

describe('startOfflineSession', () => {
  it('gives the two-player opponent the defensive aggression that benchmarks best head-to-head', () => {
    expect(opponentProfiles(2)).toEqual([expect.objectContaining({ aggression: -1 })])
  })

  it('gives three-player opponents the aggressive posture that benchmarks best in three-way play', () => {
    expect(opponentProfiles(3)).toEqual([
      expect.objectContaining({ aggression: 1 }),
      expect.objectContaining({ aggression: 1 }),
    ])
  })

  it('never enables card counting, which measured as neutral once aggression was fixed', () => {
    expect(opponentProfiles(2)).toEqual([expect.objectContaining({ canCountCards: false })])
    expect(opponentProfiles(3)).toEqual([
      expect.objectContaining({ canCountCards: false }),
      expect.objectContaining({ canCountCards: false }),
    ])
  })

  it('deals every opponent the same profile from one match to the next', () => {
    expect(opponentProfiles(2)).toEqual(opponentProfiles(2))
    expect(opponentProfiles(3)).toEqual(opponentProfiles(3))
  })

  it('keeps the chosen avatar for the human player', () => {
    expect(startOfflineSession('🦊', 2).session.playerProfiles[0].avatar).toBe('🦊')
  })
})
