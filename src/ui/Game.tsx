import styled from '@emotion/styled'
import { fold, type Result } from '@pacote/result'
import { AnimatePresence, type Target } from 'framer-motion'
import { includes, without } from 'ramda'
import React from 'react'
import type { Card } from '../engine/cards'
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

const HUMAN_PLAYER = 0

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
  readonly card?: Card | null
  readonly isFaceDown?: boolean
  readonly initial: Target
  readonly animate?: Target | null
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
  const [animationState, setAnimationState] = React.useState<AnimationState>({
    card: null,
    isFaceDown: false,
    initial: { x: 0, y: 0 },
    animate: null,
  })
  const previousTableRef = React.useRef<readonly Card[]>([])
  const previousPlayersHandsRef = React.useRef<readonly (readonly Card[])[]>([])
  const [cardsToDealToTheTable, setCardsToDealToTheTable] = React.useState<readonly Card[]>([])

  React.useEffect(() => {
    preloadCardAssets((progress) => setLoadingProgress(progress))
  }, [])

  const invalidMove = React.useCallback(async (error: Error) => setAlert(error.message), [])

  const getCardRef = React.useCallback(
    (card?: Card | null): HTMLElement | undefined => cardRefs.current.get(getCardId(card)),
    [],
  )

  const start = React.useCallback(
    () =>
      fold(
        (nextState: State) => {
          setGame(nextState)
          setTargets([])
          setAlert('')
          setAnimationState({ initial: { x: 0, y: 0 } })
          previousTableRef.current = []
          previousPlayersHandsRef.current = []
          setCardsToDealToTheTable(nextState.table)
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
          const startPositionRect = getCardRef(move.card)?.getBoundingClientRect()

          if (startPositionRect) {
            setAnimationState({
              card: move.card,
              initial: {
                x: startPositionRect.left,
                y: startPositionRect.top,
              },
              isFaceDown: game.turn !== HUMAN_PLAYER,
            })
          }

          previousTableRef.current = game.table
          previousPlayersHandsRef.current = game.players.map((p) => p.hand)
          setGame(nextState)
          setTargets([])

          const message = nextState.lastCaptured.length === game.table.length ? 'Scopa!' : ''
          setAlert(message)
        },
        invalidMove,
        onPlay(move, game),
      )
    },
    [onPlay, game, invalidMove, getCardRef],
  )

  const animateCardTo = React.useCallback(
    (placeholder?: Element | null) => {
      if (placeholder == null || animationState.card == null || animationState.animate != null) return
      const initialRect = getCardRef(animationState.card)?.getBoundingClientRect()
      const animateRect = placeholder.getBoundingClientRect()

      setAnimationState({
        ...animationState,
        initial: initialRect ? { x: initialRect.left, y: initialRect.top } : animationState.initial,
        animate: {
          x: animateRect.left,
          y: animateRect.top + (window.innerHeight <= 600 ? -40 : -55),
        },
      })
    },
    [animationState, getCardRef],
  )

  React.useLayoutEffect(() => {
    if (animationState.card && animationState.animate == null && tableRef.current) {
      const cardId = `card-${getCardId(game.lastCaptured?.[0] ?? animationState.card)}`
      animateCardTo(tableRef.current.querySelector(`label[for="${cardId}"] img, label[for="${cardId}"] div`))
    }
  }, [animationState, animateCardTo, game.lastCaptured])

  React.useEffect(() => {
    if (game.state === 'play') {
      const isScopa =
        previousTableRef.current.length > 0 && previousTableRef.current.length === game.lastCaptured.length

      const captureAnimationsDelay = isScopa ? 800 : 0

      const cardsToDeal = isScopa ? game.table.filter((c) => !includes(c, previousTableRef.current ?? [])) : []

      const cardDealingAnimationsDelay = 0.25 * cardsToDeal.length

      // Wait for capture animations to complete
      const captureTimeoutId = setTimeout(() => {
        if (cardsToDeal.length) {
          setCardsToDealToTheTable(cardsToDeal)
        }
      }, captureAnimationsDelay)

      // Wait for card dealing animations to complete
      const dealTimeoutId = setTimeout(
        () => {
          previousTableRef.current = game.table
          previousPlayersHandsRef.current = game.players.map((p) => p.hand)
          setCardsToDealToTheTable([])
        },
        cardDealingAnimationsDelay + captureAnimationsDelay + 600,
      )

      return () => {
        clearTimeout(captureTimeoutId)
        clearTimeout(dealTimeoutId)
      }
    }
  }, [game])

  React.useEffect(() => {
    if (game.state === 'play' && game.turn !== HUMAN_PLAYER && cardsToDealToTheTable.length === 0) {
      const animationDelay = cardsToDealToTheTable.length * 0.25 + 600 + 200
      const timeoutId = setTimeout(() => onOpponentTurn(game).then(play).catch(invalidMove), animationDelay)
      return () => clearTimeout(timeoutId)
    }
  }, [game, invalidMove, onOpponentTurn, play, cardsToDealToTheTable])

  const toggleTarget = React.useCallback(
    (card: Card) => setTargets(includes(card, targets) ? without([card], targets) : [...targets, card]),
    [targets],
  )

  const humanPlayer = game.players[HUMAN_PLAYER]

  return (
    <Container>
      {game.state === 'initial' && <TitleScreen loadingProgress={loadingProgress} onStart={start} />}
      {game.state === 'stop' && <GameOver scores={onScore(game.players)} onStart={start} />}
      {game.state === 'play' && (
        <>
          <Header>
            <Button onClick={start}>New Game</Button>
            {<Turn>Player {game.turn + 1}</Turn>}
          </Header>
          <Main>
            {game.players.map(
              (player) =>
                player.id !== HUMAN_PLAYER && (
                  <Opponent key={`opponent-${player.id}`} index={player.id} pile={player.pile}>
                    {player.hand.map((card) => {
                      const previousHand = previousPlayersHandsRef.current[player.id] ?? []
                      const isNewCard = !includes(card, previousHand)
                      const newCards = player.hand.filter((c) => !includes(c, previousHand))
                      const newCardIndex = isNewCard ? newCards.findIndex((c) => getCardId(c) === getCardId(card)) : -1
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
                            opacity={getCardId(animationState.card) === getCardId(card) ? 0 : 1}
                          />
                        </ScaleInCard>
                      )
                    })}
                  </Opponent>
                ),
            )}
            <Table layout ref={tableRef}>
              <AnimatePresence mode="popLayout">
                {(() => {
                  const cardsToDeal = game.table.filter((c) => !includes(c, previousTableRef.current ?? []))

                  const tableCards =
                    game.lastCaptured.length && previousTableRef.current.length
                      ? cardsToDealToTheTable.length
                        ? cardsToDeal
                        : previousTableRef.current
                      : game.table

                  const dealtCardIndices = new Map(cardsToDealToTheTable.map((card, index) => [getCardId(card), index]))

                  return tableCards.map((card) => {
                    const cardId = `card-${getCardId(card)}`
                    const isAnimating = getCardId(card) === getCardId(animationState.card)
                    const isCaptured = includes(card, game.lastCaptured)
                    const isDealt = dealtCardIndices.has(getCardId(card))
                    const dealtCardIndex = dealtCardIndices.get(getCardId(card)) ?? 0
                    return (
                      <TableCardLabel
                        key={cardId}
                        htmlFor={cardId}
                        layout={!isDealt}
                        onLayoutAnimationComplete={() => {
                          if (isAnimating && animationState.animate == null) {
                            animateCardTo(getCardRef(animationState.card))
                          }
                        }}
                        initial={
                          isAnimating ? false : isDealt ? { opacity: 0, scale: 0.5 } : { opacity: 0, scale: 0.8 }
                        }
                        animate={
                          isAnimating
                            ? { opacity: 0, scale: 1 }
                            : isDealt
                              ? {
                                  opacity: 1,
                                  scale: [0.5, 1.2, 1],
                                }
                              : { opacity: 1, scale: 1 }
                        }
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={
                          isAnimating
                            ? {
                                opacity: { duration: 0 },
                                scale: { duration: 0 },
                                y: { duration: 0 },
                                x: { duration: 0 },
                              }
                            : isCaptured
                              ? {
                                  opacity: { duration: 0.6, ease: 'easeOut' },
                                  scale: { duration: 0.6, ease: 'easeOut' },
                                }
                              : isDealt
                                ? {
                                    delay: dealtCardIndex * 0.25,
                                    opacity: {
                                      duration: 0.3,
                                      delay: dealtCardIndex * 0.25,
                                      ease: 'easeOut',
                                    },
                                    scale: {
                                      duration: 0.5,
                                      times: [0, 0.6, 1],
                                      delay: dealtCardIndex * 0.25,
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
                          isAnimating
                            ? { visibility: 'hidden', pointerEvents: 'none' }
                            : isCaptured
                              ? { pointerEvents: 'none' }
                              : undefined
                        }
                      >
                        <TableCardSelector
                          disabled={game.turn !== HUMAN_PLAYER || isCaptured}
                          type="checkbox"
                          checked={includes(card, targets)}
                          onChange={() => toggleTarget(card)}
                          id={cardId}
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
              {animationState.animate && animationState.card && (
                <AnimatedCard
                  key={getCardId(animationState.card)}
                  card={animationState.card}
                  initial={animationState.initial}
                  animate={animationState.animate}
                  faceDown={animationState.isFaceDown}
                  onComplete={() => {
                    setTargets([])
                    setAlert('')
                    setAnimationState({
                      initial: { x: 0, y: 0 },
                    })
                  }}
                />
              )}
            </AnimatePresence>
            <Player index={HUMAN_PLAYER} pile={humanPlayer.pile}>
              {humanPlayer.hand.map((card) => {
                const previousHand = previousPlayersHandsRef.current[HUMAN_PLAYER] ?? []
                const isNewCard = !includes(card, previousHand)
                const newCards = humanPlayer.hand.filter((c) => !includes(c, previousHand))
                const newCardIndex = isNewCard ? newCards.findIndex((c) => getCardId(c) === getCardId(card)) : -1
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
                      disabled={game.turn !== HUMAN_PLAYER || animationState.card != null}
                      onClick={() => play({ card, capture: targets })}
                      style={{
                        opacity: getCardId(animationState.card) === getCardId(card) ? 0 : 1,
                      }}
                    >
                      <DisplayCard card={card} />
                    </PlayerCard>
                  </ScaleInCard>
                )
              })}
            </Player>
          </Main>
        </>
      )}
    </Container>
  )
}

const getCardId = (card?: Card | null) => card?.join('-') ?? ''
