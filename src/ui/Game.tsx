import React from 'react'
import { Either } from 'fp-ts/lib/Either'
import { contains, without } from 'ramda'
import { State, Move } from '../engine/scopa'
import { Deck, Card } from '../engine/cards'
import { Card as CardComponent } from './Card'
import styled from '@emotion/styled'

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

type GameOverProps = {
  scores: ReadonlyArray<number>
}

const GameOver = ({ scores = [] }: GameOverProps) => (
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
  selected: Deck
  onSelect: (card: Card) => void
}

const TableArea = styled('section')`
  background-color: darkgreen;
  padding: 1rem;
`

const Table = ({ cards, onSelect, selected }: TableProps) => (
  <TableArea>
    {cards.map(([value, suit]) => (
      <label key={`${value}:${suit}`}>
        <input
          type="checkbox"
          checked={contains([value, suit], selected)}
          onChange={() => onSelect([value, suit])}
        />
        <CardComponent value={value} suit={suit} />
      </label>
    ))}
  </TableArea>
)

const PlayerCard = styled('button')`
  background-color: transparent;
  border: none;
  padding: 0;
  &:focus {
    border: 3px solid red;
    border-radius: 1rem;
    margin: -3px;
  }
`

type PlayerProps = {
  hand: Deck
  onPlay: (card: Card) => void
}

const PlayerArea = styled('section')`
  background-color: green;
  padding: 1rem;
`

const Player = ({ hand, onPlay }: PlayerProps) => (
  <PlayerArea>
    {hand.map(([value, suit]) => (
      <PlayerCard
        key={`${value}:${suit}`}
        onClick={() => onPlay([value, suit])}
      >
        <CardComponent value={value} suit={suit} />
      </PlayerCard>
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
  game: State
  targets: ReadonlyArray<Card>
  alert: string
}

export class Game extends React.Component<GameProps, GameState> {
  state: GameState = {
    game: { state: 'stop', turn: 0, table: [], pile: [], players: [] },
    targets: [],
    alert: ''
  }

  handleSelection = (card: Card) => {
    const targets = contains(card, this.state.targets)
      ? without([card], this.state.targets)
      : this.state.targets.concat([card])
    this.setState({ targets })
  }

  handleResult = (result: Either<Error, State>) => {
    result.bimap(
      ({ message }) => this.setState({ alert: message }),
      game => {
        this.setState({ game, targets: [], alert: '' })
        this.opponentPlay(game)
      }
    )
  }

  opponentPlay = (game: State) => {
    if (game.state === 'play' && game.turn !== 0) {
      const next = this.props.onOpponentPlay(game)
      this.setState({ game: next })
      this.opponentPlay(next)
    }
  }

  render() {
    const { onStart, onPlay, onScore } = this.props
    const { alert, targets, game } = this.state

    return (
      <>
        <Header>
          <Button onClick={() => this.handleResult(onStart())}>
            Start new game
          </Button>
          <Alert>{alert}</Alert>
          {game.state === 'play' && (
            <Turn>{game && `Player ${game.turn + 1}`}</Turn>
          )}
        </Header>
        {game.state === 'stop' && <GameOver scores={onScore(game)} />}
        {game.players.length && (
          <>
            <Table
              cards={game.table}
              selected={targets}
              onSelect={this.handleSelection}
            />
            <Player
              hand={game.players[0].hand}
              onPlay={card =>
                this.handleResult(onPlay({ card, targets }, game))
              }
            />
          </>
        )}
      </>
    )
  }
}
