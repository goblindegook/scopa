import React from 'react'
import { Either, isRight } from 'fp-ts/lib/Either'
import { Game as State } from '../engine/scopa'
import { Deck } from '../engine/cards'
import { Card } from './Card'
import styled from '@emotion/styled'

type TableProps = {
  cards: Deck
}

const TableCards = ({ cards }: TableProps) => (
  <section>
    {cards.map(([value, suit]) => (
      <Card key={`${value}-${suit}`} value={value} suit={suit} />
    ))}
  </section>
)

const Table = styled(TableCards)`
  background-color: darkgreen;
`

type HandProps = {
  cards: Deck
}

const HandCards = ({ cards }: HandProps) => (
  <section>
    {cards.map(([value, suit]) => (
      <Card key={`${value}-${suit}`} value={value} suit={suit} />
    ))}
  </section>
)

const Hand = styled(HandCards)`
  background-color: green;
`

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
        <button onClick={this.start}>Start new game</button>
        {this.state.game && isRight(this.state.game) ? (
          <>
            <Table cards={this.state.game.value.table} />
            <Hand cards={this.state.game.value.players[0].hand} />
          </>
        ) : (
          <div />
        )}
      </>
    )
  }
}
