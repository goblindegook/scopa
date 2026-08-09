import type { Pile } from './cards.ts'

function combinations(cards: Pile): readonly Pile[] {
  const results: Pile[] = [[]]

  for (const card of cards) {
    results.forEach((combination) => {
      results.push([...combination, card])
    })
  }

  return results
}

function takenValue(cards: Pile): number {
  return cards.reduce((acc, [value]) => acc + value, 0)
}

export function findCardsToTake(total: number, table: Pile): readonly Pile[] {
  const candidates = table.filter(([value]) => value <= total)
  const availableTakes = combinations(candidates).filter((cards) => takenValue(cards) === total)
  // Rule, not an optimisation: you must take the fewest cards that sum to the value. A single card beats any
  // combination, and a 2-card combination beats a 3-card one. Ties at the minimum length stay open to choice.
  const mustPick = Math.min(...availableTakes.map((t) => t.length))
  return availableTakes.filter((t) => t.length === mustPick)
}
