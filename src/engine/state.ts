import type { Card, Deck } from './cards'

export interface Player {
  readonly id: number
  readonly hand: Deck
  readonly pile: Deck
  readonly scope: number
}

export interface State {
  readonly state: 'initial' | 'play' | 'stop'
  readonly turn: number
  readonly pile: Deck
  readonly players: readonly Player[]
  readonly table: Deck
}

export interface Move {
  readonly card: Card
  readonly targets: Deck
}
