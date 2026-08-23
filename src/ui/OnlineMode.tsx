import React from 'react'
import { play } from '../engine/scopa'
import { score } from '../engine/scores'
import type { PlayerCount } from '../engine/sides'
import type { Move, State } from '../engine/state'
import { Alert } from './atoms/Alert'
import { ModalOverlay, ModalPanel } from './atoms/ModalOverlay'
import { AvatarPicker } from './molecules/AvatarPicker'
import { Lobby } from './pages/Lobby'
import { Scopa } from './pages/Scopa'
import type { LobbyPlayer } from './useMultiplayerSession'
import { useMultiplayerSession } from './useMultiplayerSession'

interface ChooseAvatarProps {
  onChoose: (avatar: string) => void
  taken?: readonly string[]
  error?: string | null
}

/** A friend arriving via a shared link picks an avatar before joining. */
const ChooseAvatar = ({ onChoose, taken = [], error }: ChooseAvatarProps) => (
  <ModalOverlay>
    <ModalPanel>
      <AvatarPicker taken={taken} onSelect={onChoose} />
      {error && <Alert role="alert">{error}</Alert>}
    </ModalPanel>
  </ModalOverlay>
)

interface OnlineModeProps {
  readonly roomId: string
  readonly initialAvatar?: string | null
  readonly size?: PlayerCount
  readonly onBack: () => void
  readonly onLeave: () => void
  readonly forgetSeat: React.RefObject<(() => void) | null>
}

export const OnlineMode = ({ roomId, initialAvatar, size, onBack, onLeave, forgetSeat }: OnlineModeProps) => {
  const {
    avatar,
    seats,
    size: roomSize,
    host,
    state,
    seat,
    error,
    chooseAvatar,
    clearSession,
    nextMove,
    cancelMove,
    start,
    confirm,
    sendMove,
    sit,
  } = useMultiplayerSession({ roomId, initialAvatar, size })

  // A fresh identity re-runs Scopa's opponent-turn effect, orphaning the pending nextMove.
  const playerProfiles = React.useMemo(() => seats.map((player) => ({ avatar: player?.avatar ?? '' })), [seats])

  const playAndSend = React.useCallback(
    (move: Move, game: State) => {
      // Scopa routes remote moves through onPlay too; echoing one back earns a state
      // snapshot from the Worker, which kills the animation that move just started.
      if (game.turn === seat) sendMove(move)
      return play(move, game)
    },
    [seat, sendMove],
  )

  const awaitingAvatars = React.useMemo(() => {
    const hasConfirmedNextRound = seat !== null && seats[seat]?.confirmed === true
    if (!hasConfirmedNextRound) return []

    return seats
      .filter((occupant, index): occupant is LobbyPlayer => {
        return index !== seat && occupant?.connected === true && !occupant.confirmed
      })
      .map((occupant) => occupant.avatar)
  }, [seat, seats])

  React.useEffect(() => {
    forgetSeat.current = clearSession
    return () => {
      forgetSeat.current = null
    }
  }, [clearSession, forgetSeat])

  if (avatar == null) {
    return (
      <ChooseAvatar
        onChoose={chooseAvatar}
        taken={seats.flatMap((player) => (player ? [player.avatar] : []))}
        error={error}
      />
    )
  }

  if (!state || seat == null) {
    return (
      <Lobby
        seats={seats}
        size={roomSize}
        host={host}
        isHost={host !== null && host === seat}
        roomId={roomId}
        onSit={sit}
        onStart={start}
        onLeave={onLeave}
      />
    )
  }

  return (
    <Scopa
      playerId={seat}
      state={state}
      onReset={onLeave}
      onBack={onBack}
      playerProfiles={playerProfiles}
      onPlay={playAndSend}
      onOpponentTurn={nextMove}
      onCancelOpponentTurn={cancelMove}
      onNextRound={confirm}
      waitingFor={awaitingAvatars}
      onScore={score}
    />
  )
}
