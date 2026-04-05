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
    onOpponentTurn={(game) => move(game, { canCountCards: true, canLookAhead: true })}
    onScore={score}
  />
)

export default App
