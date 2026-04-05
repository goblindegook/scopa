import type { Card, Pile } from './cards'

export interface Player {
  readonly id: number
  readonly hand: Pile
  readonly pile: Pile
  readonly scope: number
}

export interface State {
  readonly state: 'initial' | 'play' | 'stop'
  readonly turn: number
  readonly pile: Pile
  readonly players: readonly Player[]
  readonly table: Pile
  readonly lastTaken: Pile
  readonly lastTaker?: number
  readonly score: readonly number[]
}

export interface Move {
  readonly card: Card
  readonly take: Pile
}
