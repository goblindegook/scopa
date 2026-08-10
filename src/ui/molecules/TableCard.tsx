import styled from '@emotion/styled'
import { type HTMLMotionProps, motion } from 'framer-motion'
import type { Card as CardType } from '../../engine/cards'
import { Card } from '../atoms/Card'

const SelectableCard = styled(Card)<{ $state?: 'capturable' | 'dimmed' }>`
  transition: transform 0.2s ease-in, box-shadow 0.2s ease-in, opacity 0.2s ease-in;
  touch-action: manipulation;

  input:focus + &,
  input:not(:disabled) + &:hover {
    box-shadow: 0 5px 10px var(--overlay-black-40);
    transform: scale(1.1);
  }

  input:focus + & {
    box-shadow: 0 0 0 2px var(--color-accent-strong), 0 5px 10px var(--overlay-black-40);
  }

  input:checked + & {
    box-shadow: 0 0 0 2px var(--color-accent-strong), 0 10px 15px var(--overlay-black-40);
    transform: scale(1.1) translateY(-4px);
  }

  ${({ $state }) => $state === 'capturable' && `box-shadow: 0 0 0 2px var(--color-accent-strong);`}

  ${({ $state }) =>
    $state === 'dimmed' &&
    `
    opacity: 0.35;
    transform: scale(0.88);
    pointer-events: none;
    `}
`

const Label = styled(motion.label)`
  display: inline-block;
`

const Selector = styled('input')`
  position: absolute;
  left: -9999px;
`

export interface TableCardProps extends HTMLMotionProps<'label'> {
  id: string
  card: CardType
  state?: 'capturable' | 'dimmed'
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

/** A table card the current player can select to take with — the hidden checkbox drives the
 * visible card's focus/hover/checked styling via CSS sibling selectors, so it must stay adjacent
 * to it in the DOM. Never used as three separate pieces, so it's one component. */
export const TableCard = ({ id, card, state, checked, disabled, onChange, ...motionProps }: TableCardProps) => (
  <Label htmlFor={id} {...motionProps}>
    <Selector type="checkbox" id={id} checked={checked} disabled={disabled} onChange={onChange} />
    <SelectableCard card={card} $state={state} />
  </Label>
)
