import styled from '@emotion/styled'
import { fold, type Result } from '@pacote/result'
import { AnimatePresence, type Target } from 'framer-motion'
import { includes, without } from 'ramda'
import React from 'react'
import { isSame, type Card } from '../engine/cards'
import type { Score } from '../engine/scores'
import type { Move, State } from '../engine/state'
import { Button } from './Button'
import { AnimatedCard, Card as DisplayCard, ScaleInCard } from './Card'
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

interface AnimationState {
  readonly card?: Card
  readonly isFaceDown?: boolean
  readonly initial?: Target
  readonly animate?: Target
}
export const Game = ({ onStart, onPlay, onOpponentTurn, onScore }: GameProps) => {
  const [loadingProgress, setLoadingProgress] = React.useState(0)
  const [alert, setAlert] = React.useState('')
  const [targets, setTargets] = React.useState<readonly Card[]>([])
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
  const playerPileRefs = React.useRef(new Map<number, HTMLElement>())
  const [activePlayerId, setActivePlayerId] = React.useState<number | null>(null)
  const [playAnimation, setPlayAnimation] = React.useState<AnimationState | null>()
  const [captureAnimations, setCaptureAnimations] = React.useState<readonly AnimationState[]>([])
  const previousTableRef = React.useRef<readonly Card[]>([])
  const previousPlayersHandsRef = React.useRef<readonly (readonly Card[])[]>([])
  const [tableDealOrder, setTableDealOrder] = React.useState(new Map<string, number>())

  React.useEffect(() => {
    preloadCardAssets((progress) => setLoadingProgress(progress))
  }, [])

  const invalidMove = React.useCallback(async (error: Error) => setAlert(error.message), [])

  const getCardPosition = React.useCallback((card?: Card): { x: number; y: number } | null => {
    const r = cardRefs.current.get(getCardId(card))?.getBoundingClientRect()
    return r ? { x: r.left, y: r.top } : null
  }, [])

  const getTableCardPosition = React.useCallback((card?: Card): { x: number; y: number } | null => {
    const id = `table-${getCardId(card)}`
    const r = tableRef.current?.querySelector(`label[for="${id}"] img, label[for="${id}"] div`)?.getBoundingClientRect()
    return r ? { x: r.left, y: r.top } : null
  }, [])

  const start = React.useCallback(
    () =>
      fold(
        (nextState: State) => {
          setGame(nextState)
          setTargets([])
          setAlert('')
          setTableDealOrder(toOrder(nextState.table))
          setPlayAnimation(null)
          setCaptureAnimations([])
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
            setPlayAnimation({
              card: move.card,
              initial: getCardPosition(move.card) ?? { x: 0, y: 0 },
              isFaceDown: game.turn !== MAIN_PLAYER,
            })
            setActivePlayerId(game.turn)
          }

          previousTableRef.current = game.table
          previousPlayersHandsRef.current = game.players.map((p) => p.hand)
          setGame(nextState)
          setTargets([])
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
      if (placeholder == null || playAnimation?.card == null || playAnimation?.animate) return
      const animateRect = placeholder.getBoundingClientRect()
      setPlayAnimation({
        ...playAnimation,
        initial: getCardPosition(playAnimation.card) ?? playAnimation.initial,
        animate: { x: animateRect.left, y: animateRect.top },
      })
    },
    [playAnimation, getCardPosition],
  )

  React.useLayoutEffect(() => {
    if (playAnimation?.card && playAnimation?.animate == null && tableRef.current) {
      const tableCardId = `table-${getCardId(game.lastCaptured?.[0] ?? playAnimation.card)}`
      animatePlayTo(tableRef.current.querySelector(`label[for="${tableCardId}"] img, label[for="${tableCardId}"] div`))
    }
  }, [playAnimation, animatePlayTo, game.lastCaptured])

  React.useEffect(() => {
    if (game.state !== 'play') return

    const isScopa = previousTableRef.current.length > 0 && previousTableRef.current.length === game.lastCaptured.length
    const captureAnimationsDelay = isScopa ? 800 : 0
    const cardsToDeal = isScopa ? game.table.filter((c) => !includes(c, previousTableRef.current ?? [])) : []
    const cardDealingAnimationsDelay = 0.25 * cardsToDeal.length

    // Wait for capture animations to complete
    const captureTimeoutId = setTimeout(() => {
      if (cardsToDeal.length) {
        setTableDealOrder(toOrder(cardsToDeal))
      }
    }, captureAnimationsDelay)

    // Wait for card dealing animations to complete
    const dealTimeoutId = setTimeout(
      () => {
        previousTableRef.current = game.table
        previousPlayersHandsRef.current = game.players.map((p) => p.hand)
        setTableDealOrder(new Map())
      },
      cardDealingAnimationsDelay + captureAnimationsDelay + 600,
    )

    return () => {
      clearTimeout(captureTimeoutId)
      clearTimeout(dealTimeoutId)
    }
  }, [game.lastCaptured, game.players, game.state, game.table])

  React.useEffect(() => {
    if (game.state === 'play' && game.turn !== MAIN_PLAYER && !tableDealOrder.size) {
      const animationDelay = tableDealOrder.size * 0.25 + 600 + 200
      const timeoutId = setTimeout(() => onOpponentTurn(game).then(play).catch(invalidMove), animationDelay)
      return () => clearTimeout(timeoutId)
    }
  }, [game, invalidMove, onOpponentTurn, play, tableDealOrder])

  const toggleTarget = React.useCallback(
    (card: Card) => setTargets(includes(card, targets) ? without([card], targets) : [...targets, card]),
    [targets],
  )

  const humanPlayer = game.players[MAIN_PLAYER] ?? { id: MAIN_PLAYER, hand: [], pile: [], scope: 0 }

  const getFilteredPile = React.useCallback(
    (playerId: number) =>
      game.players[playerId]?.pile.filter(
        (card) =>
          !includes(card, game.lastCaptured) &&
          !includes(
            card,
            captureAnimations.map((a) => a.card),
          ) &&
          !isSame(card, playAnimation?.card),
      ) ?? [],
    [game.players, game.lastCaptured, playAnimation, captureAnimations],
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
                  ref={(el) => {
                    if (el) {
                      playerPileRefs.current.set(player.id, el)
                    } else {
                      playerPileRefs.current.delete(player.id)
                    }
                  }}
                  index={player.id}
                  pile={getFilteredPile(player.id)}
                >
                  {player.hand.map((card) => {
                    const previousHand = previousPlayersHandsRef.current[player.id] ?? []
                    const isNewCard = !includes(card, previousHand)
                    const newCards = player.hand.filter((c) => !includes(c, previousHand))
                    const newCardIndex = isNewCard ? newCards.findIndex((c) => isSame(c, card)) : -1
                    return (
                      <ScaleInCard key={`${player.id}-${getCardId(card)}`} isNew={isNewCard} index={newCardIndex}>
                        <OpponentCard
                          ref={(el) => {
                            if (el) {
                              cardRefs.current.set(getCardId(card), el)
                            } else {
                              cardRefs.current.delete(getCardId(card))
                            }
                          }}
                          card={card}
                          faceDown
                          opacity={isSame(playAnimation?.card, card) ? 0 : 1}
                        />
                      </ScaleInCard>
                    )
                  })}
                </Opponent>
              ),
          )}
          <Table layout ref={tableRef}>
            <AnimatePresence mode="popLayout">
              {/* Table cards */}
              {(() => {
                const tableCards =
                  game.lastCaptured.length && previousTableRef.current.length && !tableDealOrder.size
                    ? previousTableRef.current
                    : game.table

                return tableCards.map((card) => {
                  const cardId = getCardId(card)
                  const isAnimating = isSame(card, playAnimation?.card)
                  const isCaptured = includes(card, game.lastCaptured)
                  const isInCaptureAnimation = captureAnimations.some((a) => isSame(a.card, card))
                  const isCapturingCard = isSame(playAnimation?.card, card) && captureAnimations.length > 0
                  const hide = isAnimating || isInCaptureAnimation || isCapturingCard
                  const order = tableDealOrder.get(cardId)

                  return (
                    <TableCardLabel
                      key={`table-${cardId}`}
                      htmlFor={`table-${cardId}`}
                      layout={order == null}
                      onLayoutAnimationComplete={() => {
                        if (isAnimating && !playAnimation?.animate) {
                          animatePlayTo(cardRefs.current.get(getCardId(playAnimation?.card)))
                        }
                      }}
                      initial={hide ? false : order != null ? { opacity: 0, scale: 0.5 } : { opacity: 0, scale: 0.8 }}
                      animate={
                        hide
                          ? { opacity: 0, scale: 1 }
                          : order != null
                            ? { opacity: 1, scale: [0.5, 1.2, 1] }
                            : { opacity: 1, scale: 1 }
                      }
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={
                        hide
                          ? {
                              opacity: { duration: 0 },
                              scale: { duration: 0 },
                              y: { duration: 0 },
                              x: { duration: 0 },
                            }
                          : order != null
                            ? {
                                delay: order * 0.25,
                                opacity: { duration: 0.3, delay: order * 0.25, ease: 'easeOut' },
                                scale: {
                                  duration: 0.5,
                                  times: [0, 0.6, 1],
                                  delay: order * 0.25,
                                  ease: [0.34, 1.56, 0.64, 1],
                                },
                              }
                            : {
                                type: 'spring',
                                stiffness: 200,
                                damping: 25,
                                opacity: { duration: 0 },
                              }
                      }
                      style={
                        hide
                          ? { visibility: 'hidden', pointerEvents: 'none' }
                          : isCaptured
                            ? { pointerEvents: 'none' }
                            : undefined
                      }
                    >
                      <TableCardSelector
                        disabled={game.turn !== MAIN_PLAYER || isCaptured || hide}
                        type="checkbox"
                        checked={includes(card, targets)}
                        onChange={() => toggleTarget(card)}
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
            {activePlayerId != null && playAnimation?.card && playAnimation?.animate && (
              <AnimatedCard
                card={playAnimation.card}
                initial={playAnimation.initial ?? { x: 0, y: 0 }}
                animate={playAnimation.animate}
                faceDown={playAnimation.isFaceDown}
                onComplete={() => {
                  setPlayAnimation(null)

                  const pileRef = playerPileRefs.current.get(activePlayerId)

                  if (!pileRef || !game.lastCaptured.length) return

                  // Setup capture animations:

                  const capturedCards = [...game.lastCaptured, playAnimation.card]
                  const pilePosition = pileRef.getBoundingClientRect()
                  const topCardPosition = Array.from(pileRef.querySelectorAll('img, div'))
                    .at(-1)
                    ?.getBoundingClientRect()
                  const tableCardId = `table-${getCardId(capturedCards[0])}`
                  const referenceCard =
                    tableRef.current
                      ?.querySelector(`label[for="${tableCardId}"] img, label[for="${tableCardId}"] div`)
                      ?.getBoundingClientRect() ?? pilePosition

                  const offsetX = -10 // FIXME
                  const offsetY = 4 // FIXME

                  setCaptureAnimations(
                    capturedCards.map((card, index) => ({
                      card,
                      initial: getTableCardPosition(card) ??
                        playAnimation.animate ??
                        playAnimation.initial ?? { x: 0, y: 0 },
                      animate: topCardPosition
                        ? {
                            x: topCardPosition.left + offsetX,
                            y: topCardPosition.top - (index + 1) * 2,
                          }
                        : {
                            x: pilePosition.left + pilePosition.width / 2 - referenceCard.width / 2 + offsetX,
                            y:
                              pilePosition.top +
                              pilePosition.height / 2 -
                              referenceCard.height / 2 -
                              (index + 1) * 2 +
                              offsetY,
                          },
                    })),
                  )
                }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {/* Capture animations */}
            {captureAnimations
              .filter((a): a is Required<AnimationState> => a.card != null && a.animate != null)
              .map((a, index, filtered) => (
                <AnimatedCard
                  key={`captured-${getCardId(a.card)}-${index}`}
                  card={a.card}
                  initial={a.initial}
                  animate={a.animate}
                  faceDown={false}
                  flip
                  onComplete={() => {
                    if (index === filtered.length - 1) setCaptureAnimations([])
                  }}
                />
              ))}
          </AnimatePresence>
          <Player
            ref={(el) => {
              if (el) {
                playerPileRefs.current.set(MAIN_PLAYER, el)
              } else {
                playerPileRefs.current.delete(MAIN_PLAYER)
              }
            }}
            index={MAIN_PLAYER}
            pile={getFilteredPile(MAIN_PLAYER)}
          >
            {humanPlayer.hand.map((card) => {
              const previousHand = previousPlayersHandsRef.current[MAIN_PLAYER] ?? []
              const isNewCard = !includes(card, previousHand)
              const newCards = humanPlayer.hand.filter((c) => !includes(c, previousHand))
              const newCardIndex = isNewCard ? newCards.findIndex((c) => isSame(c, card)) : -1
              return (
                <ScaleInCard key={getCardId(card)} isNew={isNewCard} index={newCardIndex}>
                  <PlayerCard
                    ref={(el) => {
                      if (el) {
                        cardRefs.current.set(getCardId(card), el)
                      } else {
                        cardRefs.current.delete(getCardId(card))
                      }
                    }}
                    disabled={game.turn !== MAIN_PLAYER || playAnimation?.card != null}
                    onClick={() => play({ card, capture: targets })}
                    style={{ opacity: isSame(playAnimation?.card, card) ? 0 : 1 }}
                  >
                    <DisplayCard card={card} />
                  </PlayerCard>
                </ScaleInCard>
              )
            })}
          </Player>
        </Main>
      )}
    </Container>
  )
}

const getCardId = (card?: Card | null) => card?.join('-') ?? ''

const toOrder = (pile: readonly Card[]) => new Map(pile.map((card, index) => [getCardId(card), index]))
