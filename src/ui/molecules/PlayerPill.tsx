import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'

const Row = styled('span')`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
`

const Pill = styled('span')<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  border: 2px solid
    ${({ active }) => (active ? 'var(--color-accent-translucent)' : 'var(--overlay-white-25)')};
  border-radius: var(--space-2);
  background: var(--overlay-black-40);
  color: white;

  @media (max-width: 480px), (max-height: 600px) {
    padding: var(--space-1);
    border-radius: var(--space-1);
    font-size: 0.8rem;
  }
`

const Avatar = styled('span')`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const Count = styled('span')`
  font-variant-numeric: tabular-nums;
`

const AwayBadge = styled('span')`
  position: absolute;
  right: calc(var(--space-1) * -1);
  bottom: calc(var(--space-1) * -1);
  font-size: 0.75rem;
  line-height: 1;
`

interface PlayerPillProps {
  className?: string
  avatar: string
  captured: number
  sweeps: number
  active: boolean
  away?: boolean
}

const seatLabel = (active: boolean, away: boolean): string | null => {
  if (active && away) return 'seatToPlayAway'
  if (active) return 'seatToPlay'
  if (away) return 'seatAway'
  return null
}

export const PlayerPill = React.forwardRef<HTMLElement, PlayerPillProps>(
  ({ className, avatar, captured, sweeps, active, away = false }, ref) => {
    const { t } = useTranslation()
    const label = seatLabel(active, away)
    return (
      <Row className={className}>
        <Pill active={active}>
          <Avatar aria-label={label ? t(label, { avatar }) : avatar}>
            {avatar}
            {away && (
              <AwayBadge role="img" aria-hidden="true">
                💤
              </AwayBadge>
            )}
          </Avatar>
        </Pill>
        <Pill ref={ref} active={active}>
          <Count aria-label={t('capturedCount', { avatar, count: captured })}>🎴 {captured}</Count>
          <Count aria-label={t('sweepCount', { avatar, count: sweeps })}>🧹 {sweeps}</Count>
        </Pill>
      </Row>
    )
  },
)
PlayerPill.displayName = 'PlayerPill'
