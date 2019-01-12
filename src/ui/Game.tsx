import React from 'react'
import { Either, isRight } from 'fp-ts/lib/Either'
import { Game as State, Move } from '../engine/scopa'
import { Deck, Card } from '../engine/cards'
import { Card as CardComponent } from './Card'
import styled from '@emotion/styled'

const Header = styled('header')`
  background-color: black;
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

type GameOverProps = {
  scores: ReadonlyArray<number>
}

const GameOver = ({ scores }: GameOverProps) => (
  <aside>
    <h2>Game Over</h2>
    <ul>
      {scores.map((score, player) => (
        <li key={`player-${player}`}>
          Player {player + 1}: {score}
        </li>
      ))}
    </ul>
  </aside>
)

type TableProps = {
  cards: Deck
}

const TableArea = styled('section')`
  background-color: darkgreen;
`

const Table = ({ cards }: TableProps) => (
  <TableArea>
    {cards.map(([value, suit]) => (
      <CardComponent key={`${value}-${suit}`} value={value} suit={suit} />
    ))}
  </TableArea>
)

type PlayerProps = {
  hand: Deck
  onPlay: (card: Card) => void
}

const PlayerArea = styled('section')`
  background-color: green;
`

const Player = ({ hand, onPlay }: PlayerProps) => (
  <PlayerArea>
    {hand.map(([value, suit]) => (
      <button key={`${value}-${suit}`} onClick={() => onPlay([value, suit])}>
        <CardComponent value={value} suit={suit} />
      </button>
    ))}
  </PlayerArea>
)

type GameProps = {
  onStart: () => Either<Error, State>
  onPlay: (move: Move, game: State) => Either<Error, State>
  onOpponentPlay: (game: State) => State
  onScore: (game: State) => ReadonlyArray<number>
}

type GameState = {
  game?: State
  alert: string
}

export class Game extends React.Component<GameProps, GameState> {
  state: GameState = { alert: '' }

  start = () => {
    const result = this.props.onStart()
    if (isRight(result)) {
      this.setState({ game: result.value, alert: '' })
      this.opponentPlay(result.value)
    } else {
      this.setState({ alert: result.value.message })
    }
  }

  play = (card: Card) => {
    if (this.state.game) {
      const result = this.props.onPlay({ card }, this.state.game)
      if (isRight(result)) {
        this.setState({ game: result.value, alert: '' })
        this.opponentPlay(result.value)
      } else {
        this.setState({ alert: result.value.message })
      }
    }
  }

  opponentPlay = (game: State) => {
    if (game.state === 'play' && game.turn !== 0) {
      const next = this.props.onOpponentPlay(game)
      this.setState({ game: next })
      this.opponentPlay(next)
    }
  }

  render() {
    return (
      <>
        <Header>
          <Button onClick={this.start}>Start new game</Button>
          <Alert>{this.state.alert}</Alert>
          <Turn>{this.state.game && `Player ${this.state.game.turn + 1}`}</Turn>
        </Header>
        {this.state.game && (
          <>
            <Table cards={this.state.game.table} />
            <Player hand={this.state.game.players[0].hand} onPlay={this.play} />
            {this.state.game.state === 'stop' && (
              <GameOver scores={this.props.onScore(this.state.game)} />
            )}
          </>
        )}
      </>
    )
  }
}
