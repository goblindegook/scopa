import styled from '@emotion/styled'
import { motion, type Target } from 'framer-motion'
import React from 'react'
import { type Card as CardType, Suit } from '../engine/cards'

export const VALUES: Record<number, string> = {
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

export const SUITS: Record<string, string> = {
  [Suit.BASTONI]: 'bastoni',
  [Suit.COPPE]: 'coppe',
  [Suit.DENARI]: 'denari',
  [Suit.SPADE]: 'spade',
}

function name([value, suit]: CardType) {
  return `${VALUES[value]} di ${SUITS[suit]}`
}

export function getCardPath(card: [number, Suit]) {
  return `./assets/${SUITS[card[1]]}/${card[0]}.jpg`
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
  background: linear-gradient(135deg, #1a2b5f 0%, #2d4a80 50%, #1a2b5f 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200%;
    height: 200%;
    background-image: 
      repeating-conic-gradient(
        from 0deg at 50% 50%,
        #2d4aff 0deg,
        #2d4a90 5deg,
        #1a2b5f 10deg,
        #1a2b5f 15deg
      );
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at center,
      rgba(45, 74, 128, 0.4) 0%,
      transparent 50%
    );
  }
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
    let cancelled = false
    ;(async () => {
      try {
        const asset = await import(getCardPath(card))
        if (asset.default && !cancelled) {
          React.startTransition(() => {
            if (!cancelled) setSrc(asset.default)
          })
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [card])

  return faceDown ? (
    <Back className={className} />
  ) : (
    <Face className={className} src={src} title={name(card)} alt={name(card)} />
  )
}

const AnimatedCardOverlay = styled(motion.div)`
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  will-change: transform;
  transform-style: preserve-3d;
`

const AnimatedCardContainer = styled('div')`
  transform-style: preserve-3d;
  position: relative;
  width: 7.5vw;
  height: 13.5vw;
`

const AnimatedCardFace = styled('div')<{ side: 'front' | 'back' }>`
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  transform: rotateY(${({ side }) => (side === 'front' ? '0deg' : '180deg')});
`

export interface AnimatedCardProps {
  card: CardType
  initial: Target
  animate: Target
  faceDown: boolean
  onComplete: () => void
}

export const AnimatedCard = ({ card, initial, animate, faceDown, onComplete }: AnimatedCardProps) => {
  return (
    <AnimatedCardOverlay
      initial={{ ...initial, rotateY: faceDown ? 180 : 0 }}
      animate={{ ...animate, rotateY: 0 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        duration: 0.6,
        rotateY: {
          duration: 0.2,
          delay: 0,
        },
      }}
      onAnimationComplete={onComplete}
    >
      <AnimatedCardContainer>
        <AnimatedCardFace side="front">
          <Card card={card} faceDown={false} />
        </AnimatedCardFace>
        <AnimatedCardFace side="back">
          <Card card={card} faceDown={true} />
        </AnimatedCardFace>
      </AnimatedCardContainer>
    </AnimatedCardOverlay>
  )
}
