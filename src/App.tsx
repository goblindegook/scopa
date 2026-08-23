import React from 'react'
import { useTranslation } from 'react-i18next'
import './ui/i18n'
import { winner } from './engine/scores'
import { isPlayerCount, type PlayerCount } from './engine/sides'
import type { State } from './engine/state'
import { Alert } from './ui/atoms/Alert'
import { type Difficulty, OfflineMode, type OfflineSession, startOfflineSession } from './ui/OfflineMode'
import { OnlineMode } from './ui/OnlineMode'
import { TitleScreen } from './ui/pages/TitleScreen'
import { preloadCardAssets } from './ui/preload'
import { useActiveRoom } from './ui/useActiveRoom'
import { useAlerts } from './ui/useAlerts'
import { useSavedGameStorage } from './ui/useLocalStorage'

const goTo = (params: Record<string, string>) => {
  const query = new URLSearchParams(params)
  window.location.assign(`${window.location.pathname}?${query}`)
}

function usePreloadedCards(): number {
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    preloadCardAssets(setProgress)
  }, [])

  return progress
}

const App = () => {
  const { t } = useTranslation()
  const params = new URLSearchParams(window.location.search)
  const avatar = params.get('avatar')
  const loadingProgress = usePreloadedCards()
  const [alert, showAlert] = useAlerts(3000)
  const [session, setSession] = React.useState<OfflineSession | null>(null)
  const [roomId, setRoomId] = React.useState(() => params.get('room'))
  // Captured once at mount, like roomId above: the URL-stripping effect below removes
  // `size` from the URL, so reading it live on every render would go blank after the
  // first re-render, well before the async websocket onOpen fires and needs it.
  const [requestedSize] = React.useState(() => Number(params.get('size')))
  const [isTitleMenuVisible, setIsTitleMenuVisible] = React.useState(false)
  const onlineRoom = useActiveRoom()
  const { savedGameState, clearSavedGame } = useSavedGameStorage(session)
  const matchWinner = session ? winner(session.game.score) : null

  React.useEffect(() => {
    if (matchWinner !== null) clearSavedGame()
  }, [clearSavedGame, matchWinner])

  React.useEffect(() => {
    if (roomId && avatar) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?room=${roomId}`)
    }
  }, [avatar, roomId])

  const forgetSeat = React.useRef<(() => void) | null>(null)

  const leaveRoom = React.useCallback(() => {
    forgetSeat.current?.()
    onlineRoom.forget()
    window.history.replaceState(window.history.state, '', window.location.pathname)
    setRoomId(null)
  }, [onlineRoom])

  const startLocalGame = React.useCallback(
    (playerOneAvatar: string, count: PlayerCount, difficulty: Difficulty) => {
      leaveRoom()
      const { session: started, redealt } = startOfflineSession(playerOneAvatar, count, difficulty)
      setSession(started)
      setIsTitleMenuVisible(false)
      if (redealt) showAlert(t('redeal'))
    },
    [leaveRoom, showAlert, t],
  )

  const resumeOfflineGame = React.useCallback(() => {
    setIsTitleMenuVisible(false)
    if (session || !savedGameState) return
    setSession({
      id: crypto.randomUUID(),
      game: savedGameState.game,
      playerProfiles: savedGameState.playerProfiles,
      difficulty: savedGameState.difficulty,
    })
  }, [savedGameState, session])

  const updateGame = React.useCallback((game: State) => {
    setSession((current) => (current ? { ...current, game } : current))
  }, [])

  return (
    <>
      {session && (
        <OfflineMode
          key={session.id}
          session={session}
          onGameStateChange={updateGame}
          onBack={() => setIsTitleMenuVisible(true)}
          onLeave={() => setSession(null)}
        />
      )}
      {roomId && (
        <OnlineMode
          roomId={roomId}
          initialAvatar={avatar}
          size={isPlayerCount(requestedSize) ? requestedSize : undefined}
          onBack={() => setIsTitleMenuVisible(true)}
          onLeave={leaveRoom}
          forgetSeat={forgetSeat}
        />
      )}
      {(isTitleMenuVisible || (session === null && roomId === null)) && (
        <TitleScreen
          loadingProgress={loadingProgress}
          resume={
            onlineRoom.game != null
              ? {
                  kind: 'online',
                  avatars: onlineRoom.game.avatars,
                  score: onlineRoom.game.score,
                  size: onlineRoom.game.size,
                  onResume: roomId
                    ? () => setIsTitleMenuVisible(false)
                    : // biome-ignore lint/style/noNonNullAssertion: onlineRoom.game != null
                      () => goTo({ room: onlineRoom.game!.roomId }),
                }
              : savedGameState
                ? {
                    kind: 'local',
                    avatars: savedGameState.playerProfiles.map((profile) => profile.avatar),
                    score: savedGameState.game.score,
                    onResume: resumeOfflineGame,
                  }
                : undefined
          }
          onStart={startLocalGame}
          onStartMultiplayer={(playerOneAvatar, playerCount) =>
            goTo({ room: crypto.randomUUID(), avatar: playerOneAvatar, size: String(playerCount) })
          }
        />
      )}
      {alert && <Alert role="alert">{alert}</Alert>}
    </>
  )
}

export default App
