import { deck } from '../engine/cards'
import { SUITS } from './Card'

export async function preloadCardAssets(onProgress?: (progress: number) => void): Promise<void> {
  const cards = deck()
  const total = cards.length
  let loaded = 0

  await Promise.all(
    cards.map((card) =>
      import(`./assets/${SUITS[card[1]]}/${card[0]}.jpg`)
        .catch(() => null)
        .then(
          (asset) =>
            new Promise<void>((resolve) => {
              const img = new Image()
              img.onload = () => {
                loaded++
                onProgress?.(loaded / total)
                resolve()
              }
              img.onerror = () => {
                loaded++
                onProgress?.(loaded / total)
                resolve()
              }
              img.src = asset?.default
            }),
        ),
    ),
  )
}
