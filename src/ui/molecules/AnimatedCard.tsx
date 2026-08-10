import styled from '@emotion/styled'
import { motion, type Target } from 'framer-motion'
import type { Card as CardType } from '../../engine/cards'
import { Card, Duration } from '../atoms/Card'

const StyledCard = styled(Card)`
  position: absolute;
  backface-visibility: hidden;
  transform: rotateY(${({ faceDown }) => (faceDown ? '180deg' : '0deg')});
`

const AnimatedCardOverlay = styled(motion.div)`
  transform-style: preserve-3d;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  pointer-events: none;
  will-change: transform;
`

const CardContainer = styled('div')`
  transform-style: preserve-3d;
  position: relative;
  height: var(--card-height);
  width: var(--card-width);
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
      exit={{ opacity: 0, rotateY: !faceDown && flip ? 180 : 0, transition: { duration: 0 } }}
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
