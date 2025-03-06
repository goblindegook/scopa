import { assert, integer, property } from 'fast-check'
import { type Card, Suit } from './cards'
import { score } from './scores'
import { describe, expect, test } from 'vitest'

describe('prime', () => {
  test.each<[string, number, Card]>([
    ['sevens', 21, [7, Suit.DENARI]],
    ['sixes', 18, [6, Suit.DENARI]],
    ['aces', 16, [1, Suit.DENARI]],
    ['fives', 15, [5, Suit.DENARI]],
    ['fours', 14, [4, Suit.DENARI]],
    ['threes', 13, [3, Suit.DENARI]],
    ['twos', 12, [2, Suit.DENARI]],
    ['kings', 10, [10, Suit.DENARI]],
    ['knights', 10, [9, Suit.DENARI]],
    ['knaves', 10, [8, Suit.DENARI]],
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
        pile: [
          [7, Suit.DENARI],
          [6, Suit.DENARI],
        ] as Card[],
        scope: 0,
      },
    ]

    expect(score(players)[0].details).toContainEqual({
      label: 'Primiera',
      value: 21,
      cards: [[7, Suit.DENARI]],
    })
  })

  test('the highest card in each suit is scored', () => {
    const highest: Card[] = [
      [7, Suit.DENARI],
      [7, Suit.COPPE],
      [7, Suit.BASTONI],
      [7, Suit.SPADE],
    ]

    const rest: Card[] = [
      [6, Suit.DENARI],
      [6, Suit.COPPE],
      [6, Suit.BASTONI],
      [6, Suit.SPADE],
    ]

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
    const p1: Card[] = [
      [7, Suit.DENARI],
      [1, Suit.COPPE],
    ]
    const p2: Card[] = [
      [1, Suit.DENARI],
      [7, Suit.COPPE],
    ]

    assert(
      property(integer({min: 0, max: 20}), integer({min: 0, max: 20}), (s1, s2) => {
        const players = [
          { id: 0, hand: [], pile: p1, scope: s1 },
          { id: 1, hand: [], pile: p2, scope: s2 },
        ]

        expect(score(players)).toEqual([
          {
            playerId: 0,
            details: [
              { label: 'Scope', value: s1, cards: [] },
              { label: 'Captured', value: 2, cards: p1 },
              { label: 'Denari', value: 1, cards: [[7, Suit.DENARI]] },
              { label: 'Sette Bello', value: 1, cards: [[7, Suit.DENARI]] },
              { label: 'Primiera', value: 37, cards: p1 },
            ],
            total: s1 + 1,
          },
          {
            playerId: 1,
            details: [
              { label: 'Scope', value: s2, cards: [] },
              { label: 'Captured', value: 2, cards: p2 },
              { label: 'Denari', value: 1, cards: [[1, Suit.DENARI]] },
              { label: 'Sette Bello', value: 0, cards: [] },
              { label: 'Primiera', value: 37, cards: p2 },
            ],
            total: s2,
          },
        ])
      }),
    )
  })

  test('the player who captured the most cards gets +1 point', () => {
    const p1: Card[] = [
      [5, Suit.COPPE],
      [5, Suit.SPADE],
    ]
    const p2: Card[] = [
      [10, Suit.COPPE],
      [10, Suit.BASTONI],
      [10, Suit.SPADE],
    ]

    assert(
      property(integer({min: 0, max: 20}), integer({min: 0, max: 20}), (s1, s2) => {
        const players = [
          { id: 0, hand: [], pile: p1, scope: s1 },
          { id: 1, hand: [], pile: p2, scope: s2 },
        ]

        expect(score(players)).toEqual([
          {
            playerId: 0,
            details: [
              { label: 'Scope', value: s1, cards: [] },
              { label: 'Captured', value: p1.length, cards: p1 },
              { label: 'Denari', value: 0, cards: [] },
              { label: 'Sette Bello', value: 0, cards: [] },
              { label: 'Primiera', value: 30, cards: p1 },
            ],
            total: s1,
          },
          {
            playerId: 1,
            details: [
              { label: 'Scope', value: s2, cards: [] },
              { label: 'Captured', value: p2.length, cards: p2 },
              { label: 'Denari', value: 0, cards: [] },
              { label: 'Sette Bello', value: 0, cards: [] },
              { label: 'Primiera', value: 30, cards: p2 },
            ],
            total: s2 + 1,
          },
        ])
      }),
    )
  })

  test('the player who captured the most cards in the suit of coins gets +1 point', () => {
    const p1: Card[] = [
      [1, Suit.DENARI],
      [2, Suit.DENARI],
    ]
    const p2: Card[] = [
      [1, Suit.COPPE],
      [2, Suit.COPPE],
    ]

    assert(
      property(
        integer({ min: 0, max: 20 }),
        integer({ min: 0, max: 20 }),
        (s1, s2) => {
          const players = [
            { id: 0, hand: [], pile: p1, scope: s1 },
            { id: 1, hand: [], pile: p2, scope: s2 },
          ]

          expect(score(players)).toEqual([
            {
              playerId: 0,
              details: [
                { label: 'Scope', value: s1, cards: [] },
                {
                  label: 'Captured',
                  value: 2,
                  cards: p1,
                },
                {
                  label: 'Denari',
                  value: 2,
                  cards: p1,
                },
                { label: 'Sette Bello', value: 0, cards: [] },
                { label: 'Primiera', value: 16, cards: [[1, Suit.DENARI]] },
              ],
              total: s1 + 1,
            },
            {
              playerId: 1,
              details: [
                { label: 'Scope', value: s2, cards: [] },
                {
                  label: 'Captured',
                  value: 2,
                  cards: p2,
                },
                { label: 'Denari', value: 0, cards: [] },
                { label: 'Sette Bello', value: 0, cards: [] },
                { label: 'Primiera', value: 16, cards: [[1, Suit.COPPE]] },
              ],
              total: s2,
            },
          ])
        },
      ),
    )
  })

  test('the player who captured the highest prime (primiera) gets +1 point', () => {
    const p1: Card[] = [[7, Suit.SPADE]]
    const p2: Card[] = [[6, Suit.COPPE]]

    assert(
      property(
        integer({ min: 0, max: 20 }),
        integer({ min: 0, max: 20 }),
        (s1, s2) => {
          const players = [
            { id: 0, hand: [], pile: p1, scope: s1 },
            { id: 1, hand: [], pile: p2, scope: s2 },
          ]

          expect(score(players)).toEqual([
            {
              playerId: 0,
              details: [
                { label: 'Scope', value: s1, cards: [] },
                { label: 'Captured', value: 1, cards: p1 },
                { label: 'Denari', value: 0, cards: [] },
                { label: 'Sette Bello', value: 0, cards: [] },
                { label: 'Primiera', value: 21, cards: p1 },
              ],
              total: s1 + 1,
            },
            {
              playerId: 1,
              details: [
                { label: 'Scope', value: s2, cards: [] },
                { label: 'Captured', value: 1, cards: p2 },
                { label: 'Denari', value: 0, cards: [] },
                { label: 'Sette Bello', value: 0, cards: [] },
                { label: 'Primiera', value: 18, cards: p2 },
              ],
              total: s2,
            },
          ])
        },
      ),
    )
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
