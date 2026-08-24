import { isErr } from '@pacote/result'
import { aiOptions, type Difficulty } from '../engine/ai'
import { move } from '../engine/opponent'
import { play } from '../engine/scopa'
import type { Move, State } from '../engine/state'
import { hasConnectedHuman, isAutoplayed, type Seats } from './room'

interface Autoplayed {
  readonly game: State
  readonly moves: readonly Move[]
}

// The whole run of unattended turns is resolved in one pass so the Worker writes once.
// No delay: the client's animation loop is what paces these for the people watching.
export function autoplay(seats: Seats, game: State, difficulty: Difficulty): Autoplayed {
  const moves: Move[] = []
  let current = game

  // An abandoned room must not play itself out.
  // Also currently redundant: a 'stop' state implies an empty hand, so the isErr guard
  // below would catch it one iteration later. Stated explicitly rather than relying on
  // that chain, because it is the condition a reader expects to find here.
  while (hasConnectedHuman(seats) && current.state === 'play' && isAutoplayed(seats[current.turn])) {
    const chosen = move(current, aiOptions(difficulty, seats.length))
    const result = play(chosen, current)
    // Unreachable: legalMoves() generates exactly what play() accepts. Guarding anyway
    // so a future engine change stalls one turn instead of spinning forever.
    if (isErr(result)) break
    moves.push(chosen)
    current = result.value
  }

  return { game: current, moves }
}
