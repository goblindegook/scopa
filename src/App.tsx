import React, { Component } from 'react'
import { deck, shuffle } from './engine/cards'
import { deal, play, score } from './engine/scopa'
import { Game } from './ui/Game'
import { findMatches } from './engine/match'

class App extends Component {
  render() {
    return (
      <Game
        onStart={() => deal(shuffle(deck()), { players: 2 })}
        onPlay={play}
        onOpponentPlay={game => {
          // SPIKE
          const card = game.players[game.turn].hand[0]
          const possibleTargets = findMatches(card[0], game.table)
          const mustPick = Math.min(...possibleTargets.map(t => t.length))
          const validTargets = possibleTargets.filter(
            t => t.length === mustPick
          )
          const next = play({ card, targets: validTargets[0] || [] }, game)
          return next.isRight() ? next.value : { ...game, state: 'stop' }
        }}
        onScore={score}
      />
    )
  }
}

export default App
