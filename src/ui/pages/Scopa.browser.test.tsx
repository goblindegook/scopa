import { fold } from '@pacote/result'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import '../../index.css' // tokens + 100dvh body; main.tsx is not loaded in tests
import { deck } from '../../engine/cards'
import { move } from '../../engine/opponent'
import { deal, play } from '../../engine/scopa'
import { score } from '../../engine/scores'
import type { PlayerCount } from '../../engine/sides'
import type { State } from '../../engine/state'
import { Scopa } from './Scopa'

const AVATARS = ['🐵', '🤖', '👾', '🐶', '🐱', '🦊']

// @pacote/result has no `unwrap`; deck() is unshuffled so deal() cannot hit the Err branch here.
const game = (players: PlayerCount): State =>
  fold(
    (state: State) => state,
    (error: Error) => {
      throw error
    },
    deal(deck(), { players, previousFirstPlayer: 0 }),
  )

afterEach(() => {
  cleanup()
})

const renderGame = (state: State) =>
  render(
    <Scopa
      playerId={0}
      initialState={state}
      onPlay={play}
      onOpponentTurn={async (game, options) => move(game, options)}
      onScore={score}
      playerProfiles={AVATARS.slice(0, state.players.length).map((avatar) => ({ avatar }))}
    />,
  )

test('renders a two-player game on a narrow phone viewport', async () => {
  await page.viewport(360, 640)
  const { getByLabelText } = renderGame(game(2))

  expect(getByLabelText('🐵 hand')).toBeVisible()
})

const PHONES = [
  { width: 360, height: 640 },
  { width: 360, height: 560 },
] as const

/**
 * Visible strip of each fanned card, in layout pixels. The hand's children are the FanCard
 * wrappers that carry the negative margins; `offsetLeft`/`offsetWidth` ignore the fan's
 * `rotate()`, so this measures the advance between cards rather than a rotated bounding box.
 */
const handFaces = (hand: HTMLElement) => {
  const cards = Array.from(hand.children) as HTMLElement[]
  return cards.map((card, index) =>
    index === cards.length - 1 ? card.offsetWidth : cards[index + 1].offsetLeft - card.offsetLeft,
  )
}

const token = (name: string) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))

/** Rendered box of each hand card, deduplicated: the fan rotates the cards, so offsetWidth again. */
const handCardWidths = (hand: HTMLElement) =>
  new Set(Array.from(hand.querySelectorAll('img')).map((card) => card.offsetWidth))

test.for(PHONES)('keeps every hand card readable at $width x $height', async ({ width, height }) => {
  await page.viewport(width, height)
  const { getByLabelText } = renderGame(game(2))
  const hand = getByLabelText('🐵 hand')
  const cardWidth = token('--card-width')

  expect({
    widths: handCardWidths(hand),
    visibleFace: Math.min(...handFaces(hand)) >= Math.max(32, cardWidth * 0.25),
  }).toEqual({ widths: new Set([Math.round(cardWidth)]), visibleFace: true })
})

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 360, height: 560 },
  { width: 640, height: 360 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1200 },
] as const

const PLAYER_COUNTS = [2, 3, 4, 6] as const

const LAYOUTS = VIEWPORTS.flatMap((viewport) => PLAYER_COUNTS.map((players) => ({ ...viewport, players })))

test.for(LAYOUTS)('fits a $players-player game inside $width x $height', async ({ width, height, players }) => {
  await page.viewport(width, height)
  const { getByLabelText } = renderGame(game(players))

  const table = getByLabelText('Table').getBoundingClientRect()
  const hand = getByLabelText('🐵 hand').getBoundingClientRect()

  expect({
    scrolled: document.documentElement.scrollHeight > height,
    tableClipped: table.bottom > height || table.top < 0,
    handClipped: hand.bottom > height,
  }).toEqual({ scrolled: false, tableClipped: false, handClipped: false })
})

test('cards use the available space at 1920x1200', async () => {
  await page.viewport(1920, 1200)
  const { getByLabelText } = renderGame(game(2))
  const hand = getByLabelText('🐵 hand')

  expect(Math.min(...handCardWidths(hand))).toBeGreaterThanOrEqual(153)
})

/** Same deal, but with six extra cards on the table so it has to wrap. */
const crowded = (players: PlayerCount): State => {
  const state = game(players)
  return { ...state, table: [...state.table, ...state.pile.slice(0, 6)], pile: state.pile.slice(6) }
}

const tableRows = (table: HTMLElement) =>
  new Set(Array.from(table.querySelectorAll('label')).map((card) => Math.round(card.getBoundingClientRect().top)))

test.for(PHONES)('wraps a ten-card table without clipping it at $width x $height', async ({ width, height }) => {
  await page.viewport(width, height)
  const { getByLabelText } = renderGame(crowded(2))

  const table = getByLabelText('Table')
  const box = table.getBoundingClientRect()
  const cardWidth = token('--card-width')

  expect({
    rows: tableRows(table).size >= 2,
    // offsetWidth, not getBoundingClientRect: layout projection's mid-flight `scale` distorts
    // rects here the same way the fan's `rotate()` distorted them in handFaces above.
    fullWidthCards: Array.from(table.querySelectorAll('label')).every(
      (card) => (card as HTMLElement).offsetWidth === Math.round(cardWidth),
    ),
    clipped: box.bottom > height || box.top < 0,
  }).toEqual({ rows: true, fullWidthCards: true, clipped: false })
})
