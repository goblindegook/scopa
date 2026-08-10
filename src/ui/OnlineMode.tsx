import React from 'react'
import { play } from '../engine/scopa'
import { score } from '../engine/scores'
import type { Move, State } from '../engine/state'
import { Alert } from './atoms/Alert'
import { ModalOverlay, ModalPanel } from './atoms/ModalOverlay'
import { AvatarPicker } from './molecules/AvatarPicker'
import { Lobby } from './pages/Lobby'
import { Scopa } from './pages/Scopa'
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
  readonly onBack: () => void
  readonly onLeave: () => void
  readonly forgetSeat: React.RefObject<(() => void) | null>
}

export const OnlineMode = ({ roomId, initialAvatar, onBack, onLeave, forgetSeat }: OnlineModeProps) => {
  const {
    avatar,
    lobby,
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
  } = useMultiplayerSession({ roomId, initialAvatar })

  // A fresh identity re-runs Scopa's opponent-turn effect, orphaning the pending nextMove.
  const playerProfiles = React.useMemo(() => lobby.map(({ avatar }) => ({ avatar })), [lobby])

  const playAndSend = React.useCallback(
    (move: Move, game: State) => {
      // Scopa routes remote moves through onPlay too; echoing one back earns a state
      // snapshot from the Worker, which kills the animation that move just started.
      if (game.turn === seat) sendMove(move)
      return play(move, game)
    },
    [seat, sendMove],
  )

  const awaitingConfirmations = lobby.find((player) => player.avatar === avatar)?.confirmed ?? false

  React.useEffect(() => {
    forgetSeat.current = clearSession
    return () => {
      forgetSeat.current = null
    }
  }, [clearSession, forgetSeat])

  if (avatar == null) {
    return <ChooseAvatar onChoose={chooseAvatar} taken={lobby.map((player) => player.avatar)} error={error} />
  }

  if (!state || seat == null) {
    return <Lobby players={lobby} isCreator={seat === 0} roomId={roomId} onStart={start} onLeave={onLeave} />
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
      awaitingConfirmations={awaitingConfirmations}
      onScore={score}
    />
  )
}
