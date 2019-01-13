import React from 'react'

type ScoreBoardProps = {
  scores: ReadonlyArray<number>
}

export const ScoreBoard = ({ scores = [] }: ScoreBoardProps) => (
  <aside>
    <ul>
      {scores.map((score, player) => (
        <li key={`player-${player}`}>
          Player {player + 1}: {score}
        </li>
      ))}
    </ul>
  </aside>
)
