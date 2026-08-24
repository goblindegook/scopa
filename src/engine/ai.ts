import type { OpponentOptions } from './opponent.ts'
import { sideCount } from './sides.ts'

export const AI_AVATARS = ['🤖', '👾', '👽', '😈', '👻'] as const

export const DIFFICULTIES = ['easy', 'normal', 'hard', 'expert'] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

// Two sides play defensively, three aggressively: with one opponent a low score is
// recoverable, with two it is not.
const POSTURE: Record<number, number> = { 2: -1, 3: 1 }

export function aiOptions(difficulty: Difficulty, playerCount: number): OpponentOptions {
  const posture = POSTURE[sideCount(playerCount)]
  switch (difficulty) {
    case 'easy':
      return { posture: 0, canCountCards: false }
    case 'normal':
      return { posture: undefined, canCountCards: false }
    case 'hard':
      return { posture, canCountCards: false }
    case 'expert':
      return { posture, canCountCards: true, worlds: 100 }
  }
}
