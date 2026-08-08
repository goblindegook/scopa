import styled from '@emotion/styled'
import React from 'react'
import { play } from '../engine/scopa'
import { score } from '../engine/scores'
import type { Move, State } from '../engine/state'
import { Alert } from './Alert'
import { AvatarPicker } from './AvatarPicker'
import { Lobby } from './Lobby'
import { Scopa } from './Scopa'
import { useMultiplayerSession } from './useMultiplayerSession'

const AvatarScreen = styled('main')`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.6);
  flex: 1;
  height: 100vh;
  height: 100dvh;
`

const AvatarScreenContent = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 3rem;
  max-width: 540px;
  width: 100%;
`

interface ChooseAvatarProps {
  onChoose: (avatar: string) => void
  taken?: readonly string[]
  error?: string | null
}

/** A friend arriving via a shared link picks an avatar before joining. */
const ChooseAvatar = ({ onChoose, taken = [], error }: ChooseAvatarProps) => (
  <AvatarScreen>
    <AvatarScreenContent>
      <AvatarPicker taken={taken} onSelect={onChoose} />
      {error && <Alert role="alert">{error}</Alert>}
    </AvatarScreenContent>
  </AvatarScreen>
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
