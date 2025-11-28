import { deck } from '../engine/cards'
import { getCardPath } from './Card'

export async function preloadCardAssets(): Promise<void> {
  await Promise.all(
    deck().map((card) =>
      import(getCardPath(card))
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
