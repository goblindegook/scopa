import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

const MAX_SEATS = 3

const LobbyContainer = styled('main')`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.6);
  min-height: 100dvh;
  padding: 1rem;
  box-sizing: border-box;
`

const LobbyContent = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.75rem;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 2.5rem;
  max-width: 30rem;
  width: 100%;

  @media (max-height: 600px) {
    gap: 1rem;
    padding: 1.5rem;
  }
`

const Title = styled('h1')`
  color: white;
  font-size: 3rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  letter-spacing: 0.05em;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);

  @media (max-height: 600px) {
    font-size: 2rem;
  }
`

const SeatRow = styled('ul')`
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
`

const Seat = styled('li')`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  font-size: 2.25rem;
  line-height: 1;
  border-radius: 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.25);
  background-color: rgba(255, 255, 255, 0.08);
  position: relative;
  transition: opacity 0.15s;

  &[data-connected='false'] {
    opacity: 0.4;
  }
`

const EmptySeat = styled(Seat)`
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.15);
  background-color: transparent;
`

const ConfirmedIndicator = styled('span')`
  position: absolute;
  right: -0.25rem;
  bottom: -0.25rem;
  font-size: 1rem;
  line-height: 1;
  color: rgb(74, 222, 128);
`

const Status = styled('p')`
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
  text-align: center;
`

const InviteBlock = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`

const InviteLabel = styled('label')`
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const InviteControls = styled('div')`
  display: flex;
  gap: 0.5rem;
`

const InviteInput = styled('input')`
  flex: 1;
  min-width: 0;
  border-radius: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(0, 0, 0, 0.35);
  color: white;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  font-family: inherit;
`

const TextButton = styled('button')`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  padding: 0.25rem;
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
    <LobbyContainer>
      <LobbyContent>
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
      </LobbyContent>
    </LobbyContainer>
  )
}
