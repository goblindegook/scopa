import { head, map, sum } from 'ramda'
import type { Card, Deck } from './cards'

function combinations(cards: Deck): readonly Deck[] {
  const results: Deck[] = [[]]

  for (const card of cards) {
    // biome-ignore lint/complexity/noForEach: <explanation>
    results.forEach((combination) => results.push([...combination, card]))
  }

  return results
}

export function findMatches(total: number, table: Deck): readonly Deck[] {
  const candidates = table.filter(([value]) => value <= total)
  return combinations(candidates).filter(
    (o) => sum(map<Card, number>(head, o)) === total,
  )
}
