import React from 'react'
import { getOrElse } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/pipeable'
import { deck, shuffle } from './engine/cards'
import { findMatches } from './engine/match'
import { deal, play } from './engine/scopa'
import { score } from './engine/scores'
import { State } from './engine/state'
import { Game } from './ui/Game'

const dealShuffledDeck = () => deal(shuffle(deck()), { players: 2 })

const App = () => (
  <Game
    onStart={dealShuffledDeck}
    onPlay={play}
    onOpponentTurn={async game => {
      // SPIKE
      await new Promise(resolve => setTimeout(resolve, 1000))

      const card = game.players[game.turn].hand[0]

      const available = findMatches(card[0], game.table)
      const mustPick = Math.min(...available.map(t => t.length))
      const valid = available.filter(t => t.length === mustPick)
      const targets = valid[0] || []

      return pipe(
        play({ card, targets }, game),
        getOrElse<Error, State>(() => ({
          ...game,
          state: 'stop'
        }))
      )
    }}
    onScore={score}
  />
)

export default App
