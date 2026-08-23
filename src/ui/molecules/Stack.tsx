import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Card as CardType } from '../../engine/cards'
import { Card } from '../atoms/Card'

const StackArea = styled('aside')`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`

const StackedCard = styled(Card)`
  transition: transform 0.1s ease-in;
  position: absolute;
  z-index: ${({ index }) => index};
  top: calc(50% - ${({ index }) => (index ?? 0) * 2}px);
  left: 50%;
  transform: translate(-50%, -50%);

  &:hover ~ * {
    transform: translate(-50%, calc(-50% - 1rem));
  }
`

interface StackProps {
  className?: string
  pile: readonly CardType[]
  title: string
}

export const Stack = React.forwardRef<HTMLElement, StackProps>(({ className, pile, title }, ref) => (
  <StackArea ref={ref} className={className} title={title}>
    {pile.map((card, index) => (
      <StackedCard key={card.join('-')} faceDown index={index} card={card} />
    ))}
  </StackArea>
))
Stack.displayName = 'Stack'

const Pill = styled('span')`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--overlay-white-25);
  border-radius: var(--space-2);
  background: var(--overlay-black-40);
  color: white;
  font-variant-numeric: tabular-nums;
`

const PillGroup = styled('span')`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
`

const AvatarPill = styled(Pill)<{ active: boolean }>`
  border-color: ${({ active }) => (active ? 'var(--color-accent-translucent)' : 'var(--overlay-white-25)')};
  border-width: ${({ active }) => (active ? '2px' : '1px')};
`

interface CapturedCountProps {
  className?: string
  avatar: string
  count: number
  active: boolean
}

export const CapturedCount = React.forwardRef<HTMLElement, CapturedCountProps>(
  ({ className, avatar, count, active }, ref) => {
    const { t } = useTranslation()
    return (
      <PillGroup ref={ref} className={className}>
        <AvatarPill active={active} aria-label={active ? t('seatToPlay', { avatar }) : avatar}>
          {avatar}
        </AvatarPill>
        <Pill aria-label={t('capturedCount', { avatar, count })}>🎴 {count}</Pill>
      </PillGroup>
    )
  },
)
CapturedCount.displayName = 'CapturedCount'
