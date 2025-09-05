import { head, map, sum } from 'ramda'
import type { Card, Pile } from './cards'

function combinations(cards: Pile): readonly Pile[] {
  const results: Pile[] = [[]]

  for (const card of cards) {
    results.forEach((combination) => {
      results.push([...combination, card])
    })
  }

  return results
}

export function findCaptures(total: number, table: Pile): readonly Pile[] {
  const candidates = table.filter(([value]) => value <= total)
  return combinations(candidates).filter(
    (o) => sum(map<Card, number>(head, o)) === total,
  )
}
