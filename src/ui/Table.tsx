import styled from '@emotion/styled'
import { motion } from 'framer-motion'
import { Card } from './Card'

export const Table = styled(motion.section)`
  -webkit-overflow-scrolling: touch;
  align-content: center;
  display: flex;
  flex-wrap: wrap;
  flex: 1 1 35vh;
  justify-content: center;
  position: relative;
  gap: 1rem;
`

export const TableCard = styled(Card)`
  transition: transform 0.2s ease-in, box-shadow 0.2s ease-in;
  touch-action: manipulation;

  input:focus + &,
  input:not(:disabled) + &:hover {
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
    transform: scale(1.1);
  }

  input:focus + & {
    box-shadow: 0 0 0 2px #22c55e, 0 5px 10px rgba(0, 0, 0, 0.5);
  }

  input:checked + & {
    box-shadow: 0 0 0 2px #22c55e, 0 10px 15px rgba(0, 0, 0, 0.5);
    transform: scale(1.1);
  }
`

export const TableCardLabel = styled(motion.label)`
  display: inline-block;
`

export const TableCardSelector = styled('input')`
  position: absolute;
  left: -9999px;
`
