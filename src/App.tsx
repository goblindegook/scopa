import styled from '@emotion/styled'
import { fold, isErr, type Result } from '@pacote/result'
import { shuffle } from '@pacote/shuffle'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { deck } from './engine/cards'
import './ui/i18n'
import { move } from './engine/opponent'
import { deal, play, randomFirstPlayer } from './engine/scopa'
import { score } from './engine/scores'
import type { Move, State } from './engine/state'
import { Lobby } from './ui/Lobby'
import { preloadCardAssets } from './ui/preload'
import { type PlayerProfile, Scopa } from './ui/Scopa'
import { AVATARS, TitleScreen } from './ui/TitleScreen'
import { useActiveRoom } from './ui/useActiveRoom'
import { useAlerts } from './ui/useAlerts'
import { useSavedGameStorage } from './ui/useLocalStorage'
import { useMultiplayerSession } from './ui/useMultiplayerSession'

const dealShuffledDeck = (score?: readonly number[], players: 2 | 3 = 2, previousFirstPlayer?: number) =>
  deal(shuffle(deck()), {
    players,
    score,
    previousFirstPlayer: previousFirstPlayer ?? randomFirstPlayer(players),
  })

const goTo = (params: Record<string, string>) => {
  const query = new URLSearchParams(params)
  window.location.assign(`${window.location.pathname}?${query}`)
}

const AvatarScreen = styled('main')`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.25);
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

const AvatarPickerLabel = styled('p')`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`

const AvatarGrid = styled('div')`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
`

const AvatarButton = styled('button')`
  font-size: 1.75rem;
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, background-color 0.15s, transform 0.1s;
  line-height: 1;

  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
    background-color: rgba(255, 255, 255, 0.15);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const Alert = styled('aside')`
  position: absolute;
  top: 66%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  padding: 1.5rem 2.5rem;
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  white-space: nowrap;
  pointer-events: none;
`

interface ChooseMultiplayerAvatar {
  onChoose: (avatar: string) => void
  taken?: readonly string[]
  error?: string | null
}

/** A friend arriving via a shared link picks an avatar before joining. */
const ChooseMultiplayerAvatar = ({ onChoose, taken = [], error }: ChooseMultiplayerAvatar) => {
  const { t } = useTranslation()

  return (
    <AvatarScreen>
      <AvatarScreenContent>
        <AvatarPickerLabel>{t('chooseAvatar')}</AvatarPickerLabel>
        <AvatarGrid>
          {AVATARS.map((emoji) => (
            <AvatarButton
              key={emoji}
              aria-label={t('selectAvatar', { emoji })}
              disabled={taken.includes(emoji)}
              onClick={() => onChoose(emoji)}
            >
              {emoji}
            </AvatarButton>
          ))}
        </AvatarGrid>
        {error && <Alert role="alert">{error}</Alert>}
      </AvatarScreenContent>
    </AvatarScreen>
  )
}

function createPlayerProfiles(playerOneAvatar: string, count: 2 | 3): readonly PlayerProfile[] {
  return [playerOneAvatar, '🤖', '👾'].slice(0, count).map((avatar) => ({
    avatar,
    canCountCards: Math.random() >= 0.5,
    canLookAhead: false,
    aggression: Math.random() >= 0.5 ? Math.random() * 2 - 1 : undefined,
  }))
}

interface LocalSession {
  readonly game: State
  readonly playerProfiles: readonly PlayerProfile[]
}

const EMPTY_LOCAL_GAME: State = {
  state: 'initial',
  turn: 0,
  firstPlayer: 0,
  players: [],
  pile: [],
  table: [],
  lastTaken: [],
  score: [],
}

function getWinner(totals: readonly number[]): number | null {
  const maxTotal = Math.max(...totals)
  if (maxTotal < 11) return null
  const winners = totals
    .map((total, playerId) => (total === maxTotal ? playerId : -1))
    .filter((playerId) => playerId !== -1)
  return winners.length === 1 ? winners[0] : null
}

function usePreloadedCards(): number {
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    preloadCardAssets(setProgress)
  }, [])

  return progress
}

const LocalApp = () => {
  const { t } = useTranslation()
  const loadingProgress = usePreloadedCards()
  const [alert, showAlert] = useAlerts(3000)
  const [session, setSession] = React.useState<LocalSession | null>(null)
  const activeOnlineRoom = useActiveRoom()
  const activeOnlineRoomId = activeOnlineRoom.roomId
  const { savedGameState, clearSavedGame } = useSavedGameStorage({
    game: session?.game ?? EMPTY_LOCAL_GAME,
    playerProfiles: session?.playerProfiles ?? [],
    winner: session ? getWinner(session.game.score) : null,
  })

  const startLocalGame = React.useCallback(
    (playerOneAvatar: string, count: 2 | 3) => {
      const playerProfiles = createPlayerProfiles(playerOneAvatar, count)
      clearSavedGame()

      let hasRedealt = false
      let startResult = dealShuffledDeck(undefined, count)

      while (isErr(startResult)) {
        hasRedealt = true
        startResult = dealShuffledDeck(undefined, count)
      }

      fold(
        (game: State) => {
          setSession({ game, playerProfiles })
          if (hasRedealt) showAlert(t('redeal'))
        },
        (error: Error) => showAlert(error.message),
        startResult,
      )
    },
    [clearSavedGame, showAlert, t],
  )

  const resumeLocalGame = React.useCallback(() => {
    if (!savedGameState) return
    setSession({
      game: savedGameState.game,
      playerProfiles: savedGameState.playerProfiles,
    })
  }, [savedGameState])

  const playLocalMove = React.useCallback((playerMove: Move, game: State): Result<State, Error> => {
    const result = play(playerMove, game)
    fold(
      (nextGame) => {
        setSession((current) => (current ? { ...current, game: nextGame } : current))
      },
      () => undefined,
      result,
    )
    return result
  }, [])

  const startLocalRound = React.useCallback(
    (runningScore?: readonly number[], players: 2 | 3 = 2, previousFirstPlayer?: number): Result<State, Error> => {
      const result = dealShuffledDeck(runningScore, players, previousFirstPlayer)
      fold(
        (game) => {
          setSession((current) => (current ? { ...current, game } : current))
        },
        () => undefined,
        result,
      )
      return result
    },
    [],
  )

  if (session === null) {
    return (
      <>
        <TitleScreen
          loadingProgress={loadingProgress}
          savedGame={
            savedGameState
              ? {
                  avatars: savedGameState.playerProfiles.map((profile) => profile.avatar),
                  score: savedGameState.game.score,
                }
              : undefined
          }
          onResume={resumeLocalGame}
          onStart={startLocalGame}
          onStartMultiplayer={(avatar) => goTo({ room: crypto.randomUUID(), avatar })}
          onResumeOnline={activeOnlineRoomId ? () => goTo({ room: activeOnlineRoomId }) : undefined}
        />
        {alert && <Alert role="alert">{alert}</Alert>}
      </>
    )
  }

  return (
    <>
      <Scopa
        playerId={0}
        initialState={session.game}
        onReset={() => setSession(null)}
        onStart={startLocalRound}
        onPlay={playLocalMove}
        onOpponentTurn={async (state, options) => {
          await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500))
          return move(state, options)
        }}
        onScore={score}
        playerProfiles={session.playerProfiles}
      />
      {alert && <Alert role="alert">{alert}</Alert>}
    </>
  )
}

const MultiplayerApp = ({ roomId, initialAvatar }: { roomId: string; initialAvatar?: string | null }) => {
  usePreloadedCards()
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

  const leaveRoom = React.useCallback(() => {
    clearSession()
    window.location.assign(window.location.pathname)
  }, [clearSession])

  const backToMenu = React.useCallback(() => {
    window.location.assign(window.location.pathname)
  }, [])

  if (avatar == null) {
    return (
      <ChooseMultiplayerAvatar onChoose={chooseAvatar} taken={lobby.map((player) => player.avatar)} error={error} />
    )
  }

  if (!state || seat == null) {
    return <Lobby players={lobby} isCreator={seat === 0} roomId={roomId} onStart={start} onLeave={leaveRoom} />
  }

  return (
    <Scopa
      playerId={seat}
      state={state}
      onReset={leaveRoom}
      onBack={backToMenu}
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

const App = () => {
  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('room')
  const avatar = params.get('avatar')

  React.useEffect(() => {
    if (roomId && avatar) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?room=${roomId}`)
    }
  }, [avatar, roomId])

  if (roomId) {
    return <MultiplayerApp roomId={roomId} initialAvatar={avatar} />
  }

  return <LocalApp />
}

export default App
