# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node.js is managed via [mise](https://mise.jdx.dev/). Prefix commands with `mise exec --` if your shell hasn't been
activated:

```bash
mise exec -- npm run dev          # Start dev server (Vite)
mise exec -- npm run build        # Type-check + build for production
mise exec -- npm run lint         # Check with Biome
mise exec -- npm run format       # Auto-fix with Biome
mise exec -- npm run test         # Run tests with Vitest (watch mode)
mise exec -- npm run test:mutation  # Run Stryker mutation tests
```

To run a single test file:

```bash
mise exec -- npx vitest run src/engine/scopa.test.ts
```

## Architecture

The codebase is split into two clear layers:

### Engine (`src/engine/`)

Pure game logic with no UI dependencies. All public functions return `Result<State, Error>` from `@pacote/result`.

- **`cards.ts`** — Card type (`[Value, Suit]` tuple), Suit enum (DENARI, COPPE, BASTONI, SPADE), values 1–10, and
  utility functions (`deck()`, `isSame()`, `hasCard()`, etc.)
- **`state.ts`** — Shared types: `State`, `Player`, `Move`
- **`capture.ts`** — `findCaptures(total, table)`: finds all valid card combinations that sum to a given value,
  preferring minimum-length captures
- **`scopa.ts`** — `deal(cards, options)` and `play(move, game)`: core game state machine, returns
  `Result<State, Error>`
- **`scores.ts`** — `score(players)`: computes end-of-game scores (scope, most cards, most denari, settebello, primiera)
- **`opponent.ts`** — `move(game)`: async AI opponent that evaluates captures by prime points, denari preference, and
  scopa opportunity

### UI (`src/ui/`)

React components using Emotion styled-components and Framer Motion for card animations.

- **`Game.tsx`** — Root game component. Manages game state, animation phase machine (`idle → play → capture`), and
  coordinates between player interactions and opponent turns
- **`Card.tsx`** — Card rendering (lazy-loads JPG assets from `src/ui/assets/{suit}/{value}.jpg`), `AnimatedCard` (
  fixed-position overlay for move animations), `DealtCard` (deal-in animation wrapper), and `Duration` constants
- **`Player.tsx` / `Opponent.tsx`** — Player hand and captured pile display (face-up vs. face-down)
- **`Table.tsx`** — Table area with selectable cards for capture selection
- **`ScoreBoard.tsx`** — End-of-game score display and `GameOver` screen
- **`TitleScreen.tsx`** — Start screen shown at `state === 'initial'`

### App wiring (`src/App.tsx`)

Composes engine functions into the `Game` component's props: `onStart`, `onPlay`, `onOpponentTurn`, `onScore`.

## TDD — Non-Negotiable

This project uses Test-Driven Development. The red-green-refactor cycle is mandatory for all engine changes:

1. **Red** — write a failing test that describes the desired behaviour
2. **Green** — write the minimum code to make it pass
3. **Refactor** — clean up while keeping tests green

Never write implementation code without a failing test first. Never skip the refactor step.

Do not add comments that explain what the test is obviously doing. Focus instead on a good test description.

## Key Patterns

- **Card representation**: `Card = [Value, Suit]` tuple — always accessed by index (`card[0]` = value, `card[1]` = suit)
- **Result type**: Engine functions return `Ok(state)` or `Err(error)` — use `fold`, `isOk`, `isErr` from
  `@pacote/result`
- **Game states**: `'initial'` → `'play'` → `'stop'`
- **Animation phases**: `AnimationController` in `Game.tsx` tracks `idle | play | capture` phase with position data for
  flying card animations
- **Styling**: Emotion `styled` with single quotes, no semicolons, 120-char line width (Biome config)
- **Testing**: Vitest + Testing Library for UI, `fast-check` for property-based tests in engine (see `scopa.test.ts`)
