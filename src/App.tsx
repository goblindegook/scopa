import { shuffle } from '@pacote/shuffle'
import { deck } from './engine/cards'
import './ui/i18n'
import { move } from './engine/opponent'
import { deal, play } from './engine/scopa'
import { score } from './engine/scores'
import { Game } from './ui/Game'

const dealShuffledDeck = (wins?: readonly number[]) => deal(shuffle(deck()), { players: 2, wins })

const App = () => <Game onStart={dealShuffledDeck} onPlay={play} onOpponentTurn={move} onScore={score} />

export default App
