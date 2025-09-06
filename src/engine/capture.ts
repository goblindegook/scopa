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

function captureValue(cards: Pile): number {
  return cards.reduce((acc, [value]) => acc + value, 0)
}

export function findCaptures(total: number, table: Pile): readonly Pile[] {
  const candidates = table.filter(([value]) => value <= total)
  const availableCaptures = combinations(candidates).filter(
    (capture) => captureValue(capture) === total,
  )
  const mustPick = Math.min(...availableCaptures.map((t) => t.length))
  return availableCaptures.filter((t) => t.length === mustPick)
}
