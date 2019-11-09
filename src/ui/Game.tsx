import React, { useState, useEffect } from 'react'
import { Either, bimap } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/pipeable'
import { contains, without, concat } from 'ramda'
import styled from '@emotion/styled'
import { State, Move } from '../engine/state'
import { Card } from '../engine/cards'
import { Table } from './Table'
import { Player } from './Player'
import { ScoreBoard } from './ScoreBoard'
import { Opponent } from './Opponent'
import { Score } from '../engine/scores'

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
  onStart: () => Either<Error, State>
  onPlay: (move: Move, game: State) => Either<Error, State>
  onOpponentTurn: (game: State) => Promise<State>
  onScore: (game: State) => readonly Score[]
}

export const Game = ({
  onStart,
  onPlay,
  onOpponentTurn,
  onScore
}: GameProps) => {
  const [alert, setAlert] = useState('')
  const [targets, setTargets] = useState<readonly Card[]>([])
  const [game, setGame] = useState<State>({
    state: 'initial',
    turn: 0,
    table: [],
    pile: [],
    players: []
  })

  useEffect(() => {
    let active = true
    if (game.state === 'play' && game.turn !== HUMAN_PLAYER) {
      onOpponentTurn(game)
        .then(game => active && setGame(game))
        .catch(console.error)
    }
    return () => {
      active = false
    }
  }, [game, onOpponentTurn, game.state, game.turn])

  const toggleTarget = (card: Card) =>
    setTargets(
      contains(card, targets)
        ? without([card], targets)
        : concat([card], targets)
    )

  const handle = (result: Either<Error, State>) =>
    pipe(
      result,
      bimap(
        ({ message }) => setAlert(message),
        game => {
          setGame(game)
          setTargets([])
          setAlert('')
        }
      )
    )

  return (
    <>
      <Header>
        <Button onClick={() => handle(onStart())}>Start new game</Button>
        <Alert>{alert}</Alert>
        {game.state === 'play' && <Turn>Player {game.turn + 1}</Turn>}
      </Header>
      {game.state === 'stop' && (
        <GameOver>
          <h2>Game Over</h2>
          <ScoreBoard scores={onScore(game)} />
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
                  hand={player.hand.length}
                  pile={player.pile.length}
                />
              )
          )}
          <Table
            disabled={game.turn !== HUMAN_PLAYER}
            cards={game.table}
            selected={targets}
            onSelect={toggleTarget}
          />
          <Player
            disabled={game.turn !== HUMAN_PLAYER}
            index={HUMAN_PLAYER}
            hand={game.players[HUMAN_PLAYER].hand}
            pile={game.players[HUMAN_PLAYER].pile.length}
            onPlay={card => handle(onPlay({ card, targets }, game))}
          />
        </main>
      )}
    </>
  )
}
