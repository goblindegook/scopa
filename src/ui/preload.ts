import { deck } from '../engine/cards'
import { SUITS } from './Card'

export async function preloadCardAssets(): Promise<void> {
  await Promise.all(
    deck().map((card) =>
      import(`./assets/${SUITS[card[1]]}/${card[0]}.jpg`)
        .catch(() => null)
        .then(
          (asset) =>
            new Promise<void>((resolve) => {
              const img = new Image()
              img.onload = () => resolve()
              img.onerror = () => resolve()
              img.src = asset?.default
            }),
        ),
    ),
  )
}
