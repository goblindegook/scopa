import React, { Component } from 'react'
import { Suit } from './engine/cards'
import { Card } from './ui/Card'

class App extends Component {
  render() {
    return (
      <>
        <Card suit={Suit.DENARI} value={7} />
      </>
    )
  }
}

export default App
