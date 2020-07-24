import React from 'react'
import { Result, fold } from '@pacote/result'
import { concat, contains, range, without } from 'ramda'
import styled from '@emotion/styled'
import { Card } from '../engine/cards'
import { Score } from '../engine/scores'
import { State, Move } from '../engine/state'
import { Card as UICard } from './Card'
import { Opponent, OpponentCard } from './Opponent'
import { Player, PlayerCard } from './Player'
import { ScoreBoard } from './ScoreBoard'
import { Table, TableCard, TableCardSelector } from './Table'

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

const GameOver = styled('main')`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  background-color: rgba(0, 0, 0, 0.25);
  height: calc(100vh - 4rem);
`

interface GameProps {
  onStart: () => Result<State, Error>
  onPlay: (move: Move, game: State) => Result<State, Error>
  onOpponentTurn: (game: State) => Promise<Move>
  onScore: (game: State['players']) => readonly Score[]
}

export const Game = ({
  onStart,
  onPlay,
  onOpponentTurn,
  onScore,
}: GameProps) => {
  const [alert, setAlert] = React.useState('')
  const [targets, setTargets] = React.useState<readonly Card[]>([])
  const [game, setGame] = React.useReducer(
    (currentGame: State, next: State) => next,
    {
      state: 'initial',
      turn: 0,
      table: [],
      pile: [],
      players: [],
    }
  )

  const invalidMove = React.useCallback(
    async (error: Error) => setAlert(error.message),
    []
  )

  const turnTransition = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (game: State, move?: Move) => async (nextGame: State) => {
      // TODO: animateTurnTransition: move, game -> nextGame
      setGame(nextGame)
      setTargets([])
      setAlert('')
    },
    []
  )

  const start = React.useCallback(
    () => fold(turnTransition(game), invalidMove, onStart()),
    [invalidMove, turnTransition, onStart, game]
  )

  const play = React.useCallback(
    (move: Move) =>
      fold(turnTransition(game, move), invalidMove, onPlay(move, game)),
    [onPlay, game, invalidMove, turnTransition]
  )

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

  const toggleTarget = (card: Card) =>
    setTargets(
      contains(card, targets)
        ? without([card], targets)
        : concat([card], targets)
    )

  const humanPlayer = game.players[HUMAN_PLAYER]

  return (
    <>
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
        <main>
          {game.players.map(
            (player, index) =>
              index !== HUMAN_PLAYER && (
                <Opponent
                  key={`opponent-${index}`}
                  index={index}
                  pile={player.pile.length}
                >
                  {range(0, player.hand.length).map((key) => (
                    <OpponentCard key={`${index}-${key}`} hidden={true} />
                  ))}
                </Opponent>
              )
          )}
          <Table>
            {game.table.map(([value, suit]) => {
              const key = `${suit}${value}`
              return (
                <label key={key} htmlFor={key}>
                  <TableCardSelector
                    disabled={game.turn !== HUMAN_PLAYER}
                    type="checkbox"
                    checked={contains([value, suit], targets)}
                    onChange={() => toggleTarget([value, suit])}
                    id={key}
                  />
                  <TableCard value={value} suit={suit} />
                </label>
              )
            })}
          </Table>
          <Player index={HUMAN_PLAYER} pile={humanPlayer.pile.length}>
            {humanPlayer.hand.map(([value, suit]) => (
              <PlayerCard
                disabled={game.turn !== HUMAN_PLAYER}
                key={`${value}:${suit}`}
                onClick={() => play({ card: [value, suit], targets })}
              >
                <UICard value={value} suit={suit} />
              </PlayerCard>
            ))}
          </Player>
        </main>
      )}
    </>
  )
}
