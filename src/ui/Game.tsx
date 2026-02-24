import styled from '@emotion/styled'
import { fold, type Result } from '@pacote/result'
import { AnimatePresence, type Target } from 'framer-motion'
import { includes, without } from 'ramda'
import React from 'react'
import { type Card, isSame } from '../engine/cards'
import type { Score } from '../engine/scores'
import type { Move, State } from '../engine/state'
import { Button } from './Button'
import { AnimatedCard, DealtCard, Card as DisplayCard, Duration } from './Card'
import { Opponent, OpponentCard } from './Opponent'
import { Player, PlayerCard } from './Player'
import { preloadCardAssets } from './preload'
import { GameOver } from './ScoreBoard'
import { Table, TableCard, TableCardLabel, TableCardSelector } from './Table'
import { TitleScreen } from './TitleScreen'

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
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  padding: 0.75rem 1.5rem;
  text-align: center;
  font-size: 1rem;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  white-space: nowrap;
  pointer-events: none;
`

const Turn = styled('span')`
  color: white;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 0.25rem;
  padding: 0.25rem 1rem;
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

interface GameProps {
  onStart: () => Result<State, Error>
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

type AnimationPhase = 'idle' | 'play' | 'capture'

interface AnimationController {
  readonly phase: AnimationPhase
  readonly activePlayerId?: number
  readonly playCard?: Card
  readonly playFaceDown?: boolean
  readonly playInitial?: Target
  readonly playAnimate?: Target
  readonly captures: readonly CaptureAnimationState[]
}

const IDLE_ANIMATION: AnimationController = {
  phase: 'idle',
  captures: [],
}

export const Game = ({ onStart, onPlay, onOpponentTurn, onScore }: GameProps) => {
  const [loadingProgress, setLoadingProgress] = React.useState(0)
  const [alert, setAlert] = React.useState('')
  const [capture, setCapture] = React.useState<readonly Card[]>([])
  const [game, setGame] = React.useState<State>({
    state: 'initial',
    turn: 0,
    table: [],
    pile: [],
    players: [],
    lastCaptured: [],
  })
  const tableRef = React.useRef<HTMLElement | null>(null)
  const cardRefs = React.useRef(new Map<string, HTMLElement>())
  const cardRefCallbacks = React.useRef(new Map<string, (el?: HTMLElement | null) => void>())
  const playerPileRefs = React.useRef(new Map<number, HTMLElement>())
  const playerPileRefCallbacks = React.useRef(new Map<number, (el?: HTMLElement | null) => void>())
  const [animation, setAnimation] = React.useState<AnimationController>(IDLE_ANIMATION)
  const previousTableRef = React.useRef<readonly Card[]>([])
  const previousPlayersHandsRef = React.useRef<readonly (readonly Card[])[]>([])
  const [tableDealOrder, setTableDealOrder] = React.useState(new Map<string, number>())

  React.useEffect(() => {
    preloadCardAssets((progress) => setLoadingProgress(progress))
  }, [])

  const invalidMove = React.useCallback(async (error: Error) => setAlert(error.message), [])

  const getCardPosition = React.useCallback((card?: Card) => getPosition(cardRefs.current.get(getCardId(card))), [])

  const updateCardRefs = React.useCallback((card: Card, el?: HTMLElement | null) => {
    if (el) cardRefs.current.set(getCardId(card), el)
    else cardRefs.current.delete(getCardId(card))
  }, [])

  const updatePlayerPileRefs = React.useCallback((playerId: number, el?: HTMLElement | null) => {
    if (el) playerPileRefs.current.set(playerId, el)
    else playerPileRefs.current.delete(playerId)
  }, [])

  const getCardRef = React.useCallback(
    (card: Card) => {
      const id = getCardId(card)
      const existing = cardRefCallbacks.current.get(id)
      if (existing) return existing
      const callback = (el?: HTMLElement | null) => updateCardRefs(card, el)
      cardRefCallbacks.current.set(id, callback)
      return callback
    },
    [updateCardRefs],
  )

  const getPlayerPileRef = React.useCallback(
    (playerId: number) => {
      const existing = playerPileRefCallbacks.current.get(playerId)
      if (existing) return existing
      const callback = (el?: HTMLElement | null) => updatePlayerPileRefs(playerId, el)
      playerPileRefCallbacks.current.set(playerId, callback)
      return callback
    },
    [updatePlayerPileRefs],
  )

  const start = React.useCallback(
    () =>
      fold(
        (nextState: State) => {
          setGame(nextState)
          setCapture([])
          setAlert('')
          setTableDealOrder(toOrder(nextState.table))
          setAnimation(IDLE_ANIMATION)
          previousTableRef.current = []
          previousPlayersHandsRef.current = []
        },
        invalidMove,
        onStart(),
      ),
    [invalidMove, onStart],
  )

  const play = React.useCallback(
    (move: Move) => {
      fold(
        (nextState: State) => {
          if (move.card || nextState.lastCaptured.length > 0) {
            setAnimation({
              phase: 'play',
              activePlayerId: game.turn,
              playCard: move.card,
              playInitial: getCardPosition(move.card) ?? { x: 0, y: 0 },
              playFaceDown: game.turn !== MAIN_PLAYER,
              captures: [],
            })
          }

          previousTableRef.current = game.table
          previousPlayersHandsRef.current = game.players.map((p) => p.hand)
          setGame(nextState)
          setCapture([])
          setAlert(nextState.lastCaptured.length === game.table.length ? 'Scopa!' : '')
        },
        invalidMove,
        onPlay(move, game),
      )
    },
    [onPlay, game, invalidMove, getCardPosition],
  )

  const animatePlayTo = React.useCallback(
    (placeholder?: Element | null) => {
      if (placeholder == null || animation.playCard == null || animation.playAnimate) return
      const animateRect = placeholder.getBoundingClientRect()
      setAnimation((prev) =>
        prev.playCard == null || prev.playAnimate
          ? prev
          : {
              ...prev,
              playInitial: getCardPosition(prev.playCard) ?? prev.playInitial,
              playAnimate: { x: animateRect.left, y: animateRect.top },
            },
      )
    },
    [animation.playCard, animation.playAnimate, getCardPosition],
  )

  React.useLayoutEffect(() => {
    if (animation.playCard && !animation.playAnimate) {
      animatePlayTo(
        tableRef.current?.querySelector(
          `label[for="table-${getCardId(game.lastCaptured?.[0] ?? animation.playCard)}"]`,
        ),
      )
    }
  }, [animation.playCard, animation.playAnimate, animatePlayTo, game.lastCaptured])

  React.useEffect(() => {
    if (game.state !== 'play') return

    const isScopa = previousTableRef.current.length > 0 && previousTableRef.current.length === game.lastCaptured.length
    const captureAnimationsDelay = game.lastCaptured.length ? Duration.CAPTURE : 0
    const cardsToDeal = isScopa ? game.table.filter((c) => !includes(c, previousTableRef.current ?? [])) : []
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
      const animationDelay = Duration.TURN + Duration.PLAY + Duration.DEAL * tableDealOrder.size
      const timeoutId = setTimeout(() => onOpponentTurn(game).then(play).catch(invalidMove), 1000 * animationDelay)
      return () => clearTimeout(timeoutId)
    }
  }, [game, invalidMove, onOpponentTurn, play, tableDealOrder])

  const toggleCapture = React.useCallback(
    (card: Card) => setCapture(includes(card, capture) ? without([card], capture) : [...capture, card]),
    [capture],
  )

  const animatingCardIds = React.useMemo(() => {
    const ids = new Set(animation.captures.map((a) => getCardId(a.card)))
    if (animation.playCard) ids.add(getCardId(animation.playCard))
    return ids
  }, [animation.captures, animation.playCard])

  const getFilteredPile = React.useCallback(
    (playerId: number) =>
      game.players[playerId]?.pile.filter(
        (card) => !includes(card, game.lastCaptured) && !animatingCardIds.has(getCardId(card)),
      ) ?? [],
    [game.players, game.lastCaptured, animatingCardIds],
  )

  return (
    <Container>
      {game.state === 'initial' && <TitleScreen loadingProgress={loadingProgress} onStart={start} />}
      {game.state === 'stop' && <GameOver scores={onScore(game.players)} onStart={start} />}
      {game.state === 'play' && (
        <Main>
          <Header>
            <Button onClick={start}>New Game</Button>
            {<Turn>Player {game.turn + 1}</Turn>}
          </Header>
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
                        ref={getCardRef(card)}
                        card={card}
                        faceDown
                        opacity={isSame(animation.playCard, card) ? 0 : 1}
                      />
                    )}
                  />
                </Opponent>
              ),
          )}
          <Table layout ref={tableRef}>
            <AnimatePresence mode="popLayout">
              {/* Table cards */}
              {(() => {
                const shouldKeepPreviousTable =
                  game.lastCaptured.length > 0 &&
                  previousTableRef.current.length > 0 &&
                  !tableDealOrder.size &&
                  animation.phase === 'play'
                const tableCards = shouldKeepPreviousTable ? previousTableRef.current : game.table

                return tableCards.map((card) => {
                  const cardId = getCardId(card)
                  const isCaptured = includes(card, game.lastCaptured)
                  const isAnimating = animatingCardIds.has(cardId)
                  const order = tableDealOrder.get(cardId)
                  const motion = getTableCardMotion({ isAnimating, order })

                  return (
                    <TableCardLabel
                      key={`table-${cardId}`}
                      htmlFor={`table-${cardId}`}
                      layout={!isAnimating}
                      onLayoutAnimationComplete={() =>
                        animatePlayTo(cardRefs.current.get(getCardId(animation.playCard)))
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
                        checked={includes(card, capture)}
                        onChange={() => toggleCapture(card)}
                        id={`table-${cardId}`}
                      />
                      <TableCard card={card} />
                    </TableCardLabel>
                  )
                })
              })()}
            </AnimatePresence>
          </Table>
          {alert && <Alert role="alert">{alert}</Alert>}
          <AnimatePresence mode="wait">
            {/* Play animation */}
            {animation.activePlayerId != null && animation.playCard && animation.playAnimate && (
              <AnimatedCard
                card={animation.playCard}
                initial={animation.playInitial ?? { x: 0, y: 0 }}
                animate={animation.playAnimate}
                faceDown={animation.playFaceDown}
                onComplete={() => {
                  if (animation.activePlayerId == null || !animation.playCard) {
                    setAnimation(IDLE_ANIMATION)
                    return
                  }

                  const pileRef = playerPileRefs.current.get(animation.activePlayerId)

                  if (!pileRef || !game.lastCaptured.length) {
                    setAnimation(IDLE_ANIMATION)
                    return
                  }

                  // Setup capture animations:
                  const lastPileCard = Array.from(pileRef.children).at(-1)
                  const topCardPosition = getPosition(lastPileCard)
                  let captureTarget = topCardPosition
                  if (!captureTarget) {
                    const pileRect = pileRef.getBoundingClientRect()
                    const pileCardWidth = Math.min(window.innerWidth * 0.08, (window.innerHeight * 0.2) / 1.66)
                    const pileCardHeight = pileCardWidth * 1.66
                    captureTarget = {
                      x: pileRect.left + (pileRect.width - pileCardWidth) / 2,
                      y: pileRect.top + (pileRect.height - pileCardHeight) / 2,
                    }
                  }

                  setAnimation({
                    phase: 'capture',
                    captures: [...game.lastCaptured, animation.playCard].map((card, index) => ({
                      card,
                      initial:
                        getPosition(tableRef.current?.querySelector(`label[for="table-${getCardId(card)}"]`)) ??
                        animation.playAnimate ??
                        animation.playInitial,
                      animate: captureTarget
                        ? {
                            x: captureTarget.x,
                            y: captureTarget.y - (index + 1) * 2,
                          }
                        : undefined,
                    })),
                  })
                }}
              />
            )}
            {/* Capture animations */}
            {animation.captures
              .filter((a): a is CaptureAnimationState & { readonly animate: Target } => a.animate != null)
              .map((a, index, filtered) => (
                <AnimatedCard
                  key={`captured-${getCardId(a.card)}-${index}`}
                  card={a.card}
                  initial={a.initial}
                  animate={a.animate}
                  faceDown={false}
                  flip
                  onComplete={() => {
                    if (index === filtered.length - 1) setAnimation(IDLE_ANIMATION)
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
                  ref={getCardRef(card)}
                  disabled={game.turn !== MAIN_PLAYER || animation.phase !== 'idle'}
                  onClick={() => play({ card, capture })}
                  style={{ opacity: isSame(animation.playCard, card) ? 0 : 1 }}
                >
                  <DisplayCard card={card} />
                </PlayerCard>
              )}
            />
          </Player>
        </Main>
      )}
    </Container>
  )
}

const HandCards = ({ hand, previousHand, keyPrefix = '', renderCard }: HandCardsProps) => {
  return (
    <>
      {hand.map((card) => {
        return (
          <DealtCard
            key={`${keyPrefix}${getCardId(card)}`}
            isNew={!includes(card, previousHand)}
            index={hand.filter((c) => !includes(c, previousHand)).findIndex((c) => isSame(c, card))}
          >
            {renderCard(card)}
          </DealtCard>
        )
      })}
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
