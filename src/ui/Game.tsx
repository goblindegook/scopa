import styled from '@emotion/styled'
import { fold, type Result } from '@pacote/result'
import { AnimatePresence, motion } from 'framer-motion'
import { includes, without } from 'ramda'
import React from 'react'
import type { Card } from '../engine/cards'
import { findCaptures } from '../engine/capture'
import type { Score } from '../engine/scores'
import type { Move, State } from '../engine/state'
import { Card as DisplayCard } from './Card'
import { Opponent, OpponentCard } from './Opponent'
import { Player, PlayerCard } from './Player'
import { ScoreBoard } from './ScoreBoard'
import { Table, TableCard, TableCardLabel, TableCardSelector } from './Table'

const HUMAN_PLAYER = 0

const Header = styled('header')`
  background-color: rgba(0, 0, 0, 0.5);
  padding: 1rem;
  font-size: 1rem;
  color: white;
  height: 4rem;
`

const Alert = styled('span')`
  color: red;
  padding: 0.25rem 1rem;
`

const Turn = styled('span')`
  color: white;
  background-color: rgba(255, 255, 255, 0.15);
  float: right;
  border-radius: 0.25rem;
  padding: 0.25rem 1rem;
`

const Button = styled('button')`
  border-radius: 0.25rem;
  padding: 0.25rem 1rem;
  color: black;
  font-size: 1rem;
`

const Container = styled('div')`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
`

const AnimatedCardOverlay = styled(motion.div)`
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  will-change: transform;
`

const GameOver = styled('main')`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  background-color: rgba(0, 0, 0, 0.25);
  flex: 1;
  overflow: hidden;
`

const Main = styled('main')`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`

interface GameProps {
  onStart: () => Result<State, Error>
  onPlay: (move: Move, game: State) => Result<State, Error>
  onOpponentTurn: (game: State) => Promise<Move>
  onScore: (game: State['players']) => readonly Score[]
}

interface AnimationState {
  readonly card: Card
  readonly initial: { readonly x: number; readonly y: number }
  readonly animate: { readonly x: number; readonly y: number } | null
  readonly capture: readonly Card[]
  readonly previousTable: readonly Card[]
}

export const Game = ({
  onStart,
  onPlay,
  onOpponentTurn,
  onScore,
}: GameProps) => {
  const [alert, setAlert] = React.useState('')
  const [targets, setTargets] = React.useState<readonly Card[]>([])
  const [game, setGame] = React.useState<State>({
    state: 'initial',
    turn: 0,
    table: [],
    pile: [],
    players: [],
  })
  const tableRef = React.useRef<HTMLElement | null>(null)
  const cardRefs = React.useRef(new Map<string, HTMLElement>())
  const [cardAnimation, setCardAnimation] =
    React.useState<AnimationState | null>(null)

  const invalidMove = React.useCallback(
    async (error: Error) => setAlert(error.message),
    [],
  )

  const start = React.useCallback(
    () =>
      fold(
        (nextGame: State) => {
          setGame(nextGame)
          setTargets([])
          setAlert('')
          setCardAnimation(null)
        },
        invalidMove,
        onStart(),
      ),
    [invalidMove, onStart],
  )

  const play = React.useCallback(
    (move: Move) => {
      fold(
        (nextGame: State) => {
          const startPositionRect = cardRefs.current
            .get(cardRef(move.card))
            ?.getBoundingClientRect()

          if (startPositionRect) {
            setCardAnimation({
              card: move.card,
              initial: {
                x: startPositionRect.left,
                y: startPositionRect.top,
              },
              animate: null,
              capture: move.capture.length
                ? move.capture
                : findCaptures(move.card[0], game.table)[0],
              previousTable: game.table,
            })
          }

          setGame(nextGame)
          setTargets([])
          setAlert('')
        },
        invalidMove,
        onPlay(move, game),
      )
    },
    [onPlay, game, invalidMove],
  )

  const animateCardTo = React.useCallback(
    (cardElement?: HTMLElement | null) => {
      if (
        cardElement == null ||
        cardAnimation == null ||
        cardAnimation.animate != null
      )
        return
      const cardKey = cardRef(cardAnimation.card)
      const initialRect = cardRefs.current.get(cardKey)?.getBoundingClientRect()
      const animateRect = cardElement.getBoundingClientRect()

      setCardAnimation({
        ...cardAnimation,
        initial: initialRect
          ? { x: initialRect.left, y: initialRect.top }
          : cardAnimation.initial,
        animate: {
          x: animateRect.left,
          y: animateRect.top - 64,
        },
      })
    },
    [cardAnimation],
  )

  React.useLayoutEffect(() => {
    if (cardAnimation?.animate == null && tableRef.current) {
      const cardId = `card-${cardRef(cardAnimation?.capture?.[0] ?? cardAnimation?.card)}`
      animateCardTo(
        tableRef.current.querySelector<HTMLElement>(
          `label[for="${cardId}"] img, label[for="${cardId}"] div`,
        ),
      )
    }
  }, [cardAnimation, animateCardTo])

  React.useEffect(() => {
    let isOpponentPlaying = true
    if (game.state === 'play' && game.turn !== HUMAN_PLAYER) {
      onOpponentTurn(game)
        .then((move) => (isOpponentPlaying ? play(move) : undefined))
        .catch(invalidMove)
    }
    return () => {
      isOpponentPlaying = false
    }
  }, [game, invalidMove, onOpponentTurn, play])

  const toggleTarget = React.useCallback(
    (card: Card) =>
      setTargets(
        includes(card, targets) ? without([card], targets) : [...targets, card],
      ),
    [targets],
  )

  const humanPlayer = game.players[HUMAN_PLAYER]

  return (
    <Container>
      <Header>
        <Button onClick={start}>Start new game</Button>
        <Alert>{alert}</Alert>
        {game.state === 'play' && <Turn>Player {game.turn + 1}</Turn>}
      </Header>
      {game.state === 'stop' && (
        <GameOver>
          <h2>Game Over</h2>
          <ScoreBoard scores={onScore(game.players)} />
        </GameOver>
      )}
      {game.state === 'play' && (
        <Main>
          {game.players.map(
            (player) =>
              player.id !== HUMAN_PLAYER && (
                <Opponent
                  key={`opponent-${player.id}`}
                  index={player.id}
                  pile={player.pile}
                >
                  {player.hand.map((card) => (
                    <OpponentCard
                      ref={(el) => {
                        if (el) {
                          cardRefs.current.set(cardRef(card), el)
                        } else {
                          cardRefs.current.delete(cardRef(card))
                        }
                      }}
                      key={`${player.id}-${cardRef(card)}`}
                      card={card}
                      faceDown
                      opacity={
                        cardRef(cardAnimation?.card) === cardRef(card) ? 0 : 1
                      }
                    />
                  ))}
                </Opponent>
              ),
          )}
          <Table layout ref={tableRef}>
            <AnimatePresence mode="popLayout">
              {(() => {
                const tableCards =
                  cardAnimation?.capture && cardAnimation.capture.length > 0
                    ? cardAnimation.previousTable
                    : game.table

                return tableCards.map((card) => {
                  const cardId = `card-${cardRef(card)}`
                  const isAnimating =
                    cardRef(card) === cardRef(cardAnimation?.card)
                  const isCaptured =
                    cardAnimation?.capture &&
                    includes(card, cardAnimation.capture)
                  return (
                    <TableCardLabel
                      key={cardId}
                      htmlFor={cardId}
                      layout
                      onLayoutAnimationComplete={() => {
                        if (isAnimating && cardAnimation?.animate == null) {
                          animateCardTo(
                            cardRefs.current.get(cardRef(cardAnimation?.card)),
                          )
                        }
                      }}
                      initial={isAnimating ? false : { opacity: 0, scale: 0.8 }}
                      animate={
                        isAnimating
                          ? { opacity: 0, scale: 1 }
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
                          : {
                              type: 'spring',
                              stiffness: 300,
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
          <AnimatePresence mode="wait">
            {cardAnimation?.animate && (
              <AnimatedCardOverlay
                key={cardRef(cardAnimation.card)}
                initial={cardAnimation.initial}
                animate={cardAnimation.animate}
                exit={{ opacity: 0, transition: { duration: 0 } }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  duration: 0.6,
                }}
                onAnimationComplete={() => {
                  setTargets([])
                  setAlert('')
                  setCardAnimation(null)
                }}
              >
                <DisplayCard card={cardAnimation.card} />
              </AnimatedCardOverlay>
            )}
          </AnimatePresence>
          <Player index={HUMAN_PLAYER} pile={humanPlayer.pile}>
            {humanPlayer.hand.map((card) => (
              <PlayerCard
                ref={(el) => {
                  if (el) {
                    cardRefs.current.set(cardRef(card), el)
                  } else {
                    cardRefs.current.delete(cardRef(card))
                  }
                }}
                disabled={game.turn !== HUMAN_PLAYER || cardAnimation != null}
                key={cardRef(card)}
                onClick={() => play({ card, capture: targets })}
                style={{
                  opacity:
                    cardRef(cardAnimation?.card) === cardRef(card) ? 0 : 1,
                }}
              >
                <DisplayCard card={card} />
              </PlayerCard>
            ))}
          </Player>
        </Main>
      )}
    </Container>
  )
}

const cardRef = (card?: Card | null) => card?.join('-') ?? ''
