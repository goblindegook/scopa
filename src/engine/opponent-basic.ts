import { findMatches } from './match'
import type { Move, State } from './state'

export async function move(game: State): Promise<Move> {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const card = game.players[game.turn].hand[0]
  const available = findMatches(card[0], game.table)
  const mustPick = Math.min(...available.map((t) => t.length))
  const valid = available.filter((t) => t.length === mustPick)
  const targets = valid[0] || []
  return { card, targets }
}
