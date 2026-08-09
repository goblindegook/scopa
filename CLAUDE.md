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

### If tests fail on `localStorage` being undefined

Symptom: every test in `Scopa.test.tsx`, `App.test.tsx` or `useMultiplayerSession.test.tsx` fails with
`TypeError: Cannot read properties of undefined (reading 'clear')`, alongside a Node warning that
`localStorage is not available because --localstorage-file was not provided`.

**This is an agent-sandbox problem, not a repo problem.** The suite passes in a normal terminal and in CI. It happens
when Node's experimental web-storage accessor shadows jsdom's `localStorage`. Fix it in your own shell — never by
touching `vitest.config.ts`, `setupTests.ts`, or by adding a polyfill to the repo:

```bash
export NODE_OPTIONS="--localstorage-file=$TMPDIR/scopa-localstorage.db"
```

Then run the tests as usual. If they still fail, the failure is real.

## Architecture

The codebase is split into two clear layers:

### Engine (`src/engine/`)

Pure game logic with no UI dependencies. All public functions return `Result<State, Error>` from `@pacote/result`.

- **`cards.ts`** — Card type (`[Value, Suit]` tuple), Suit enum (DENARI, COPPE, BASTONI, SPADE), values 1–10, and
  utility functions (`deck()`, `isSame()`, `hasCard()`, etc.)
- **`state.ts`** — Shared types: `State`, `Player`, `Move`
- **`move.ts`** — `findCardsToTake(total, table)`: finds all valid card combinations that sum to a given value,
  preferring minimum-length captures
- **`scopa.ts`** — `deal(cards, options)` and `play(move, game)`: core game state machine, returns
  `Result<State, Error>`
- **`scores.ts`** — `score(players)`: computes end-of-game scores (scope, most cards, most denari, settebello, primiera)
- **`opponent.ts`** — `move(game)`: async AI opponent that evaluates captures by prime points, denari preference, and
  scopa opportunity

### UI (`src/ui/`)

React components using Emotion styled-components and Framer Motion for card animations.

- **`Scopa.tsx`** — Shared game surface for both offline and online play. Manages the animation phase machine
  (`idle → play → taking`) via `AnimationController`, and coordinates between player interactions and opponent turns
  through the `onPlay`/`onOpponentTurn` callbacks it's given — it doesn't know or care whether the "opponent" is the
  local AI or a remote player
- **`OfflineMode.tsx`** — Local vs-AI session: deals with `deal()`/`shuffle()`, drives `onOpponentTurn` from
  `engine/opponent.ts`'s `move()` with an artificial delay, renders `Scopa`
- **`OnlineMode.tsx`** — Multiplayer session: wraps `useMultiplayerSession`, shows `ChooseAvatar` or `Lobby` before a
  game exists, otherwise renders `Scopa` with `onOpponentTurn` fed by the socket's move queue
- **`useMultiplayerSession.ts`** — PartyKit client hook: persists `sid`/avatar per room in `sessionStorage`, owns the
  lockstep move queue, exposes `chooseAvatar`/`start`/`confirm`/`sendMove`/`cancelMove`
- **`Lobby.tsx`** / **`AvatarPicker.tsx`** — Pre-game multiplayer screens (waiting room, avatar selection)
- **`useActiveRoom.ts`** — Tracks the last active multiplayer room for title-screen resume
- **`Card.tsx`** — Card rendering (lazy-loads JPG assets from `src/ui/assets/{suit}/{value}.jpg`), `AnimatedCard` (
  fixed-position overlay for move animations), `DealtCard` (deal-in animation wrapper), and `Duration` constants
- **`Player.tsx` / `Opponent.tsx`** — Player hand and taken pile display (face-up vs. face-down)
- **`Table.tsx`** — Table area with selectable cards for taking selection
- **`ScoreBoard.tsx`** — End-of-game score display and `GameOver` screen
- **`TitleScreen.tsx`** — Start screen shown when there's no active session or room

### Multiplayer Worker (`src/party/`)

PartyKit Durable Object, deployed as `scopa-party` (see `partykit.json`).

- **`scopa.ts`** — Room authority: validates turns against `game.turn`, deals every round (redealing on the engine's
  >2-kings rejection), broadcasts `move`/`state` messages, uses `storage.setAlarm` for inactivity cleanup
- **`room.ts`** — Pure lobby guards (`canJoin`, `canStart`, `allConfirmed`, `upsertPlayer`), no PartyKit imports

### App wiring (`src/App.tsx`)

Thin router between `TitleScreen`, `OfflineMode`, and `OnlineMode` based on whether a local session or a `?room=` id
is active. Does not itself compose engine functions into game props — `OfflineMode` and `OnlineMode` each wire their
own `onPlay`/`onOpponentTurn`/`onScore` into `Scopa`.

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
- **Animation phases**: `AnimationController` in `Scopa.tsx` tracks `idle | play | taking` phase with position data for
  flying card animations
- **Styling**: Emotion `styled` with single quotes, no semicolons, 120-char line width (Biome config)
- **Testing**: Vitest + Testing Library for UI, `fast-check` for property-based tests in engine (see `scopa.test.ts`)
