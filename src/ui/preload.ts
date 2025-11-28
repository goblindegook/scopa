import { deck } from '../engine/cards'
import { getCardPath } from './Card'

export async function preloadCardAssets(): Promise<void> {
  await Promise.all(
    deck().map((card) =>
      import(getCardPath(card))
        .then(
          (asset) =>
            new Promise<void>((resolve) => {
              if (!asset?.default) {
                resolve()
                return
              }
              const img = new Image()
              img.src = asset.default
              if (img.decode) {
                img
                  .decode()
                  .then(() => resolve())
                  .catch(() => resolve())
              } else {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              }
            }),
        )
        .catch(() => Promise.resolve()),
    ),
  )
}
