import styled from '@emotion/styled'
import { fold, type Result } from '@pacote/result'
import { AnimatePresence, type Target } from 'framer-motion'
import React from 'react'
import { type Card, hasCard, isSame } from '../engine/cards'
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

function useRefMap<K>() {
  const refs = React.useRef(new Map<K, HTMLElement>())
  const callbacks = React.useRef(new Map<K, (el?: HTMLElement | null) => void>())
  const getRef = React.useCallback((key: K) => {
    const existing = callbacks.current.get(key)
    if (existing) return existing
    const callback = (el?: HTMLElement | null) => {
      if (el) refs.current.set(key, el)
      else refs.current.delete(key)
    }
    callbacks.current.set(key, callback)
    return callback
  }, [])
  return [refs, getRef] as const
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
  const [cardRefs, getCardRef] = useRefMap<string>()
  const [playerPileRefs, getPlayerPileRef] = useRefMap<number>()
  const [animation, setAnimation] = React.useState<AnimationController>({ phase: 'idle' })
  const previousTableRef = React.useRef<readonly Card[]>([])
  const previousPlayersHandsRef = React.useRef<readonly (readonly Card[])[]>([])
  const [tableDealOrder, setTableDealOrder] = React.useState(new Map<string, number>())

  React.useEffect(() => {
    preloadCardAssets((progress) => setLoadingProgress(progress))
  }, [])

  const invalidMove = React.useCallback((error: Error) => setAlert(error.message), [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: cardRefs is stable, empty deps are correct
  const getCardPosition = React.useCallback((card?: Card) => getPosition(cardRefs.current.get(getCardId(card))), [])

  const start = React.useCallback(
    () =>
      fold(
        (nextState: State) => {
          setGame(nextState)
          setCapture([])
          setAlert('')
          setTableDealOrder(toOrder(nextState.table))
          setAnimation({ phase: 'idle' })
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
          setAnimation({
            phase: 'play',
            activePlayerId: game.turn,
            playCard: move.card,
            playInitial: getCardPosition(move.card) ?? { x: 0, y: 0 },
            playFaceDown: game.turn !== MAIN_PLAYER,
          })

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
      if (placeholder == null) return
      const animateRect = placeholder.getBoundingClientRect()
      setAnimation((prev) =>
        prev.phase !== 'play' || prev.playAnimate
          ? prev
          : {
              ...prev,
              playInitial: getCardPosition(prev.playCard) ?? prev.playInitial,
              playAnimate: { x: animateRect.left, y: animateRect.top },
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
      {game.state === 'initial' && <TitleScreen loadingProgress={loadingProgress} onStart={start} />}
      {game.state === 'stop' && <GameOver scores={onScore(game.players)} onStart={start} />}
      {game.state === 'play' && (
        <Main>
          <Header>
            <Button onClick={start}>New Game</Button>
            <Turn>Player {game.turn + 1}</Turn>
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
          <Table layout ref={tableRef}>
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
          <AnimatePresence mode="wait">
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
                    captures: [...game.lastCaptured, playedCard].map((card, index) => ({
                      card,
                      initial:
                        getPosition(tableRef.current?.querySelector(`label[for="table-${getCardId(card)}"]`)) ??
                        playAnimate ??
                        playInitial,
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
            {animation.phase === 'capture' &&
              animation.captures
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
                  onClick={() => play({ card, capture })}
                  style={{ opacity: animation.phase === 'play' && isSame(animation.playCard, card) ? 0 : 1 }}
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
