import styled from '@emotion/styled'
import { motion, type Target } from 'framer-motion'
import React from 'react'
import { type Card as CardType, Suit } from '../engine/cards'

export const Duration = {
  CAPTURE: 0.6,
  DEAL: 0.2,
  FLIP: 0.6,
  PLAY: 0.6,
  TURN: 0.5,
} as const

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

const Face = styled('img')`
  height: 14vw;
  max-height: 40vh;
  max-width: 8vw;
  aspect-ratio: 1 / 1.66;
  border-radius: 0.75vw;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
`

const Back = styled('div')`
  height: 14vw;
  max-height: 20vh;
  max-width: 8vw;
  aspect-ratio: 1 / 1.66;
  border-radius: 0.75vw;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 3px solid rgba(255, 255, 255, 0.3);
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
    background: conic-gradient(
      from 0deg at 50% 50%,
      #667eea 0%,
      #764ba2 20%,
      #667eea 40%,
      #764ba2 60%,
      #667eea 80%,
      #764ba2 95%,
      #667eea 100%
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
      rgba(102, 126, 234, 0.4) 0%,
      transparent 50%
    );
  }
`

export interface CardProps {
  className?: string
  faceDown?: boolean
  card?: CardType
  index?: number
}

export const Card = ({ className, faceDown, card }: CardProps) => {
  const [src, setSrc] = React.useState<string | undefined>()
  const isMountedRef = React.useRef(true)

  React.useEffect(() => {
    if (!card) return
    isMountedRef.current = true
    import(`./assets/${SUITS[card[1]]}/${card[0]}.jpg`).then((asset) => {
      if (isMountedRef.current) {
        setSrc(asset?.default)
      }
    })
    return () => {
      isMountedRef.current = false
    }
  }, [card])

  return faceDown || !card ? (
    <Back className={className} style={!card ? { opacity: 0 } : undefined} />
  ) : (
    <Face className={className} src={src} title={name(card)} alt={name(card)} />
  )
}

const StyledCard = styled(Card)`
  position: absolute;
  backface-visibility: hidden;
  transform: rotateY(${({ faceDown }) => (faceDown ? '180deg' : '0deg')});
`

const AnimatedCardOverlay = styled(motion.div)`
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  will-change: transform;
  transform-style: preserve-3d;
`

const CardContainer = styled('div')`
  transform-style: preserve-3d;
  position: relative;
  height: 14vw;
  max-height: 40vh;
  max-width: 8vw;
  aspect-ratio: 1 / 1.66;
`

export interface AnimatedCardProps {
  card: CardType
  initial?: Target
  animate?: Target
  faceDown?: boolean
  flip?: boolean
  onComplete: () => void
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ card, initial, animate, faceDown, flip, onComplete }) => {
  return (
    <AnimatedCardOverlay
      initial={{ ...initial, rotateY: faceDown ? 180 : 0 }}
      animate={{ ...animate, rotateY: !faceDown && flip ? 180 : 0 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      transition={{
        rotateY: { duration: Duration.FLIP },
        x: { duration: Duration.PLAY },
        y: { duration: Duration.PLAY },
      }}
      onAnimationComplete={onComplete}
    >
      <CardContainer>
        <StyledCard card={card} />
        <StyledCard card={card} faceDown />
      </CardContainer>
    </AnimatedCardOverlay>
  )
}

export type ScaleInCardProps = React.PropsWithChildren<{
  isNew: boolean
  index: number
}>

export const DealtCard: React.FC<ScaleInCardProps> = ({ isNew, index, children }) => {
  return (
    <motion.div
      style={{ display: 'inline-block' }}
      initial={isNew ? { scale: 0.5 } : false}
      animate={isNew ? { scale: [0.5, 1.2, 1] } : { scale: 1 }}
      transition={
        isNew
          ? {
              delay: index * Duration.DEAL,
              type: 'spring',
              stiffness: 300,
              damping: 20,
              opacity: {
                delay: index * Duration.DEAL,
                duration: Duration.DEAL,
                ease: 'easeOut',
              },
              scale: {
                delay: index * Duration.DEAL,
                duration: 2 * Duration.DEAL,
                times: [0, 0.6, 1],
                ease: [0.34, 1.56, 0.64, 1],
              },
            }
          : { duration: 0 }
      }
    >
      {children}
    </motion.div>
  )
}
