import styled from '@emotion/styled'
import { fold, isErr, type Result } from '@pacote/result'
import { AnimatePresence, motion, type Target } from 'framer-motion'
import React from 'react'
import { type Card, hasCard, isSame } from '../engine/cards'
import type { Score } from '../engine/scores'
import type { Move, State } from '../engine/state'
import { Button } from './Button'
import { AnimatedCard, DealtCard, Card as DisplayCard, Duration } from './Card'
import { OPPONENT_SCALE, Opponent, OpponentCard } from './Opponent'
import { Player, PlayerCard } from './Player'
import { preloadCardAssets } from './preload'
import { GameOver } from './ScoreBoard'
import { Table, TableCard, TableCardLabel, TableCardSelector } from './Table'
import { TitleScreen } from './TitleScreen'
import { useAlerts } from './useAlerts'
import { type DragState, useDragState } from './useDragState'
import { useLocalStorage } from './useLocalStorage'
import { useRefMap } from './useRefMap'

const MAIN_PLAYER = 0

const Header = styled('header')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 1rem;
  font-size: 1rem;
  color: white;
  height: 3.5rem;
  flex-shrink: 0;

  @media (max-height: 600px) {
    padding: 0.5rem;
    font-size: 0.875rem;
    height: 2.5rem;
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

const Turn = styled('span')`
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
`

const TurnScore = styled('span')<{ active: boolean }>`
  color: white;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 2px solid
    ${({ active }) => (active ? 'rgba(74, 222, 128, 0.9)' : 'rgba(255, 255, 255, 0.25)')};
  background-color: ${({ active }) => (active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)')};
  font-weight: ${({ active }) => (active ? 700 : 500)};
`

const Container = styled('div')`
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  position: relative;
  touch-action: manipulation;
`

const Main = styled('main')`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: 100%;
`

interface Position {
  x: number
  y: number
}

interface SavedGameState {
  game: State
  playerAvatars: [string, string]
}

interface GameProps {
  onStart: (wins?: readonly number[]) => Result<State, Error>
  onPlay: (move: Move, game: State) => Result<State, Error>
  onOpponentTurn: (game: State) => Promise<Move>
  onScore: (game: State['players']) => readonly Score[]
}

interface CaptureAnimationState {
  readonly card: Card
  readonly initial?: Target
  readonly animate?: Target
}

interface HandCardsProps {
  hand: readonly Card[]
  previousHand: readonly Card[]
  keyPrefix?: string
  renderCard: (card: Card) => React.ReactNode
}

type AnimationController =
  | { phase: 'idle' }
  | {
      phase: 'play'
      activePlayerId: number
      playCard: Card
      playFaceDown: boolean
      playInitial: Target
      playAnimate?: Target
    }
  | { phase: 'capture'; captures: readonly CaptureAnimationState[] }

export const Game = ({ onStart, onPlay, onOpponentTurn, onScore }: GameProps) => {
  const [loadingProgress, setLoadingProgress] = React.useState(0)
  const [alert, showAlert] = useAlerts(4000)
  const [playerAvatars, setPlayerAvatars] = React.useState<[string, string]>(['🐵', '🤖'])
  const [capture, setCapture] = React.useState<readonly Card[]>([])
  const [game, setGame] = React.useState<State>({
    state: 'initial',
    turn: 0,
    table: [],
    pile: [],
    players: [],
    lastCaptured: [],
    wins: [0, 0],
  })
  const [savedGameState, setSavedGameState] = useLocalStorage<SavedGameState | null>('saved-game', null)
  const tableRef = React.useRef<HTMLElement | null>(null)
  const handScoresRef = React.useRef<readonly Score[]>([])
  const [cardRefs, getCardRef] = useRefMap<string>()
  const [playerPileRefs, getPlayerPileRef] = useRefMap<number>()
  const [animation, setAnimation] = React.useState<AnimationController>({ phase: 'idle' })
  const previousTableRef = React.useRef<readonly Card[]>([])
  const previousPlayersHandsRef = React.useRef<readonly (readonly Card[])[]>([])
  const [tableDealOrder, setTableDealOrder] = React.useState(new Map<string, number>())
  const playCardFromRef = React.useRef<{ card: Card; position: Position } | null>(null)

  React.useEffect(() => {
    preloadCardAssets((progress) => setLoadingProgress(progress))
  }, [])

  const gameWinner = game.wins[0] >= 11 ? 0 : game.wins[1] >= 11 ? 1 : null

  React.useEffect(() => {
    if (game.state === 'initial') return
    if (gameWinner !== null) {
      setSavedGameState(null)
      return
    }
    setSavedGameState({ game, playerAvatars })
  }, [game, playerAvatars, gameWinner, setSavedGameState])

  const invalidMove = React.useCallback((error: Error) => showAlert(error.message), [showAlert])

  // biome-ignore lint/correctness/useExhaustiveDependencies: cardRefs is stable, empty deps are correct
  const getCardPosition = React.useCallback((card?: Card) => getPosition(cardRefs.current.get(getCardId(card))), [])

  const getWinner = (scores: readonly Score[]): number | null => {
    const maxTotal = Math.max(...scores.map((player) => player.total))
    const winners = scores.filter((player) => player.total === maxTotal)
    return winners.length === 1 ? winners[0].playerId : null
  }

  const start = React.useCallback(
    (resetScore = false) => {
      const wins = resetScore ? [0, 0] : game.wins
      let redealt = false
      let startResult = onStart(wins)

      while (isErr(startResult)) {
        redealt = true
        startResult = onStart(wins)
      }

      return fold(
        (nextState: State) => {
          setGame(nextState)
          setCapture([])

          if (redealt) showAlert('Opening table with more than two kings, re-dealing hand.')

          if (nextState.state === 'stop') handScoresRef.current = onScore(nextState.players)
          setTableDealOrder(toOrder(nextState.table))
          setAnimation({ phase: 'idle' })
          previousTableRef.current = []
          previousPlayersHandsRef.current = []
        },
        invalidMove,
        startResult,
      )
    },
    [invalidMove, onScore, onStart, showAlert, game.wins],
  )

  const startNewGame = React.useCallback(() => {
    setSavedGameState(null)
    start(true)
  }, [start, setSavedGameState])

  const resume = React.useCallback(() => {
    if (!savedGameState) return
    setPlayerAvatars(savedGameState.playerAvatars)
    setGame(savedGameState.game)
  }, [savedGameState])

  const resetToTitle = React.useCallback(() => {
    setGame({ state: 'initial', turn: 0, table: [], pile: [], players: [], lastCaptured: [], wins: [0, 0] })
  }, [])

  const play = React.useCallback(
    (move: Move) => {
      fold(
        (nextState: State) => {
          const playCardFrom = playCardFromRef.current
          playCardFromRef.current = null

          const isOpponentTurn = game.turn !== MAIN_PLAYER
          const baseInitial =
            getCardId(playCardFrom?.card) === getCardId(move.card)
              ? { ...playCardFrom?.position }
              : (getCardPosition(move.card) ?? { x: 0, y: 0 })
          setAnimation({
            phase: 'play',
            activePlayerId: game.turn,
            playCard: move.card,
            playInitial: isOpponentTurn ? { ...baseInitial, scale: OPPONENT_SCALE } : baseInitial,
            playFaceDown: isOpponentTurn,
          })

          previousTableRef.current = game.table
          previousPlayersHandsRef.current = game.players.map((p) => p.hand)
          setGame(nextState)
          setCapture([])

          if (nextState.lastCaptured.length === game.table.length) showAlert('Scopa!')

          if (nextState.state === 'stop') handScoresRef.current = onScore(nextState.players)
        },
        invalidMove,
        onPlay(move, game),
      )
    },
    [onPlay, game, invalidMove, getCardPosition, onScore, showAlert],
  )

  const { dragState, isClickSuppressed, startDragging, clearDragging } = useDragState(
    game.turn === MAIN_PLAYER && animation.phase === 'idle',
    React.useCallback(
      (card: Card, position: { x: number; y: number }, pointer: { x: number; y: number }) => {
        const rect = tableRef.current?.getBoundingClientRect()
        const isOnTable =
          rect != null &&
          pointer.x >= rect.left &&
          pointer.x <= rect.right &&
          pointer.y >= rect.top &&
          pointer.y <= rect.bottom
        if (isOnTable) {
          playCardFromRef.current = { card, position }
          play({ card, capture })
        }
        return isOnTable
      },
      [capture, play],
    ),
  )

  const animatePlayTo = React.useCallback(
    (placeholder?: Element | null) => {
      if (placeholder == null) return
      const animateRect = placeholder.getBoundingClientRect()
      setAnimation((prev) =>
        prev.phase !== 'play' || prev.playAnimate
          ? prev
          : {
              ...prev,
              playInitial: { ...prev.playInitial, ...(getCardPosition(prev.playCard) ?? {}) },
              playAnimate: { x: animateRect.left, y: animateRect.top, scale: 1 },
            },
      )
    },
    [getCardPosition],
  )

  React.useLayoutEffect(() => {
    if (animation.phase === 'play' && !animation.playAnimate) {
      animatePlayTo(
        tableRef.current?.querySelector(
          `label[for="table-${getCardId(game.lastCaptured?.[0] ?? animation.playCard)}"]`,
        ),
      )
    }
  }, [animation, animatePlayTo, game.lastCaptured])

  React.useEffect(() => {
    if (game.state !== 'play') return

    const isScopa = previousTableRef.current.length > 0 && previousTableRef.current.length === game.lastCaptured.length
    const captureAnimationsDelay = game.lastCaptured.length ? Duration.CAPTURE : 0
    const cardsToDeal = isScopa ? game.table.filter((c) => !hasCard(previousTableRef.current, c)) : []
    const cardDealingAnimationsDelay = captureAnimationsDelay + Duration.DEAL * cardsToDeal.length + Duration.CAPTURE

    const captureTimeoutId = setTimeout(() => {
      if (cardsToDeal.length) {
        setTableDealOrder(toOrder(cardsToDeal))
      }
    }, 1000 * captureAnimationsDelay)

    const dealTimeoutId = setTimeout(() => {
      previousTableRef.current = game.table
      previousPlayersHandsRef.current = game.players.map((p) => p.hand)
      setTableDealOrder(new Map())
    }, 1000 * cardDealingAnimationsDelay)

    return () => {
      clearTimeout(captureTimeoutId)
      clearTimeout(dealTimeoutId)
    }
  }, [game.lastCaptured, game.players, game.state, game.table])

  React.useEffect(() => {
    if (game.state === 'play' && game.turn !== MAIN_PLAYER && !tableDealOrder.size) {
      const animationDelay = Duration.TURN + Duration.PLAY
      const timeoutId = setTimeout(() => onOpponentTurn(game).then(play).catch(invalidMove), 1000 * animationDelay)
      return () => clearTimeout(timeoutId)
    }
  }, [game, invalidMove, onOpponentTurn, play, tableDealOrder])

  const toggleCapture = React.useCallback((card: Card) => {
    setCapture((current) => (hasCard(current, card) ? current.filter((c) => !isSame(c, card)) : [...current, card]))
  }, [])

  const animatingCardIds = React.useMemo<string[]>(() => {
    if (animation.phase === 'play') return [getCardId(animation.playCard)]
    if (animation.phase === 'capture') return animation.captures.map((a) => getCardId(a.card))
    return []
  }, [animation])

  const getFilteredPile = React.useCallback(
    (playerId: number) =>
      game.players[playerId]?.pile.filter(
        (card) => !hasCard(game.lastCaptured, card) && !animatingCardIds.includes(getCardId(card)),
      ) ?? [],
    [game.players, game.lastCaptured, animatingCardIds],
  )

  const tableCards =
    animation.phase === 'play' && game.lastCaptured.length && previousTableRef.current.length && !tableDealOrder.size
      ? previousTableRef.current
      : game.table

  return (
    <Container>
      {game.state === 'initial' && (
        <TitleScreen
          loadingProgress={loadingProgress}
          savedAvatar={savedGameState?.playerAvatars[0]}
          onResume={resume}
          onStart={(avatar) => {
            setPlayerAvatars([avatar, '🤖'])
            startNewGame()
          }}
        />
      )}
      {game.state !== 'initial' && (
        <Main>
          {game.state === 'play' && (
            <Header>
              <Button onClick={startNewGame}>New Game</Button>
              <Turn aria-label="Hands won">
                {[0, 1].map((playerId) => (
                  <TurnScore
                    key={`player-score-${playerId}`}
                    active={game.turn === playerId}
                    data-active={game.turn === playerId}
                  >
                    {playerAvatars[playerId]} {game.wins[playerId] ?? 0}
                  </TurnScore>
                ))}
              </Turn>
            </Header>
          )}
          {game.players.map(
            (player) =>
              player.id !== MAIN_PLAYER && (
                <Opponent
                  key={`opponent-${player.id}`}
                  ref={getPlayerPileRef(player.id)}
                  index={player.id}
                  pile={getFilteredPile(player.id)}
                >
                  <HandCards
                    hand={player.hand}
                    previousHand={previousPlayersHandsRef.current[player.id] ?? []}
                    keyPrefix={`${player.id}-`}
                    renderCard={(card) => (
                      <OpponentCard
                        ref={getCardRef(getCardId(card))}
                        card={card}
                        faceDown
                        opacity={animation.phase === 'play' && isSame(animation.playCard, card) ? 0 : 1}
                      />
                    )}
                  />
                </Opponent>
              ),
          )}
          <Table data-testid="table" layout ref={tableRef}>
            <AnimatePresence mode="popLayout">
              {/* Table cards */}
              {tableCards.map((card) => {
                const cardId = getCardId(card)
                const isCaptured = hasCard(game.lastCaptured, card)
                const isAnimating = animatingCardIds.includes(cardId)
                const order = tableDealOrder.get(cardId)
                const motion = getTableCardMotion({ isAnimating, order })

                return (
                  <TableCardLabel
                    key={`table-${cardId}`}
                    htmlFor={`table-${cardId}`}
                    layout={!isAnimating}
                    onLayoutAnimationComplete={() =>
                      animatePlayTo(
                        animation.phase === 'play' ? cardRefs.current.get(getCardId(animation.playCard)) : undefined,
                      )
                    }
                    initial={{ opacity: 0 }}
                    animate={motion.animate}
                    exit={{ opacity: 0, scale: 0.3 }}
                    transition={motion.transition}
                    style={{ pointerEvents: isAnimating ? 'none' : 'auto' }}
                  >
                    <TableCardSelector
                      disabled={game.turn !== MAIN_PLAYER || isCaptured || isAnimating}
                      type="checkbox"
                      checked={hasCard(capture, card)}
                      onChange={() => toggleCapture(card)}
                      id={`table-${cardId}`}
                    />
                    <TableCard card={card} />
                  </TableCardLabel>
                )
              })}
            </AnimatePresence>
          </Table>
          {alert && <Alert role="alert">{alert}</Alert>}
          <AnimatePresence>
            {/* Play animation */}
            {animation.phase === 'play' && animation.playAnimate && (
              <AnimatedCard
                card={animation.playCard}
                initial={animation.playInitial}
                animate={animation.playAnimate}
                faceDown={animation.playFaceDown}
                onComplete={() => {
                  if (animation.phase !== 'play') return
                  const { activePlayerId, playCard: playedCard, playAnimate, playInitial } = animation
                  const pileRef = game.lastCaptured.length ? playerPileRefs.current.get(activePlayerId) : undefined

                  if (!pileRef) {
                    setAnimation({ phase: 'idle' })
                    return
                  }

                  const animatedW = Math.min(window.innerWidth * 0.08, (window.innerHeight * 0.4) / 1.66)
                  const animatedH = animatedW * 1.66

                  const pileAreaRect = pileRef.getBoundingClientRect()
                  const targetRect = Array.from(pileRef.children).at(-1)?.getBoundingClientRect() ?? pileAreaRect

                  setAnimation({
                    phase: 'capture',
                    captures: [...game.lastCaptured, playedCard].map((card, index) => ({
                      card,
                      initial:
                        getPosition(tableRef.current?.querySelector(`label[for="table-${getCardId(card)}"]`)) ??
                        playAnimate ??
                        playInitial,
                      animate: {
                        x: targetRect.left + targetRect.width / 2 - animatedW / 2,
                        y: targetRect.top + targetRect.height / 2 - animatedH / 2 - (index + 1) * 2,
                        scale: pileRef.offsetWidth > 0 ? pileAreaRect.width / pileRef.offsetWidth : 1,
                      },
                    })),
                  })
                }}
              />
            )}
            {/* Capture animations */}
            {animation.phase === 'capture' &&
              animation.captures
                .filter((a): a is CaptureAnimationState & { readonly animate: Target } => a.animate != null)
                .map((a, index, filtered) => (
                  <AnimatedCard
                    key={`captured-${getCardId(a.card)}`}
                    card={a.card}
                    initial={a.initial}
                    animate={a.animate}
                    faceDown={false}
                    flip
                    onComplete={() => {
                      if (index === filtered.length - 1) setAnimation({ phase: 'idle' })
                    }}
                  />
                ))}
          </AnimatePresence>
          <Player ref={getPlayerPileRef(MAIN_PLAYER)} index={MAIN_PLAYER} pile={getFilteredPile(MAIN_PLAYER)}>
            <HandCards
              hand={game.players[MAIN_PLAYER].hand}
              previousHand={previousPlayersHandsRef.current[MAIN_PLAYER] ?? []}
              renderCard={(card) => (
                <PlayerCard
                  ref={getCardRef(getCardId(card))}
                  disabled={game.turn !== MAIN_PLAYER || animation.phase !== 'idle'}
                  draggable={false}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return
                    startDragging(card, event.currentTarget, { x: event.clientX, y: event.clientY }, event.pointerId)
                  }}
                  onClick={() => {
                    if (!isClickSuppressed()) play({ card, capture })
                  }}
                  style={
                    isSame(dragState?.card, card) && (dragState?.type === 'returning' || dragState?.active)
                      ? { opacity: 0, visibility: 'hidden' }
                      : {
                          opacity: animation.phase === 'play' && isSame(animation.playCard, card) ? 0 : 1,
                        }
                  }
                >
                  <DisplayCard card={card} />
                </PlayerCard>
              )}
            />
          </Player>
          <DragOverlay dragState={dragState} onSpringBackComplete={clearDragging} />
        </Main>
      )}
      {game.state === 'stop' && (
        <GameOver
          playerAvatars={playerAvatars}
          scores={handScoresRef.current}
          handWins={game.wins}
          handWinner={getWinner(handScoresRef.current)}
          gameWinner={gameWinner}
          onNextHand={() => start()}
          onReset={resetToTitle}
        />
      )}
    </Container>
  )
}

interface DragOverlayProps {
  dragState: DragState
  onSpringBackComplete: () => void
}

const DragOverlay = ({ dragState, onSpringBackComplete }: DragOverlayProps) => {
  if (dragState?.type === 'returning') {
    return (
      <motion.div
        initial={{ x: dragState.from.x, y: dragState.from.y }}
        animate={{ x: dragState.to.x, y: dragState.to.y }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        onAnimationComplete={onSpringBackComplete}
        style={{ position: 'fixed', zIndex: 10001, pointerEvents: 'none' }}
      >
        <DisplayCard card={dragState.card} />
      </motion.div>
    )
  }

  if (dragState?.active)
    return (
      <div
        style={{
          position: 'fixed',
          left: dragState.position.x - dragState.offset.x,
          top: dragState.position.y - dragState.offset.y,
          zIndex: 10001,
          pointerEvents: 'none',
        }}
      >
        <DisplayCard card={dragState.card} />
      </div>
    )
}

const HandCards = ({ hand, previousHand, keyPrefix = '', renderCard }: HandCardsProps) => {
  const newCards = hand.filter((card) => !hasCard(previousHand, card))
  return (
    <>
      {hand.map((card) => (
        <DealtCard
          key={`${keyPrefix}${getCardId(card)}`}
          isNew={!hasCard(previousHand, card)}
          index={newCards.findIndex((c) => isSame(c, card))}
        >
          {renderCard(card)}
        </DealtCard>
      ))}
    </>
  )
}

const getTableCardMotion = ({ isAnimating, order }: { isAnimating: boolean; order?: number }) => {
  if (isAnimating) return { animate: { opacity: 0, scale: 1 }, transition: { duration: 0 } }
  if (order == null) {
    return {
      animate: { opacity: 1, scale: 1 },
      transition: { type: 'spring' as const, stiffness: 200, damping: 25, opacity: { duration: 0 } },
    }
  }

  const delay = order * Duration.DEAL
  return {
    animate: { opacity: 1, scale: [0.5, 1.2, 1] },
    transition: {
      delay,
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
      opacity: { duration: Duration.DEAL, delay, ease: 'easeOut' as const },
      scale: { duration: 0.7, times: [0, 0.6, 1], delay, ease: [0.34, 1.56, 0.64, 1] as const },
    },
  }
}

const getCardId = (card?: Card | null) => card?.join('-') ?? ''

const toOrder = (pile: readonly Card[]) => new Map(pile.map((card, index) => [getCardId(card), index]))

const getPosition = (element?: Element | null): { x: number; y: number } | null => {
  const r = element?.getBoundingClientRect()
  return r ? { x: r.left, y: r.top } : null
}
