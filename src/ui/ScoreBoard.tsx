import React from 'react'
import styled from '@emotion/styled-base'

const Board = styled('table')`
  border: 1px solid white;
  width: 20vw;
  padding: 1rem;
`

const Player = styled('tr')``

const Name = styled('td')`
  color: white;
  padding: 1rem;
`

const Score = styled('td')`
  color: white;
  padding: 1rem;
  text-align: right;
`

type ScoreBoardProps = {
  scores: ReadonlyArray<number>
}

export const ScoreBoard = ({ scores = [] }: ScoreBoardProps) => (
  <Board>
    <tbody>
      {scores.map((score, player) => (
        <Player key={`player-${player}`}>
          <Name>Player {player + 1}</Name>
          <Score>{score}</Score>
        </Player>
      ))}
    </tbody>
  </Board>
)
