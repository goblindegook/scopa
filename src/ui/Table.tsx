import React from 'react'
import styled from '@emotion/styled'
import { Card as CardType, Deck } from '../engine/cards'
import { contains } from 'ramda'
import { Card } from './Card'

type TableProps = {
  cards: Deck
  selected: Deck
  onSelect: (card: CardType) => void
}

const TableArea = styled('section')`
  background-color: darkgreen;
  padding: 1rem;
`

export const Table = ({ cards, onSelect, selected }: TableProps) => (
  <TableArea>
    {cards.map(([value, suit]) => (
      <label key={`${value}:${suit}`}>
        <input
          type="checkbox"
          checked={contains([value, suit], selected)}
          onChange={() => onSelect([value, suit])}
        />
        <Card value={value} suit={suit} />
      </label>
    ))}
  </TableArea>
)
