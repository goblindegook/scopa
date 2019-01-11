import React from 'react'
import { Either, isRight } from 'fp-ts/lib/Either'
import { Game as State } from '../engine/scopa'
import { Deck } from '../engine/cards'
import { Card } from './Card'
import styled from '@emotion/styled'

const Header = styled('header')`
  background-color: black;
  padding: 1rem;
`

const Button = styled('button')`
  font-size: 1rem;
  border-radius: 0.25rem;
  padding: 0.25rem 1rem;
`

type TableProps = {
  cards: Deck
}

const TableArea = styled('section')`
  background-color: darkgreen;
`

const Table = ({ cards }: TableProps) => (
  <TableArea>
    {cards.map(([value, suit]) => (
      <Card key={`${value}-${suit}`} value={value} suit={suit} />
    ))}
  </TableArea>
)

type PlayerProps = {
  hand: Deck
}

const PlayerArea = styled('section')`
  background-color: green;
`

const Player = ({ hand }: PlayerProps) => (
  <PlayerArea>
    {hand.map(([value, suit]) => (
      <Card key={`${value}-${suit}`} value={value} suit={suit} />
    ))}
  </PlayerArea>
)

type GameProps = {
  onStart: () => Either<Error, State>
}

type GameState = {
  game?: Either<Error, State>
}

export class Game extends React.Component<GameProps, GameState> {
  state: GameState = {}

  start = () => {
    this.setState({ game: this.props.onStart() })
  }

  render() {
    return (
      <>
        <Header>
          <Button onClick={this.start}>Start new game</Button>
        </Header>
        {this.state.game && isRight(this.state.game) ? (
          <>
            <Table cards={this.state.game.value.table} />
            <Player hand={this.state.game.value.players[0].hand} />
          </>
        ) : (
          <div />
        )}
      </>
    )
  }
}
