import { sum, head, map } from 'ramda'
import { Card, Deck } from './cards'

function combinations(cards: Deck): readonly Deck[] {
  const results: Deck[] = [[]]

  cards.forEach((card) => {
    results.forEach((combination) => results.push([...combination, card]))
  })

  return results
}

export function findMatches(total: number, table: Deck): readonly Deck[] {
  const candidates = table.filter(([value]) => value <= total)
  return combinations(candidates).filter(
    (o) => sum(map<Card, number>(head, o)) === total
  )
}
