import { shuffle } from '@pacote/shuffle'
import { deck } from './engine/cards'
import './ui/i18n'
import { move } from './engine/opponent'
import { deal, play } from './engine/scopa'
import { score } from './engine/scores'
import { Game } from './ui/Game'

const dealShuffledDeck = (score?: readonly number[], players: 2 | 3 = 2) => deal(shuffle(deck()), { players, score })

const App = () => (
  <Game
    onStart={dealShuffledDeck}
    onPlay={play}
    onOpponentTurn={async (state, options) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return move(state, options)
    }}
    onScore={score}
  />
)

export default App
