import { shuffle } from '@pacote/shuffle'
import { deck } from './engine/cards'
import { deal, play } from './engine/scopa'
import { score } from './engine/scores'
import { Game } from './ui/Game'
import { move } from './engine/opponent-basic'

const dealShuffledDeck = () => deal(shuffle(deck()), { players: 2 })

const App = () => (
  <Game
    onStart={dealShuffledDeck}
    onPlay={play}
    onOpponentTurn={move}
    onScore={score}
  />
)

export default App
