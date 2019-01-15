import React, { useState, useEffect } from 'react'
import { Either } from 'fp-ts/lib/Either'
import { contains, without, concat } from 'ramda'
import styled from '@emotion/styled'
import { State, Move } from '../engine/state'
import { Card } from '../engine/cards'
import { Table } from './Table'
import { Player } from './Player'
import { ScoreBoard } from './ScoreBoard'

const HUMAN_PLAYER = 0

const Header = styled('header')`
  background-color: rgba(0, 0, 0, 0.5);
  padding: 1rem;
  font-size: 1rem;
  color: white;
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

type GameProps = {
  onStart: () => Either<Error, State>
  onPlay: (move: Move, game: State) => Either<Error, State>
  onOpponentTurn: (game: State) => Promise<State>
  onScore: (game: State) => ReadonlyArray<number>
}

export const Game = ({
  onStart,
  onPlay,
  onOpponentTurn,
  onScore
}: GameProps) => {
  const [alert, setAlert] = useState('')
  const [targets, setTargets] = useState<ReadonlyArray<Card>>([])
  const [game, setGame] = useState<State>({
    state: 'initial',
    turn: 0,
    table: [],
    pile: [],
    players: []
  })

  useEffect(
    () => {
      let active = true
      if (game.state === 'play' && game.turn !== HUMAN_PLAYER) {
        onOpponentTurn(game)
          .then(game => active && setGame(game))
          .catch(console.error)
      }
      return () => {
        active = false
      }
    },
    [game.state, game.turn]
  )

  const toggleTarget = (card: Card) =>
    setTargets(
      contains(card, targets)
        ? without([card], targets)
        : concat([card], targets)
    )

  const handle = (result: Either<Error, State>) =>
    result.bimap(
      ({ message }) => setAlert(message),
      game => {
        setGame(game)
        setTargets([])
        setAlert('')
      }
    )

  return (
    <>
      <Header>
        <Button onClick={() => handle(onStart())}>Start new game</Button>
        <Alert>{alert}</Alert>
        {game.state === 'play' && <Turn>Player {game.turn + 1}</Turn>}
      </Header>
      {game.state === 'stop' && (
        <aside>
          <h2>Game Over</h2>
          <ScoreBoard scores={onScore(game)} />
        </aside>
      )}
      {game.players.length > 0 && (
        <>
          <Table
            cards={game.table}
            selected={targets}
            onSelect={toggleTarget}
          />
          <Player
            disabled={game.state !== 'play' || game.turn !== HUMAN_PLAYER}
            hand={game.players[HUMAN_PLAYER].hand}
            onPlay={card => handle(onPlay({ card, targets }, game))}
          />
        </>
      )}
    </>
  )
}
