import { describe, expect, test } from 'vitest'
import { bastoni, coppe, denari, spade } from './cards'
import { score } from './scores'

describe('prime', () => {
  test.each([
    ['sevens', 21, denari(7)],
    ['sixes', 18, denari(6)],
    ['aces', 16, denari(1)],
    ['fives', 15, denari(5)],
    ['fours', 14, denari(4)],
    ['threes', 13, denari(3)],
    ['twos', 12, denari(2)],
    ['kings', 10, denari(10)],
    ['knights', 10, denari(9)],
    ['knaves', 10, denari(8)],
  ])('%s are worth %s points', (_, value, card) => {
    const players = [{ id: 0, hand: [], pile: [card], scope: 0 }]

    expect(score(players)[0].details).toContainEqual({
      label: 'Primiera',
      value,
      cards: [card],
    })
  })

  test('only the highest card in the suit is scored', () => {
    const players = [
      {
        id: 0,
        hand: [],
        pile: [denari(7), denari(6)],
        scope: 0,
      },
    ]

    expect(score(players)[0].details).toContainEqual({
      label: 'Primiera',
      value: 21,
      cards: [denari(7)],
    })
  })

  test('the highest card in each suit is scored', () => {
    const highest = [denari(7), coppe(7), bastoni(7), spade(7)]
    const rest = [denari(6), coppe(6), bastoni(6), spade(6)]
    const game = [{ id: 0, hand: [], pile: [...highest, ...rest], scope: 0 }]

    expect(score(game)[0].details).toContainEqual({
      label: 'Primiera',
      value: 84,
      cards: highest,
    })
  })
})

describe('single player score', () => {
  test(`a player's base score is the number of scope they achieved`, () => {
    const players = [
      { id: 0, hand: [], pile: [], scope: 1 },
      { id: 1, hand: [], pile: [], scope: 2 },
    ]

    expect(score(players)).toEqual([
      {
        playerId: 0,
        details: [
          { label: 'Scope', value: 1, cards: [] },
          { label: 'Captured', value: 0, cards: [] },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', value: 0, cards: [] },
          { label: 'Primiera', value: 0, cards: [] },
        ],
        total: 1,
      },
      {
        playerId: 1,
        details: [
          { label: 'Scope', value: 2, cards: [] },
          { label: 'Captured', value: 0, cards: [] },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', value: 0, cards: [] },
          { label: 'Primiera', value: 0, cards: [] },
        ],
        total: 2,
      },
    ])
  })

  test('the player who captured the sette bello gets +1 point', () => {
    const players = [
      { id: 0, hand: [], pile: [denari(7)], scope: 0 },
      { id: 1, hand: [], pile: [], scope: 0 },
    ]

    expect(score(players)).toEqual([
      {
        playerId: 0,
        details: [
          { label: 'Scope', value: 0, cards: [] },
          { label: 'Captured', value: 1, cards: [denari(7)] },
          { label: 'Denari', value: 1, cards: [denari(7)] },
          { label: 'Sette Bello', value: 1, cards: [denari(7)] },
          { label: 'Primiera', value: 21, cards: [denari(7)] },
        ],
        total: 4,
      },
      {
        playerId: 1,
        details: [
          { label: 'Scope', value: 0, cards: [] },
          { label: 'Captured', value: 0, cards: [] },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', value: 0, cards: [] },
          { label: 'Primiera', value: 0, cards: [] },
        ],
        total: 0,
      },
    ])
  })

  test('the player who captured the most cards gets +1 point', () => {
    const players = [
      { id: 0, hand: [], pile: [coppe(5), spade(5)], scope: 0 },
      { id: 1, hand: [], pile: [coppe(10), bastoni(10), spade(10)], scope: 0 },
    ]

    expect(score(players)).toEqual([
      {
        playerId: 0,
        details: [
          { label: 'Scope', value: 0, cards: [] },
          {
            label: 'Captured',
            value: [coppe(5), spade(5)].length,
            cards: [coppe(5), spade(5)],
          },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', value: 0, cards: [] },
          { label: 'Primiera', value: 30, cards: [coppe(5), spade(5)] },
        ],
        total: 1,
      },
      {
        playerId: 1,
        details: [
          { label: 'Scope', value: 0, cards: [] },
          {
            label: 'Captured',
            value: [coppe(10), bastoni(10), spade(10)].length,
            cards: [coppe(10), bastoni(10), spade(10)],
          },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', value: 0, cards: [] },
          {
            label: 'Primiera',
            value: 30,
            cards: [coppe(10), bastoni(10), spade(10)],
          },
        ],
        total: 2,
      },
    ])
  })

  test('the player who captured the most cards in the suit of coins gets +1 point', () => {
    const players = [
      { id: 0, hand: [], pile: [denari(1), denari(2)], scope: 0 },
      { id: 1, hand: [], pile: [coppe(1), coppe(2)], scope: 0 },
    ]

    expect(score(players)).toEqual([
      {
        playerId: 0,
        details: [
          { label: 'Scope', value: 0, cards: [] },
          { label: 'Captured', value: 2, cards: [denari(1), denari(2)] },
          { label: 'Denari', value: 2, cards: [denari(1), denari(2)] },
          { label: 'Sette Bello', value: 0, cards: [] },
          { label: 'Primiera', value: 16, cards: [denari(1)] },
        ],
        total: 3,
      },
      {
        playerId: 1,
        details: [
          { label: 'Scope', value: 0, cards: [] },
          { label: 'Captured', value: 2, cards: [coppe(1), coppe(2)] },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', value: 0, cards: [] },
          { label: 'Primiera', value: 16, cards: [coppe(1)] },
        ],
        total: 2,
      },
    ])
  })

  test('the player who captured the highest prime (primiera) gets +1 point', () => {
    const players = [
      { id: 0, hand: [], pile: [spade(7)], scope: 0 },
      { id: 1, hand: [], pile: [coppe(6)], scope: 0 },
    ]

    expect(score(players)).toEqual([
      {
        playerId: 0,
        details: [
          { label: 'Scope', value: 0, cards: [] },
          { label: 'Captured', value: 1, cards: [spade(7)] },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', value: 0, cards: [] },
          { label: 'Primiera', value: 21, cards: [spade(7)] },
        ],
        total: 2,
      },
      {
        playerId: 1,
        details: [
          { label: 'Scope', value: 0, cards: [] },
          { label: 'Captured', value: 1, cards: [coppe(6)] },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', value: 0, cards: [] },
          { label: 'Primiera', value: 18, cards: [coppe(6)] },
        ],
        total: 1,
      },
    ])
  })
})

describe('team score', () => {
  test.todo(
    `a team's base score is the number of scope each of its players achieved`,
  )

  test.todo('the team that captured the sette bello gets +1 point')

  test.todo('the team that captured most cards gets +1 point')

  test.todo(
    'the team that captured most cards in the suit of coins gets +1 point',
  )

  test.todo('the team that captured the primiera gets +1 point')
})
