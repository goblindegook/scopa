import styled from '@emotion/styled'
import React from 'react'
import { type Card as CardType, Suit } from '../engine/cards'

const VALUES: { [key: number]: string } = {
  1: 'Asso',
  2: 'Due',
  3: 'Tre',
  4: 'Quattro',
  5: 'Cinque',
  6: 'Sei',
  7: 'Sette',
  8: 'Fante',
  9: 'Cavallo',
  10: 'Re',
}

const SUITS = {
  [Suit.BASTONI]: 'bastoni',
  [Suit.COPPE]: 'coppe',
  [Suit.DENARI]: 'denari',
  [Suit.SPADE]: 'spade',
}

function name([value, suit]: CardType) {
  return `${VALUES[value]} di ${SUITS[suit]}`
}

const Face = styled('img')`
  height: 13.5vw;
  width: 7.5vw;
  border-radius: 0.75vw;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
`

const Back = styled('div')`
  height: 13.5vw;
  width: 7.5vw;
  border-radius: 0.75vw;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  background-color: blue;
  border: 1px solid white;
`

export interface CardProps {
  className?: string
  faceDown?: boolean
  card: CardType
  index?: number
}

export const Card = ({ className, faceDown = false, card }: CardProps) => {
  const [src, setSrc] = React.useState<string | undefined>()

  React.useEffect(() => {
    ;(async () => {
      const asset = await import(`./assets/${SUITS[card[1]]}/${card[0]}.jpg`)
      if (asset.default) {
        setSrc(asset.default)
      }
    })()
  }, [card])

  return faceDown ? (
    <Back className={className} />
  ) : (
    <Face className={className} src={src} title={name(card)} alt={name(card)} />
  )
}
