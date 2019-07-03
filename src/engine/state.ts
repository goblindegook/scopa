import { Deck, Card } from './cards'

export interface Player {
  hand: Deck
  pile: Deck
  scope: number
}

export interface State {
  state: 'initial' | 'play' | 'stop'
  turn: number
  pile: Deck
  players: readonly Player[]
  table: Deck
}

export interface Move {
  card: Card
  targets: Deck
}
