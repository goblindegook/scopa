import { Deck, Card } from './cards'

export type Player = {
  hand: Deck
  pile: Deck
  scope: number
}

export type State = {
  state: 'initial' | 'play' | 'stop'
  turn: number
  pile: Deck
  players: ReadonlyArray<Player>
  table: Deck
}

export type Move = {
  card: Card
  targets: Deck
}
