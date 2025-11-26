import styled from '@emotion/styled'
import { Card } from './Card'

export const Table = styled('section')`
  background-color: darkgreen;
  margin: 1rem;
  text-align: center;
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  overflow: auto;
  min-height: 0;
  /* transform: perspective(1500px) rotateX(30deg) rotateY(0deg) rotateZ(0deg) scale(1); */
`

export const TableCard = styled(Card)`
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

export const TableCardSelector = styled('input')`
  position: absolute;
  left: -9999px;
`
