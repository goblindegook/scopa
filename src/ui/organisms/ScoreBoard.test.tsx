import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import '../i18n'
import { ScoreBoard } from './ScoreBoard'

afterEach(() => {
  cleanup()
})

const getCellsByRowHeader = (table: HTMLElement, headerName: string) => {
  const rowHeader = within(table).getByRole('rowheader', { name: headerName })
  return within(rowHeader.closest('tr') ?? rowHeader).getAllByRole('cell')
}

test('renders player names and scores', () => {
  render(
    <ScoreBoard
      scores={[
        {
          sideId: 0,
          details: [
            { label: 'Scope', value: 2, cards: [] },
            { label: 'Taken', value: 20, cards: [] },
            { label: 'Denari', value: 5, cards: [] },
            { label: 'Sette Bello', value: 1, cards: [] },
            { label: 'Primiera', value: 45, cards: [] },
          ],
          total: 3,
        },
        {
          sideId: 1,
          details: [
            { label: 'Scope', value: 1, cards: [] },
            { label: 'Taken', value: 20, cards: [] },
            { label: 'Denari', value: 6, cards: [] },
            { label: 'Sette Bello', value: 0, cards: [] },
            { label: 'Primiera', value: 50, cards: [] },
          ],
          total: 4,
        },
      ]}
      playerAvatars={['🧑', '🤖']}
    />,
  )

  expect(screen.getByText('Game scoreboard showing scores for each player')).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: '🧑' })).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: '🤖' })).toBeTruthy()

  const table = screen.getByRole('table', { name: 'Game scoreboard' })

  const scopeRowCells = getCellsByRowHeader(table, 'Sweeps')
  expect(scopeRowCells[0]).toHaveTextContent('2')
  expect(scopeRowCells[1]).toHaveTextContent('1')

  const takenRowCells = getCellsByRowHeader(table, 'Taken')
  expect(takenRowCells[0]).toHaveTextContent('20')
  expect(takenRowCells[1]).toHaveTextContent('20')

  const denariRowCells = getCellsByRowHeader(table, 'Coins')
  expect(denariRowCells[0]).toHaveTextContent('5')
  expect(denariRowCells[1]).toHaveTextContent('6+1')
  expect(denariRowCells[1]).toHaveAccessibleName('6, bonus point awarded')

  const setteBelloRowCells = getCellsByRowHeader(table, 'Sette Bello')
  expect(setteBelloRowCells[0]).toHaveTextContent('1+1')
  expect(setteBelloRowCells[0]).toHaveAccessibleName('1, bonus point awarded')
  expect(setteBelloRowCells[1]).toHaveTextContent('0')

  const primieraRowCells = getCellsByRowHeader(table, 'Prime')
  expect(primieraRowCells[0]).toHaveTextContent('45')
  expect(primieraRowCells[1]).toHaveTextContent('50+1')
  expect(primieraRowCells[1]).toHaveAccessibleName('50, bonus point awarded')

  const totalRowCells = getCellsByRowHeader(table, 'Total')
  expect(totalRowCells[0]).toHaveTextContent('3')
  expect(totalRowCells[1]).toHaveTextContent('4')
})

test('renders one column per side headed by the grouped avatars', () => {
  render(
    <ScoreBoard
      scores={[
        { sideId: 0, details: [], total: 3 },
        { sideId: 1, details: [], total: 5 },
      ]}
      playerAvatars={['🐵', '🤖', '👾', '👽']}
    />,
  )

  expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
    'Score category',
    '🐵👾',
    '🤖👽',
  ])
})
