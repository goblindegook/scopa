import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { type Card as CardType, Suit } from '../../engine/cards'

export const Duration = {
  TAKING: 0.6,
  DEAL: 0.2,
  FLIP: 0.6,
  PLAY: 0.6,
  TURN: 0.5,
} as const

export const SUITS: Record<string, string> = {
  [Suit.BASTONI]: 'bastoni',
  [Suit.COPPE]: 'coppe',
  [Suit.DENARI]: 'denari',
  [Suit.SPADE]: 'spade',
}

const Face = styled('img')`
  height: 14vw;
  max-height: 40vh;
  max-width: 8vw;
  aspect-ratio: 1 / 1.66;
  border-radius: 0.75vw;
  box-shadow: 1px 1px 5px var(--overlay-black-40);
  -webkit-user-drag: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
`

const Back = styled('div')`
  height: 14vw;
  max-height: 40vh;
  max-width: 8vw;
  aspect-ratio: 1 / 1.66;
  border-radius: 0.75vw;
  box-shadow: 0 2px 5px var(--overlay-black-40);
  background-color: var(--color-card-back);
  background-image:
    repeating-linear-gradient(
      45deg,
      var(--color-card-back-pattern) 0px,
      var(--color-card-back-pattern) 2px,
      transparent 2px,
      transparent 9px
    ),
    repeating-linear-gradient(
      -45deg,
      var(--color-card-back-pattern) 0px,
      var(--color-card-back-pattern) 2px,
      transparent 2px,
      transparent 9px
    );
  border: 5px solid var(--color-card-back-pattern);
  outline: 1px solid var(--color-card-back);
  outline-offset: -8px;
  position: relative;
  overflow: hidden;
`

export interface CardProps {
  className?: string
  faceDown?: boolean
  card?: CardType
  index?: number
}

export const Card = ({ className, faceDown, card }: CardProps) => {
  const { t } = useTranslation()
  const [src, setSrc] = React.useState<string | undefined>()
  const isMountedRef = React.useRef(true)

  React.useEffect(() => {
    if (!card) return
    isMountedRef.current = true
    import(`../assets/${SUITS[card[1]]}/${card[0]}.jpg`).then((asset) => {
      if (isMountedRef.current) {
        setSrc(asset?.default)
      }
    })
    return () => {
      isMountedRef.current = false
    }
  }, [card])

  const cardName = React.useMemo(
    () =>
      card ? t('cardName', { value: t(`cardValues.${card[0]}`), suit: t(`cardSuits.${SUITS[card[1]]}`) }) : undefined,
    [card, t],
  )

  return faceDown || !card ? (
    <Back className={className} style={!card ? { opacity: 0 } : undefined} />
  ) : (
    <Face
      className={className}
      src={src}
      title={cardName}
      alt={cardName}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
    />
  )
}
