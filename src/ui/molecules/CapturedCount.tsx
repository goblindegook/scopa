import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'

const Pill = styled('span')<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: ${({ active }) => (active ? '2px' : '1px')} solid
    ${({ active }) => (active ? 'var(--color-accent-translucent)' : 'var(--overlay-white-25)')};
  border-radius: var(--space-2);
  background: var(--overlay-black-40);
  color: white;
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

interface CapturedCountProps {
  className?: string
  avatar: string
  count: number
  active: boolean
  away?: boolean
}

const seatLabel = (active: boolean, away: boolean): string | null => {
  if (active && away) return 'seatToPlayAway'
  if (active) return 'seatToPlay'
  if (away) return 'seatAway'
  return null
}

export const CapturedCount = React.forwardRef<HTMLElement, CapturedCountProps>(
  ({ className, avatar, count, active, away = false }, ref) => {
    const { t } = useTranslation()
    const label = seatLabel(active, away)
    return (
      <Pill ref={ref} className={className} active={active}>
        <Avatar aria-label={label ? t(label, { avatar }) : avatar}>
          {avatar}
          {away && (
            <AwayBadge role="img" aria-hidden="true">
              💤
            </AwayBadge>
          )}
        </Avatar>
        <Count aria-label={t('capturedCount', { avatar, count })}>{count}</Count>
      </Pill>
    )
  },
)
CapturedCount.displayName = 'CapturedCount'
