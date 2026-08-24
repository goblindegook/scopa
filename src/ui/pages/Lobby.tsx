import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import type { PlayerCount } from '../../engine/sides'
import { sideCount, sideOf } from '../../engine/sides'
import { Button } from '../atoms/Button'
import { ModalOverlay, ModalPanel } from '../atoms/ModalOverlay'

const Title = styled('h1')`
  color: white;
  font-size: 3rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  letter-spacing: 0.05em;
  text-shadow: 0 4px 12px var(--overlay-black-40);

  @media (max-height: 600px) {
    font-size: 2rem;
  }
`

const Teams = styled('div')`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-8);
`

const TeamGroup = styled('div')`
  display: contents;
`

const SeatRow = styled('ul')`
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
`

const Seat = styled('li')`
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--space-16);
  height: var(--space-16);
  font-size: 2.25rem;
  line-height: 1;
  border-radius: var(--space-2);
  border: 2px solid var(--overlay-white-25);
  background-color: rgba(255, 255, 255, 0.08);
  position: relative;
  transition: opacity 0.15s;

  &[data-connected='false'] {
    opacity: 0.4;
  }
`

const EmptySeat = styled(Seat)`
  border-style: dashed;
  border-color: var(--overlay-white-25);
  background-color: transparent;
`

const SeatButton = styled('button')`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: inherit;
  color: var(--overlay-white-75);
  font-size: 2.25rem;
  line-height: 1;
  font-family: inherit;
  cursor: pointer;

  &:hover {
    color: white;
  }
`

const ConfirmedIndicator = styled('span')`
  position: absolute;
  right: -0.25rem;
  bottom: -0.25rem;
  font-size: 1rem;
  line-height: 1;
  color: var(--color-accent);
`

const HostBadge = styled('span')`
  position: absolute;
  top: calc(var(--space-1) * -1);
  left: calc(var(--space-1) * -1);
  width: var(--space-2);
  height: var(--space-2);
  border-radius: 50%;
  background-color: var(--color-accent);
  border: 2px solid var(--overlay-black-40);
`

const Status = styled('p')`
  margin: 0;
  color: var(--overlay-white-75);
  font-size: 0.95rem;
  text-align: center;
`

const InviteBlock = styled('div')`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
`

const InviteLabel = styled('label')`
  color: var(--overlay-white-75);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const InviteControls = styled('div')`
  display: flex;
  gap: var(--space-2);
`

const InviteInput = styled('input')`
  flex: 1;
  min-width: 0;
  border-radius: var(--space-2);
  border: 2px solid var(--overlay-white-25);
  background-color: rgba(0, 0, 0, 0.35);
  color: white;
  padding: var(--space-2) var(--space-2);
  font-size: 0.9rem;
  font-family: inherit;
`

const TextButton = styled('button')`
  background: none;
  border: none;
  color: var(--overlay-white-75);
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  padding: var(--space-1);
  text-decoration: underline;

  &:hover {
    color: white;
  }
`

export interface LobbyPlayer {
  avatar: string
  connected: boolean
  confirmed: boolean
  ai?: boolean
}

interface LobbyProps {
  seats: readonly (LobbyPlayer | null)[]
  size: PlayerCount
  host: number | null
  isHost: boolean
  roomId: string
  onSit: (seat: number) => void
  onStart: () => void
  onLeave: () => void
}

export function inviteUrl(roomId: string): string {
  return `${window.location.origin}${window.location.pathname}?room=${roomId}`
}

export const Lobby = ({ seats, size, host, isHost, roomId, onSit, onStart, onLeave }: LobbyProps) => {
  const { t } = useTranslation()
  const [copied, setCopied] = React.useState(false)
  const humans = seats.filter((occupant) => occupant?.connected === true && occupant.ai !== true).length
  const aiSeats = seats.filter((occupant) => occupant === null || occupant.ai === true).length
  const canStart = humans >= 2
  const link = inviteUrl(roomId)

  const teams = Array.from({ length: sideCount(size) }, (_, side) =>
    seats.map((occupant, index) => ({ occupant, index })).filter(({ index }) => sideOf(index, size) === side),
  )

  return (
    <ModalOverlay>
      <ModalPanel>
        <Title>Scopa</Title>

        <Teams aria-label={t('playersInRoom')} role="group">
          {teams.map((members, side) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: side never reorders — it's derived from a fixed sideCount(size)
            <TeamGroup key={`team-${side}`} role="group" aria-label={t('team', { number: side + 1 })}>
              <SeatRow>
                {members.map(({ occupant, index }) =>
                  occupant?.connected ? (
                    <Seat key={`seat-${index}`} data-connected="true">
                      {occupant.avatar}
                      {host === index && <HostBadge role="img" aria-label={t('host')} />}
                      {occupant.confirmed && <ConfirmedIndicator>✓</ConfirmedIndicator>}
                    </Seat>
                  ) : (
                    <EmptySeat key={`seat-${index}`} data-connected="false">
                      <SeatButton
                        type="button"
                        aria-label={t(occupant === null ? 'sitHereAi' : 'sitHere', { seat: index + 1 })}
                        onClick={() => onSit(index)}
                      >
                        {occupant?.avatar ?? '🤖'}
                      </SeatButton>
                    </EmptySeat>
                  ),
                )}
              </SeatRow>
            </TeamGroup>
          ))}
        </Teams>

        <Status>
          {!canStart ? t('needOneMorePlayer') : aiSeats > 0 ? t('readyWithAi', { count: aiSeats }) : t('readyToStart')}
        </Status>

        <InviteBlock>
          <InviteLabel htmlFor="invite-link">{t('inviteFriends')}</InviteLabel>
          <InviteControls>
            <InviteInput id="invite-link" readOnly value={link} onFocus={(event) => event.target.select()} />
            <Button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(link)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? t('linkCopied') : t('copyLink')}
            </Button>
          </InviteControls>
        </InviteBlock>

        {isHost && (
          <Button onClick={onStart} disabled={!canStart}>
            {t('start')}
          </Button>
        )}

        <TextButton type="button" onClick={onLeave}>
          {t('backToTitle')}
        </TextButton>
      </ModalPanel>
    </ModalOverlay>
  )
}
