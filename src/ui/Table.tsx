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
  text-align: center;
  transform: perspective(1500px) rotateX(30deg) rotateY(0deg) rotateZ(0deg)
    scale(1);
`

const TableCard = styled(Card)`
  transition: transform 0.2s ease-in, box-shadow 0.2s ease-in;

  input:checked + & {
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.5);
    transform: translateY(-20px) scale(1.2);
  }
`

const Checkbox = styled('input')`
  position: absolute;
  left: -9999px;
`

export const Table = ({ cards, onSelect, selected }: TableProps) => (
  <TableArea>
    {cards.map(([value, suit]) => (
      <label key={`${value}:${suit}`}>
        <Checkbox
          type="checkbox"
          checked={contains([value, suit], selected)}
          onChange={() => onSelect([value, suit])}
        />
        <TableCard value={value} suit={suit} />
      </label>
    ))}
  </TableArea>
)
