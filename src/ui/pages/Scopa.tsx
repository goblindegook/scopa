import styled from '@emotion/styled'
import { fold, isErr, type Result } from '@pacote/result'
import { AnimatePresence, motion, type Target } from 'framer-motion'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { type Card, hasCard, isSame, type Pile } from '../../engine/cards'
import { findCardsToTake } from '../../engine/move'
import type { OpponentOptions } from '../../engine/opponent'
import { type Score, winner } from '../../engine/scores'
import { sideOf } from '../../engine/sides'
import type { Move, State } from '../../engine/state'
import { Alert } from '../atoms/Alert'
import { Button } from '../atoms/Button'
import { Card as DisplayCard, Duration } from '../atoms/Card'
import { Table } from '../atoms/Table'
import { AnimatedCard } from '../molecules/AnimatedCard'
import { DealtCard } from '../molecules/DealtCard'
import { TableCard } from '../molecules/TableCard'
import { FanCard, OPPONENT_SCALE, OpponentCard, OpponentSeats, PlayerCard, Seat } from '../organisms/Seat'
import { sideLabels } from '../sideLabels'
import { useAlerts } from '../useAlerts'
import { type DragState, useDragState } from '../useDragState'
import { useRefMap } from '../useRefMap'
import { GameOver } from './GameOver'

export interface PlayerProfile {
  avatar: string
  canCountCards?: boolean
  posture?: number
  worlds?: number
  away?: boolean
}

const Header = styled('header')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--overlay-black-60);
  padding: var(--space-4);
  font-size: 1rem;
  color: white;
  height: 3.5rem;
  flex-shrink: 0;

  @media (max-height: 600px) {
    padding: var(--space-2);
    font-size: 0.875rem;
    height: 2.5rem;
  }
`

const Turn = styled('span')`
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
`

const TurnScore = styled('span')<{ active: boolean }>`
  color: white;
  border-radius: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 2px solid
    ${({ active }) => (active ? 'var(--color-accent-translucent)' : 'var(--overlay-white-25)')};
  background-color: ${({ active }) => (active ? 'var(--overlay-white-25)' : 'var(--overlay-white-05)')};
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

const GameRows = styled('div')`
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  @media (orientation: portrait) {
    justify-content: flex-start;
    gap: var(--space-4);
    padding-top: var(--space-8);

    > section {
      flex: 1 1 auto;
    }
  }
`

interface Position {
  x: number
  y: number
}

interface ScopaProps {
  playerId: number
  initialState?: State
  state?: State
  onReset?: () => void
  onBack?: () => void
  onStart?: (score?: readonly number[], players?: 2 | 3, previousFirstPlayer?: number) => Result<State, Error>
  onPlay: (move: Move, game: State) => Result<State, Error>
  onOpponentTurn: (game: State, options: OpponentOptions) => Promise<Move>
  onCancelOpponentTurn?: () => void
  onScore: (game: State['players']) => readonly Score[]
  playerProfiles?: readonly PlayerProfile[]
  onNextRound?: () => void
  readonly waitingFor?: readonly string[]
}

interface TakingAnimationState {
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
  | { phase: 'taking'; takes: readonly TakingAnimationState[] }

const INVALID_MOVE_KEYS: Record<string, string> = {
  not_your_turn: 'invalidMove.notYourTurn',
  choose_cards: 'invalidMove.chooseCards',
  cannot_take: 'invalidMove.cannotTake',
}

const EMPTY_GAME: State = {
  state: 'play',
  turn: 0,
  firstPlayer: 0,
  players: [],
  pile: [],
  table: [],
  lastTaken: [],
  score: [0, 0],
}

export function Scopa({
  playerId,
  initialState,
  state,
  onReset = () => undefined,
  onBack = onReset,
  onStart,
  onPlay,
  onOpponentTurn,
  onCancelOpponentTurn,
  onScore,
  playerProfiles: providedPlayerProfiles,
  onNextRound,
  waitingFor,
}: ScopaProps) {
  const { t } = useTranslation()
  const [alert, showAlert] = useAlerts(3000)
  const playerProfiles = providedPlayerProfiles ?? [{ avatar: '🐵' }, { avatar: '🤖' }, { avatar: '👾' }]
  const [take, setTake] = React.useState<readonly Card[]>([])
  const [aimed, setAimed] = React.useState<Card | null>(null)
  const [game, setGame] = React.useState<State>(() => initialState ?? state ?? EMPTY_GAME)

  const validCombos = React.useMemo(() => (aimed ? findCardsToTake(aimed[0], game.table) : []), [aimed, game.table])

  const capturableSet = React.useMemo(
    () => (aimed && validCombos.length > 1 ? capturableCards(validCombos, take) : []),
    [aimed, validCombos, take],
  )

  const tableRef = React.useRef<HTMLElement | null>(null)
  const roundScoresRef = React.useRef<readonly Score[]>(game.state === 'stop' ? onScore(game.players) : [])
  const [cardRefs, getCardRef] = useRefMap<string>()
  const [playerPileRefs, getPlayerPileRef] = useRefMap<number>()
  const [animation, setAnimation] = React.useState<AnimationController>({ phase: 'idle' })
  const previousTableRef = React.useRef<readonly Card[]>(state?.table ?? [])
  const previousPlayersHandsRef = React.useRef<readonly (readonly Card[])[]>(
    state?.players.map((player) => player.hand) ?? [],
  )
  const [tableDealOrder, setTableDealOrder] = React.useState(new Map<string, number>())
  const playCardFromRef = React.useRef<{ card: Card; position: Position } | null>(null)
  const previousStateRef = React.useRef<State | undefined>(state)

  React.useEffect(() => {
    if (state && state !== previousStateRef.current) {
      previousStateRef.current = state
      previousTableRef.current = state.table
      previousPlayersHandsRef.current = state.players.map((player) => player.hand)
      setGame(state)
      setTake([])
      setAimed(null)
      setAnimation({ phase: 'idle' })
      setTableDealOrder(new Map())
      if (state.state === 'stop') roundScoresRef.current = onScore(state.players)
    }
  }, [state, onScore])

  const invalidMove = React.useCallback(
    (error: Error) => {
      const key = INVALID_MOVE_KEYS[error.message]
      showAlert(key ? t(key) : error.message)
    },
    [showAlert, t],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: cardRefs is stable, empty deps are correct
  const getCardPosition = React.useCallback((card?: Card) => getPosition(cardRefs.current.get(getCardId(card))), [])

  const start = React.useCallback(
    (resetScore = false, count = playerProfiles.length) => {
      if (!onStart) return
      const runningScore = resetScore ? Array<number>(count).fill(0) : game.score
      const previousFirstPlayer = resetScore ? undefined : game.firstPlayer
      let hasRedealt = false
      let startResult = onStart(runningScore, count as 2 | 3, previousFirstPlayer)

      while (isErr(startResult)) {
        hasRedealt = true
        startResult = onStart(runningScore, count as 2 | 3, previousFirstPlayer)
      }

      return fold(
        (nextState: State) => {
          setGame(nextState)
          setTake([])
          setAimed(null)

          if (hasRedealt) showAlert(t('redeal'))

          if (nextState.state === 'stop') roundScoresRef.current = onScore(nextState.players)
          setTableDealOrder(toOrder(nextState.table))
          setAnimation({ phase: 'idle' })
          previousTableRef.current = []
          previousPlayersHandsRef.current = []
        },
        invalidMove,
        startResult,
      )
    },
    [invalidMove, onScore, onStart, showAlert, game.score, game.firstPlayer, playerProfiles, t],
  )

  const play = React.useCallback(
    (move: Move) => {
      fold(
        (nextState: State) => {
          const playCardFrom = playCardFromRef.current
          playCardFromRef.current = null

          const isOpponentTurn = game.turn !== playerId
          const baseInitial =
            getCardId(playCardFrom?.card) === getCardId(move.card)
              ? { ...playCardFrom?.position }
              : (getCardPosition(move.card) ?? { x: 0, y: 0 })
          const hand = game.players[game.turn]?.hand ?? []
          const cardIndex = hand.findIndex((c) => isSame(c, move.card))
          setAnimation({
            phase: 'play',
            activePlayerId: game.turn,
            playCard: move.card,
            playInitial: {
              ...baseInitial,
              rotate: (cardIndex - (hand.length - 1) / 2) * 10,
              ...(isOpponentTurn && { scale: OPPONENT_SCALE }),
            },
            playFaceDown: isOpponentTurn,
          })

          previousTableRef.current = game.table
          previousPlayersHandsRef.current = game.players.map((p) => p.hand)
          setGame(nextState)
          setTake([])
          setAimed(null)

          if (game.table.length > 0 && nextState.lastTaken.length === game.table.length) showAlert(t('scopa'))

          if (nextState.state === 'stop') roundScoresRef.current = onScore(nextState.players)
        },
        invalidMove,
        onPlay(move, game),
      )
    },
    [onPlay, game, invalidMove, getCardPosition, onScore, showAlert, t, playerId],
  )

  const { dragState, isClickSuppressed, startDragging, clearDragging } = useDragState(
    game.turn === playerId && animation.phase === 'idle',
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
          const combos = findCardsToTake(card[0], game.table)
          if (
            combos.length > 1 &&
            !combos.some((combo) => combo.length === take.length && combo.every((c) => hasCard(take, c)))
          ) {
            setAimed(card)
            setTake([])
            return false
          }
          playCardFromRef.current = { card, position }
          play({ card, take })
        } else {
          setAimed(null)
          setTake([])
        }
        return isOnTable
      },
      [take, play, game.table],
    ),
  )

  const dragAimedCard = dragState?.type === 'pointer' && dragState.active ? dragState.card : null
  const dragValidCombos = React.useMemo(
    () => (dragAimedCard ? findCardsToTake(dragAimedCard[0], game.table) : []),
    [dragAimedCard, game.table],
  )
  const dragCapturableSet = React.useMemo(
    () => (dragAimedCard && dragValidCombos.length > 1 ? capturableCards(dragValidCombos, take) : []),
    [dragAimedCard, dragValidCombos, take],
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
              playAnimate: { x: animateRect.left, y: animateRect.top, scale: 1, rotate: 0 },
            },
      )
    },
    [getCardPosition],
  )

  React.useLayoutEffect(() => {
    if (animation.phase === 'play' && !animation.playAnimate) {
      animatePlayTo(
        tableRef.current?.querySelector(`label[for="table-${getCardId(game.lastTaken?.[0] ?? animation.playCard)}"]`),
      )
    }
  }, [animation, animatePlayTo, game.lastTaken])

  React.useEffect(() => {
    if (game.state !== 'play') return

    const isScopa = previousTableRef.current.length > 0 && previousTableRef.current.length === game.lastTaken.length
    const takingAnimationsDelay = game.lastTaken.length ? Duration.TAKING : 0
    const cardsToDeal = isScopa ? game.table.filter((c) => !hasCard(previousTableRef.current, c)) : []
    const cardDealingAnimationsDelay = takingAnimationsDelay + Duration.DEAL * cardsToDeal.length + Duration.TAKING

    const takingTimeoutId = setTimeout(() => {
      if (cardsToDeal.length) {
        setTableDealOrder(toOrder(cardsToDeal))
      }
    }, 1000 * takingAnimationsDelay)

    const dealTimeoutId = setTimeout(() => {
      previousTableRef.current = game.table
      previousPlayersHandsRef.current = game.players.map((p) => p.hand)
      setTableDealOrder(new Map())
    }, 1000 * cardDealingAnimationsDelay)

    return () => {
      clearTimeout(takingTimeoutId)
      clearTimeout(dealTimeoutId)
    }
  }, [game.lastTaken, game.players, game.state, game.table])

  React.useEffect(() => {
    if (game.state === 'play' && game.turn !== playerId && !tableDealOrder.size) {
      let cancelled = false
      const animationDelay = Duration.TURN + Duration.PLAY
      const timeoutId = setTimeout(() => {
        onOpponentTurn(game, playerProfiles[game.turn])
          .then((move) => {
            if (!cancelled) play(move)
          })
          .catch(invalidMove)
      }, 1000 * animationDelay)
      return () => {
        cancelled = true
        clearTimeout(timeoutId)
        onCancelOpponentTurn?.()
      }
    }
  }, [game, invalidMove, onOpponentTurn, onCancelOpponentTurn, play, playerProfiles, tableDealOrder, playerId])

  React.useEffect(() => {
    if (game.turn !== playerId || game.state !== 'play') {
      setAimed(null)
      setTake([])
    }
  }, [game.turn, game.state, playerId])

  const toggleTakeTarget = React.useCallback((card: Card) => {
    setTake((current) => (hasCard(current, card) ? current.filter((c) => !isSame(c, card)) : [...current, card]))
  }, [])

  const animatingCardIds = React.useMemo<string[]>(() => {
    if (animation.phase === 'play') return [getCardId(animation.playCard)]
    if (animation.phase === 'taking') return animation.takes.map((a) => getCardId(a.card))
    return []
  }, [animation])

  const tableCards =
    animation.phase === 'play' && game.lastTaken.length && previousTableRef.current.length && !tableDealOrder.size
      ? previousTableRef.current
      : game.table

  return (
    <Container>
      {game.state === 'play' && (
        <Header>
          <Button onClick={onBack}>Scopa</Button>
          <Turn aria-label={t('gameScore')} role="list">
            {sideLabels(playerProfiles.slice(0, game.players.length).map(({ avatar }) => avatar)).map((label, side) => {
              const isActiveSide = sideOf(game.turn, game.players.length) === side
              const score = game.score[side] ?? 0
              return (
                <TurnScore
                  key={`side-score-${label}`}
                  role="listitem"
                  aria-label={t('sideScore', { avatar: label, score })}
                  active={isActiveSide}
                  data-active={isActiveSide}
                >
                  {label} {score}
                </TurnScore>
              )
            })}
          </Turn>
        </Header>
      )}
      <Main>
        <GameRows>
          <OpponentSeats>
            {[...game.players.slice(playerId + 1), ...game.players.slice(0, playerId)].map(({ id, hand }) => (
              <Seat
                key={`opponent-${id}`}
                ref={getPlayerPileRef(id)}
                avatar={playerProfiles[id].avatar}
                captured={game.players[id].pile.length}
                sweeps={game.players[id].scope}
                active={game.turn === id}
                away={playerProfiles[id].away}
              >
                <HandCards
                  hand={hand}
                  previousHand={previousPlayersHandsRef.current[id] ?? []}
                  keyPrefix={`${id}-`}
                  renderCard={(card) => (
                    <OpponentCard
                      ref={getCardRef(getCardId(card))}
                      card={card}
                      faceDown
                      opacity={animation.phase === 'play' && isSame(animation.playCard, card) ? 0 : 1}
                    />
                  )}
                />
              </Seat>
            ))}
          </OpponentSeats>
          <Table aria-label={t('table')} ref={tableRef}>
            <AnimatePresence mode="popLayout">
              {/* Table cards */}
              {tableCards.map((card) => {
                const cardId = getCardId(card)
                const isTaken = hasCard(game.lastTaken, card)
                const isAnimating = animatingCardIds.includes(cardId)
                const order = tableDealOrder.get(cardId)
                const motion = getTableCardMotion({ isAnimating, order })
                const activeAimed = aimed ?? (dragValidCombos.length > 1 ? dragAimedCard : null)
                const activeCapturable = aimed ? capturableSet : dragCapturableSet

                return (
                  <TableCard
                    key={`table-${cardId}`}
                    id={`table-${cardId}`}
                    card={card}
                    checked={hasCard(take, card)}
                    disabled={
                      game.turn !== playerId ||
                      isTaken ||
                      isAnimating ||
                      (activeAimed != null && !hasCard(activeCapturable, card) && !hasCard(take, card))
                    }
                    onChange={() => toggleTakeTarget(card)}
                    state={(() => {
                      if (!activeAimed) return undefined
                      if (hasCard(take, card)) return undefined
                      if (hasCard(activeCapturable, card)) return 'capturable'
                      return 'dimmed'
                    })()}
                    layout
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
                  />
                )
              })}
            </AnimatePresence>
          </Table>
        </GameRows>
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
                const pileRef = game.lastTaken.length ? playerPileRefs.current.get(activePlayerId) : undefined

                if (!pileRef) {
                  setAnimation({ phase: 'idle' })
                  return
                }

                const animatedW = cardSize('--card-width')
                const animatedH = cardSize('--card-height')

                const pileAreaRect = pileRef.getBoundingClientRect()
                const targetRect = Array.from(pileRef.children).at(-1)?.getBoundingClientRect() ?? pileAreaRect
                const baseScale = pileRef.offsetWidth > 0 ? pileAreaRect.width / pileRef.offsetWidth : 1
                const shrinkFactor = Math.min(1, targetRect.height / animatedH)

                setAnimation({
                  phase: 'taking',
                  takes: [...game.lastTaken, playedCard].map((card, index) => ({
                    card,
                    initial:
                      getPosition(tableRef.current?.querySelector(`label[for="table-${getCardId(card)}"]`)) ??
                      playAnimate ??
                      playInitial,
                    animate: {
                      x: targetRect.left + targetRect.width / 2 - animatedW / 2,
                      y: targetRect.top + targetRect.height / 2 - animatedH / 2 - (index + 1) * 2,
                      scale: baseScale * shrinkFactor,
                    },
                  })),
                })
              }}
            />
          )}
          {/* Taking animations */}
          {animation.phase === 'taking' &&
            animation.takes
              .filter((a): a is TakingAnimationState & { readonly animate: Target } => a.animate != null)
              .map((a, index, filtered) => (
                <AnimatedCard
                  key={`taken-${getCardId(a.card)}`}
                  card={a.card}
                  initial={a.initial}
                  animate={a.animate}
                  faceDown={false}
                  flip
                  scaleOnLand
                  onComplete={() => {
                    if (index === filtered.length - 1) setAnimation({ phase: 'idle' })
                  }}
                />
              ))}
        </AnimatePresence>
        <Seat
          own
          ref={getPlayerPileRef(playerId)}
          avatar={playerProfiles[playerId].avatar}
          captured={game.players[playerId].pile.length}
          sweeps={game.players[playerId].scope}
          active={game.turn === playerId}
          away={playerProfiles[playerId].away}
        >
          <HandCards
            hand={game.players[playerId].hand}
            previousHand={previousPlayersHandsRef.current[playerId] ?? []}
            renderCard={(card) => (
              <PlayerCard
                ref={getCardRef(getCardId(card))}
                disabled={game.turn !== playerId || animation.phase !== 'idle'}
                draggable={false}
                $aimed={aimed != null && isSame(aimed, card)}
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  startDragging(card, event.currentTarget, { x: event.clientX, y: event.clientY }, event.pointerId)
                }}
                onClick={() => {
                  if (isClickSuppressed()) return
                  const combos = findCardsToTake(card[0], game.table)
                  if (aimed != null && isSame(aimed, card)) {
                    if (take.length > 0) {
                      play({ card, take })
                    } else {
                      setAimed(null)
                      setTake([])
                    }
                  } else if (combos.length > 1) {
                    setAimed(card)
                    setTake([])
                  } else {
                    setAimed(null)
                    play({ card, take: combos.length === 1 ? combos[0] : [] })
                  }
                }}
                style={
                  isSame(dragState?.card, card) &&
                  (dragState?.type === 'returning' || (dragState?.type === 'pointer' && dragState.active))
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
        </Seat>
        <DragOverlay dragState={dragState} onSpringBackComplete={clearDragging} />
      </Main>
      {game.state === 'stop' && (
        <GameOver
          playerAvatars={playerProfiles.map((profile) => profile.avatar)}
          scores={roundScoresRef.current}
          runningScore={game.score}
          winner={winner(game.score)}
          waitingFor={waitingFor}
          onNextRound={onNextRound ?? (() => start())}
          onReset={onReset}
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
      {hand.map((card, i) => (
        <FanCard key={`${keyPrefix}${getCardId(card)}`} $fanIndex={i} $fanTotal={hand.length}>
          <DealtCard isNew={!hasCard(previousHand, card)} index={newCards.findIndex((c) => isSame(c, card))}>
            {renderCard(card)}
          </DealtCard>
        </FanCard>
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

const cardSize = (token: '--card-width' | '--card-height') =>
  Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) || 0

function capturableCards(validCombos: readonly Pile[], selected: readonly Card[]): readonly Card[] {
  const capturable: Card[] = []
  for (const combo of validCombos) {
    const compatible = selected.every((s) => combo.some((c) => isSame(c, s)))
    if (!compatible) continue
    for (const card of combo) {
      if (!selected.some((s) => isSame(s, card)) && !capturable.some((c) => isSame(c, card))) {
        capturable.push(card)
      }
    }
  }
  return capturable
}
