import React from 'react'
import styled from '@emotion/styled'
import { Card as CardType, Deck } from '../engine/cards'
import { contains } from 'ramda'
import { Card } from './Card'

const TableArea = styled('section')`
  background-color: darkgreen;
  margin: 1rem;
  text-align: center;
  /* transform: perspective(1500px) rotateX(30deg) rotateY(0deg) rotateZ(0deg) scale(1); */
`

const TableCard = styled(Card)`
  margin: 1rem;
  transition: transform 0.2s ease-in, box-shadow 0.2s ease-in;

  input:focus + &,
  input + &:hover {
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
    transform: scale(1.1);
  }

  input:focus + & {
    border: 2px solid red;
    margin: calc(1rem - 2px);
  }

  input:checked + & {
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.5);
    transform: translateY(-20px) scale(1.2);
  }
`

const Checkbox = styled('input')`
  position: absolute;
  left: -9999px;
`

interface TableProps {
  cards: Deck
  disabled: boolean
  selected: Deck
  onSelect: (card: CardType) => void
}

export const Table = ({ cards, disabled, selected, onSelect }: TableProps) => (
  <TableArea>
    {cards.map(([value, suit]) => {
      const key = `${suit}${value}`
      return (
        <label key={key} htmlFor={key}>
          <Checkbox
            disabled={disabled}
            type="checkbox"
            checked={contains([value, suit], selected)}
            onChange={() => onSelect([value, suit])}
            id={key}
          />
          <TableCard value={value} suit={suit} />
        </label>
      )
    })}
  </TableArea>
)
