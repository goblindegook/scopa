import { sideCount, sideOf } from '../engine/sides'

export const sideLabels = (playerAvatars: readonly string[]): string[] => {
  const count = playerAvatars.length

  return Array.from({ length: sideCount(count) }, (_, side) =>
    playerAvatars.filter((_, seat) => sideOf(seat, count) === side).join(''),
  )
}
