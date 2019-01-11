import React, { Component } from 'react'
import { deck, shuffle } from './engine/cards'
import { deal } from './engine/scopa'
import { Game } from './ui/Game'

class App extends Component {
  render() {
    return <Game onStart={() => deal(shuffle(deck()), { players: 2 })} />
  }
}

export default App
