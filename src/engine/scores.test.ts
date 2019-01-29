import { Suit, Card } from './cards'
import { score, prime } from './scores'
import { State } from './state'
import { assert, property, integer } from 'fast-check'

describe('prime', () => {
  test(`sevens are worth 21 points`, () => {
    expect(prime([[7, Suit.DENARI]])).toBe(21)
  })

  test(`sixes are worth 18 points`, () => {
    expect(prime([[6, Suit.DENARI]])).toBe(18)
  })

  test(`aces are worth 16 points`, () => {
    expect(prime([[1, Suit.DENARI]])).toBe(16)
  })

  test(`fives are worth 15 points`, () => {
    expect(prime([[5, Suit.DENARI]])).toBe(15)
  })

  test(`fours are worth 14 points`, () => {
    expect(prime([[4, Suit.DENARI]])).toBe(14)
  })

  test(`threes are worth 13 points`, () => {
    expect(prime([[3, Suit.DENARI]])).toBe(13)
  })

  test(`two are worth 13 points`, () => {
    expect(prime([[2, Suit.DENARI]])).toBe(12)
  })

  test(`face cards are worth 10 points`, () => {
    expect(prime([[8, Suit.DENARI]])).toBe(10)
    expect(prime([[9, Suit.DENARI]])).toBe(10)
    expect(prime([[10, Suit.DENARI]])).toBe(10)
  })

  test(`only the highest card in the suit is scored`, () => {
    expect(prime([[7, Suit.DENARI], [6, Suit.DENARI]])).toBe(21)
  })

  test(`the highest card in each suit is scored`, () => {
    expect(
      prime([
        [7, Suit.DENARI],
        [7, Suit.COPPE],
        [7, Suit.BASTONI],
        [7, Suit.SPADE]
      ])
    ).toBe(84)
  })
})

describe('single player score', () => {
  test(`a player's base score is the number of scope they achieved`, () => {
    const game: State = {
      state: 'stop',
      turn: 0,
      players: [
        { hand: [], pile: [], scope: 1 },
        { hand: [], pile: [], scope: 2 }
      ],
      pile: [],
      table: []
    }

    expect(score(game)).toEqual([
      {
        details: [
          { label: 'Scope', value: 1 },
          { label: 'Captured', value: 0, cards: [] },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', cards: [] },
          { label: 'Primiera', value: 0, cards: [] }
        ],
        total: 1
      },
      {
        details: [
          { label: 'Scope', value: 2 },
          { label: 'Captured', value: 0, cards: [] },
          { label: 'Denari', value: 0, cards: [] },
          { label: 'Sette Bello', cards: [] },
          { label: 'Primiera', value: 0, cards: [] }
        ],
        total: 2
      }
    ])
  })

  test(`the player who captured the sette bello gets +1 point`, () => {
    assert(
      property(integer(0, 20), integer(0, 20), (s1, s2) => {
        const game: State = {
          state: 'stop',
          turn: 0,
          players: [
            { hand: [], pile: [[7, Suit.DENARI], [1, Suit.COPPE]], scope: s1 },
            { hand: [], pile: [[7, Suit.COPPE], [1, Suit.DENARI]], scope: s2 }
          ],
          pile: [],
          table: []
        }

        expect(score(game)).toEqual([
          {
            details: [
              { label: 'Scope', value: s1 },
              {
                label: 'Captured',
                value: 2,
                cards: [[7, Suit.DENARI], [1, Suit.COPPE]]
              },
              { label: 'Denari', value: 1, cards: [[7, Suit.DENARI]] },
              { label: 'Sette Bello', cards: [[7, Suit.DENARI]] },
              { label: 'Primiera', value: 37, cards: [] }
            ],
            total: s1 + 1
          },
          {
            details: [
              { label: 'Scope', value: s2 },
              {
                label: 'Captured',
                value: 2,
                cards: [[7, Suit.COPPE], [1, Suit.DENARI]]
              },
              { label: 'Denari', value: 1, cards: [[1, Suit.DENARI]] },
              { label: 'Sette Bello', cards: [] },
              { label: 'Primiera', value: 37, cards: [] }
            ],
            total: s2
          }
        ])
      })
    )
  })

  test(`the player who captured the most cards gets +1 point`, () => {
    const p1: Card[] = [[5, Suit.SPADE], [5, Suit.COPPE]]
    const p2: Card[] = [[10, Suit.COPPE], [10, Suit.BASTONI], [10, Suit.SPADE]]

    assert(
      property(integer(0, 20), integer(0, 20), (s1, s2) => {
        const game: State = {
          state: 'stop',
          turn: 0,
          players: [
            { hand: [], pile: p1, scope: s1 },
            { hand: [], pile: p2, scope: s2 }
          ],
          pile: [],
          table: []
        }

        expect(score(game)).toEqual([
          {
            details: [
              { label: 'Scope', value: s1 },
              { label: 'Captured', value: p1.length, cards: p1 },
              { label: 'Denari', value: 0, cards: [] },
              { label: 'Sette Bello', cards: [] },
              { label: 'Primiera', value: 30, cards: [] }
            ],
            total: s1
          },
          {
            details: [
              { label: 'Scope', value: s2 },
              { label: 'Captured', value: p2.length, cards: p2 },
              { label: 'Denari', value: 0, cards: [] },
              { label: 'Sette Bello', cards: [] },
              { label: 'Primiera', value: 30, cards: [] }
            ],
            total: s2 + 1
          }
        ])
      })
    )
  })

  test(`the player who captured the most cards in the suit of coins gets +1 point`, () => {
    assert(
      property(integer(0, 20), integer(0, 20), (s1, s2) => {
        const game: State = {
          state: 'stop',
          turn: 0,
          players: [
            { hand: [], pile: [[1, Suit.DENARI], [2, Suit.DENARI]], scope: s1 },
            { hand: [], pile: [[1, Suit.COPPE], [2, Suit.COPPE]], scope: s2 }
          ],
          pile: [],
          table: []
        }

        expect(score(game)).toEqual([
          {
            details: [
              { label: 'Scope', value: s1 },
              {
                label: 'Captured',
                value: 2,
                cards: [[1, Suit.DENARI], [2, Suit.DENARI]]
              },
              {
                label: 'Denari',
                value: 2,
                cards: [[1, Suit.DENARI], [2, Suit.DENARI]]
              },
              { label: 'Sette Bello', cards: [] },
              { label: 'Primiera', value: 16, cards: [] }
            ],
            total: s1 + 1
          },
          {
            details: [
              { label: 'Scope', value: s2 },
              {
                label: 'Captured',
                value: 2,
                cards: [[1, Suit.COPPE], [2, Suit.COPPE]]
              },
              { label: 'Denari', value: 0, cards: [] },
              { label: 'Sette Bello', cards: [] },
              { label: 'Primiera', value: 16, cards: [] }
            ],
            total: s2
          }
        ])
      })
    )
  })

  test(`the player who captured the highest prime (primiera) gets +1 point`, () => {
    assert(
      property(integer(0, 20), integer(0, 20), (s1, s2) => {
        const game: State = {
          state: 'stop',
          turn: 0,
          players: [
            { hand: [], pile: [[7, Suit.SPADE]], scope: s1 },
            { hand: [], pile: [[6, Suit.COPPE]], scope: s2 }
          ],
          pile: [],
          table: []
        }

        expect(score(game)).toEqual([
          {
            details: [
              { label: 'Scope', value: s1 },
              { label: 'Captured', value: 1, cards: [[7, Suit.SPADE]] },
              { label: 'Denari', value: 0, cards: [] },
              { label: 'Sette Bello', cards: [] },
              { label: 'Primiera', value: 21, cards: [] }
            ],
            total: s1 + 1
          },
          {
            details: [
              { label: 'Scope', value: s2 },
              { label: 'Captured', value: 1, cards: [[6, Suit.COPPE]] },
              { label: 'Denari', value: 0, cards: [] },
              { label: 'Sette Bello', cards: [] },
              { label: 'Primiera', value: 18, cards: [] }
            ],
            total: s2
          }
        ])
      })
    )
  })
})

describe('team score', () => {
  test.skip(`a team's base score is the number of scope each of its players achieved`, () => {
    // TODO
  })

  test.skip(`the team that captured the sette bello gets +1 point`, () => {
    // TODO
  })

  test.skip(`the team that captured most cards gets +1 point`, () => {
    // TODO
  })

  test.skip(`the team that captured most cards in the suit of coins gets +1 point`, () => {
    // TODO
  })

  test.skip(`the team that captured the primiera gets +1 point`, () => {
    // TODO
  })
})
