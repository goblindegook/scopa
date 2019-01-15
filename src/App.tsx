import React, { Component } from 'react'
import { deck, shuffle } from './engine/cards'
import { deal, play, score } from './engine/scopa'
import { Game } from './ui/Game'
import { findMatches } from './engine/match'

const dealShuffledDeck = () => deal(shuffle(deck()), { players: 2 })

class App extends Component {
  render() {
    return (
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

          return play({ card, targets }, game).getOrElse({
            ...game,
            state: 'stop'
          })
        }}
        onScore={score}
      />
    )
  }
}

export default App
