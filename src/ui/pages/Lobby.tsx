import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../atoms/Button'
import { ModalOverlay, ModalPanel } from '../atoms/ModalOverlay'

const MAX_SEATS = 3

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

const ConfirmedIndicator = styled('span')`
  position: absolute;
  right: -0.25rem;
  bottom: -0.25rem;
  font-size: 1rem;
  line-height: 1;
  color: var(--color-accent);
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
}

interface LobbyProps {
  players: readonly LobbyPlayer[]
  isCreator: boolean
  roomId: string
  onStart: () => void
  onLeave: () => void
}

export function inviteUrl(roomId: string): string {
  return `${window.location.origin}${window.location.pathname}?room=${roomId}`
}

export const Lobby = ({ players, isCreator, roomId, onStart, onLeave }: LobbyProps) => {
  const { t } = useTranslation()
  const [copied, setCopied] = React.useState(false)
  const connectedCount = players.filter(({ connected }) => connected).length
  const canStart = connectedCount >= 2
  const link = inviteUrl(roomId)
  const emptySeats = Array.from({ length: Math.max(0, MAX_SEATS - players.length) }, (_, index) => `seat-${index}`)

  const copy = async () => {
    await navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <ModalOverlay>
      <ModalPanel>
        <Title>Scopa</Title>

        <SeatRow aria-label={t('playersInRoom')}>
          {players.map(({ avatar, connected, confirmed }) => (
            <Seat key={avatar} data-connected={connected}>
              {avatar}
              {confirmed && <ConfirmedIndicator>✓</ConfirmedIndicator>}
            </Seat>
          ))}
          {emptySeats.map((seat) => (
            <EmptySeat key={seat} aria-hidden="true" />
          ))}
        </SeatRow>

        <Status>{canStart ? t('readyToStart') : t('waitingForPlayers')}</Status>

        <InviteBlock>
          <InviteLabel htmlFor="invite-link">{t('inviteFriends')}</InviteLabel>
          <InviteControls>
            <InviteInput id="invite-link" readOnly value={link} onFocus={(event) => event.target.select()} />
            <Button type="button" onClick={copy}>
              {copied ? t('linkCopied') : t('copyLink')}
            </Button>
          </InviteControls>
        </InviteBlock>

        {isCreator && (
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
