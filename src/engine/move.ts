import type { Pile } from './cards'

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
  const mustPick = Math.min(...availableTakes.map((t) => t.length))
  return availableTakes.filter((t) => t.length === mustPick)
}
