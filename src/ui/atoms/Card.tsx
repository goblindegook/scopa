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

const BLANK_FACE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const Face = styled('img')`
  height: var(--card-height);
  width: var(--card-width);
  border-radius: calc(var(--card-width) * var(--card-radius-ratio));
  box-shadow: 1px 1px 5px var(--overlay-black-40);
  -webkit-user-drag: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
`

const Back = styled('div')`
  --card-back-pattern-size: calc(var(--card-width) * var(--card-back-pattern-ratio));
  --card-back-gradient:
    var(--color-card-back-pattern) 0% 5%, var(--color-card-back) 6% 15%,
    var(--color-card-back-pattern) 16% 25%, var(--color-card-back) 26% 35%,
    var(--color-card-back-pattern) 36% 45%, var(--color-card-back) 46% 55%,
    var(--color-card-back-pattern) 56% 65%, var(--color-card-back) 66% 75%,
    var(--color-card-back-pattern) 76% 85%, var(--color-card-back) 86% 95%, #0000 96%;

  height: var(--card-height);
  width: var(--card-width);
  border-radius: calc(var(--card-width) * var(--card-radius-ratio));
  box-shadow: 0 2px 5px var(--overlay-black-40);
  background:
    radial-gradient(50% 50% at 100% 0, var(--card-back-gradient)),
    radial-gradient(50% 50% at 0 100%, var(--card-back-gradient)),
    radial-gradient(50% 50%, var(--card-back-gradient)),
    radial-gradient(50% 50%, var(--card-back-gradient)) calc(var(--card-back-pattern-size) / 2)
    calc(var(--card-back-pattern-size) / 2) var(--color-card-back-pattern);
  background-size: var(--card-back-pattern-size) var(--card-back-pattern-size);
  border: calc(var(--card-width) * var(--card-back-border-ratio)) solid var(--color-card-back-pattern);
  outline: 1px solid var(--color-card-back);
  outline-offset: calc(var(--card-width) * var(--card-back-border-ratio) * -1);
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
    import(`../assets/bergamo/${SUITS[card[1]]}/${card[0]}.jpg`).then((asset) => {
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
      src={src ?? BLANK_FACE}
      title={cardName}
      alt={cardName}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
    />
  )
}
