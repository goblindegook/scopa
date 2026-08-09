#!/usr/bin/env node

import { isOk } from '@pacote/result'
import { deck, type Pile } from '../src/engine/cards.ts'
import { move, type OpponentOptions } from '../src/engine/opponent.ts'
import { deal, play } from '../src/engine/scopa.ts'
import { score } from '../src/engine/scores.ts'
import type { Move, State } from '../src/engine/state.ts'

type PlayerCount = 2 | 3

type Policy = (game: State, options: OpponentOptions) => Move

// Register alternative evaluators here so they can be pitted against `baseline` in a single run.
const VARIANTS: Record<string, Policy> = {
  baseline: move,
}

interface Profile {
  variant: string
  options: OpponentOptions
}

type OutputFormat = 'table' | 'json'

interface ParsedArgs {
  help: false
  matches: number
  players: PlayerCount
  profiles: readonly Profile[]
  seed: number | null
  rotateSeats: boolean
  format: OutputFormat
}

interface HelpArgs {
  help: true
}

interface ProfileStats {
  roundsPlayed: number
  roundsWon: number
  roundsLost: number
  roundsTied: number
  matchesWon: number
  matchesPlayed: number
  scope: number
  cards: number
  denari: number
  settebello: number
  primiera: number
}

function usage(): string {
  return [
    'Usage:',
    '  node --experimental-strip-types scripts/simulate-matches.ts --matches <N> --p0 [spec] --p1 [spec] [--p2 [spec]]',
    '',
    'Player spec:',
    '  [variant=<name>][,aggression=<number>][,count][,worlds=<n>][,cheat]',
    '  Examples:',
    '    --p0 aggression=0.4,count',
    '    --p0 variant=baseline --p1 variant=baseline,count',
    '    --p1 count',
    '    --p2',
    '',
    `  Registered variants: ${Object.keys(VARIANTS).join(', ')}`,
    '',
    'Optional:',
    '  --players <2|3>    (if omitted, inferred from configured players)',
    '  --seed <n>         deterministic deals; the same seed deals the same decks across runs and arms',
    '  --rotate-seats     replay every seat permutation over the same deals and pool the results',
    '  --json             machine-readable output (also how benchmark-matrix.ts consumes runs)',
    '',
    'Defaults:',
    '  matches=100, players=2, variant=baseline, canCountCards=false, aggression=dynamic',
    '  seed=none (non-reproducible), rotate-seats=off, output=table',
    '',
    'Shard across cores by running one process per seed and pooling the --json output.',
  ].join('\n')
}

function parseInteger(value: string, argName: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) throw new Error(`${argName} expects an integer, got "${value}"`)
  return parsed
}

function parseNumber(value: string, argName: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) throw new Error(`${argName} expects a number, got "${value}"`)
  return parsed
}

function defaultProfile(): Profile {
  return {
    variant: 'baseline',
    options: { canCountCards: false, aggression: undefined },
  }
}

function parseProfileSpec(spec: string, argName: string): Profile {
  const profile = defaultProfile()

  if (spec.trim() === '') return profile

  const tokens = spec
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  for (const token of tokens) {
    const normalized = token.toLowerCase()
    if (normalized === 'count') {
      profile.options.canCountCards = true
      continue
    }
    if (normalized === 'cheat') {
      profile.options.cheats = true
      continue
    }
    if (normalized.startsWith('worlds=')) {
      profile.options.worlds = parseInteger(token.slice('worlds='.length), `${argName} worlds`)
      continue
    }
    if (normalized.startsWith('aggression=')) {
      const value = token.slice('aggression='.length)
      profile.options.aggression = parseNumber(value, `${argName} aggression`)
      continue
    }
    if (normalized.startsWith('variant=')) {
      const name = token.slice('variant='.length)
      if (!(name in VARIANTS)) {
        throw new Error(`Unknown variant "${name}" in ${argName}. Registered: ${Object.keys(VARIANTS).join(', ')}`)
      }
      profile.variant = name
      continue
    }
    throw new Error(
      `Unknown token "${token}" in ${argName}. Expected variant=<name>,aggression=<n>,count,worlds=<n>,cheat`,
    )
  }

  return profile
}

function parseArgs(argv: readonly string[]): ParsedArgs | HelpArgs {
  let matches = 100
  let players: PlayerCount | null = null
  let seed: number | null = null
  let rotateSeats = false
  let format: OutputFormat = 'table'
  const profiles: Profile[] = Array.from({ length: 3 }, defaultProfile)
  const configuredPlayers = new Set<number>([0, 1])

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') return { help: true }

    const next = argv[index + 1]
    if (arg === '--matches') {
      if (next == null) throw new Error('--matches requires a value')
      matches = parseInteger(next, '--matches')
      index += 1
      continue
    }
    if (arg === '--players') {
      if (next == null) throw new Error('--players requires a value')
      const parsedPlayers = parseInteger(next, '--players')
      if (parsedPlayers !== 2 && parsedPlayers !== 3) throw new Error('--players must be 2 or 3')
      players = parsedPlayers
      index += 1
      continue
    }
    if (arg === '--seed') {
      if (next == null) throw new Error('--seed requires a value')
      seed = parseInteger(next, '--seed')
      index += 1
      continue
    }
    if (arg === '--rotate-seats') {
      rotateSeats = true
      continue
    }
    if (arg === '--json') {
      format = 'json'
      continue
    }

    const match = arg.match(/^--p([0-2])$/i)
    if (match != null) {
      const playerId = Number.parseInt(match[1], 10)
      configuredPlayers.add(playerId)
      const hasValue = next != null && !next.startsWith('--')
      profiles[playerId] = parseProfileSpec(hasValue ? next : '', arg)
      if (hasValue) index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  const inferredPlayers: PlayerCount = configuredPlayers.has(2) ? 3 : 2
  players ??= inferredPlayers
  if (matches <= 0) throw new Error('--matches must be greater than 0')

  for (const playerId of configuredPlayers) {
    if (playerId >= players) throw new Error(`Player p${playerId} was configured but --players is ${players}`)
  }

  return { help: false, matches, players, profiles: profiles.slice(0, players), seed, rotateSeats, format }
}

// Seeding the previous lead as 1 opens every match on seat 0, so seat luck cannot skew the benchmark.
const MATCH_OPENING_SEED = 1

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Deals are keyed by (match, round, redeal attempt) rather than by a running counter, so the same slot yields the
// same deck no matter how many rounds an arm needed to reach it. That is what makes seeded runs paired.
function dealRandom(seed: number | null, ...key: readonly number[]): () => number {
  if (seed == null) return Math.random
  let hash = 2166136261 >>> 0
  for (const part of [seed, ...key]) {
    hash = Math.imul(hash ^ (part >>> 0), 16777619) >>> 0
    hash = Math.imul(hash ^ (part >>> 16), 16777619) >>> 0
  }
  return mulberry32(hash)
}

function shuffleWith<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items]
  for (let i = 0; i < shuffled.length - 1; i += 1) {
    const j = i + Math.floor(random() * (shuffled.length - i))
    const swapped = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = swapped
  }
  return shuffled
}

function dealRound({
  players,
  score: runningScore,
  previousFirstPlayer,
  seed,
  matchIndex,
  roundIndex,
}: {
  players: PlayerCount
  score: readonly number[]
  previousFirstPlayer: number
  seed: number | null
  matchIndex: number
  roundIndex: number
}): State {
  for (let attempt = 0; ; attempt += 1) {
    const cards: Pile = shuffleWith(deck(), dealRandom(seed, matchIndex, roundIndex, attempt))
    const maybeGame = deal(cards, { players, score: [...runningScore], previousFirstPlayer })
    if (isOk(maybeGame)) return maybeGame.value
  }
}

function playUntilStop(game: State, seating: readonly Profile[]): State {
  let state = game

  while (state.state !== 'stop') {
    const profile = seating[state.turn]
    const currentMove = VARIANTS[profile.variant](state, profile.options)
    const maybeNext = play(currentMove, state)
    if (!isOk(maybeNext)) throw new Error(`Invalid move for seat ${state.turn}: ${maybeNext.value.message}`)
    state = maybeNext.value
  }

  return state
}

function roundLeaders(roundTotals: readonly number[]): readonly number[] {
  const max = Math.max(...roundTotals)
  return roundTotals.flatMap((value, playerId) => (value === max ? [playerId] : []))
}

function matchWinner(scoreboard: readonly number[]): number | null {
  const max = Math.max(...scoreboard)
  if (max < 11) return null
  const leaders = scoreboard.flatMap((total, playerId) => (total === max ? [playerId] : []))
  return leaders.length === 1 ? leaders[0] : null
}

// Winner-takes-all categories award nothing on a tie, matching `score()` in src/engine/scores.ts.
function uniqueLeader(values: readonly number[]): number | null {
  const max = Math.max(...values)
  if (max === 0) return null
  const leaders = values.flatMap((value, playerId) => (value === max ? [playerId] : []))
  return leaders.length === 1 ? leaders[0] : null
}

function categoryValues(details: readonly (readonly { label: string; value: number }[])[], label: string): number[] {
  return details.map((playerDetails) => playerDetails.find((detail) => detail.label === label)?.value ?? 0)
}

function permutations(count: number): readonly (readonly number[])[] {
  if (count <= 1) return [[0]]
  return permutations(count - 1).flatMap((rest) =>
    Array.from({ length: count }, (_, position) => [...rest.slice(0, position), count - 1, ...rest.slice(position)]),
  )
}

function emptyStats(): ProfileStats {
  return {
    roundsPlayed: 0,
    roundsWon: 0,
    roundsLost: 0,
    roundsTied: 0,
    matchesWon: 0,
    matchesPlayed: 0,
    scope: 0,
    cards: 0,
    denari: 0,
    settebello: 0,
    primiera: 0,
  }
}

function runSeating({
  matches,
  players,
  profiles,
  seed,
  seating,
  stats,
}: {
  matches: number
  players: PlayerCount
  profiles: readonly Profile[]
  seed: number | null
  seating: readonly number[]
  stats: readonly ProfileStats[]
}): void {
  const seatedProfiles = seating.map((profileId) => profiles[profileId])
  let matchScore: number[] = Array(players).fill(0)
  let previousFirstPlayer = MATCH_OPENING_SEED
  let matchIndex = 0
  let roundIndex = 0

  while (matchIndex < matches) {
    const scoreAtRoundStart = [...matchScore]
    const initialGame = dealRound({
      players,
      score: scoreAtRoundStart,
      previousFirstPlayer,
      seed,
      matchIndex,
      roundIndex,
    })
    const finalGame = playUntilStop(initialGame, seatedProfiles)
    const scoreAtRoundEnd = [...finalGame.score]
    const roundTotals = scoreAtRoundEnd.map((total, seat) => total - scoreAtRoundStart[seat])
    const leaders = roundLeaders(roundTotals)
    const hasSingleWinner = leaders.length === 1

    const details = score(finalGame.players).map(({ details }) => details)
    const cardsLeader = uniqueLeader(categoryValues(details, 'Taken'))
    const denariLeader = uniqueLeader(categoryValues(details, 'Denari'))
    const primieraLeader = uniqueLeader(categoryValues(details, 'Primiera'))
    const scopeValues = categoryValues(details, 'Scope')
    const settebelloValues = categoryValues(details, 'Sette Bello')

    for (let seat = 0; seat < players; seat += 1) {
      const entry = stats[seating[seat]]
      entry.roundsPlayed += 1
      if (hasSingleWinner && leaders[0] === seat) entry.roundsWon += 1
      else if (leaders.includes(seat)) entry.roundsTied += 1
      else entry.roundsLost += 1

      entry.scope += scopeValues[seat]
      entry.settebello += settebelloValues[seat]
      if (cardsLeader === seat) entry.cards += 1
      if (denariLeader === seat) entry.denari += 1
      if (primieraLeader === seat) entry.primiera += 1
    }

    const winner = matchWinner(scoreAtRoundEnd)
    if (winner != null) {
      for (let seat = 0; seat < players; seat += 1) stats[seating[seat]].matchesPlayed += 1
      stats[seating[winner]].matchesWon += 1
      matchIndex += 1
      roundIndex = 0
      matchScore = Array(players).fill(0)
      previousFirstPlayer = MATCH_OPENING_SEED
    } else {
      roundIndex += 1
      matchScore = scoreAtRoundEnd
      previousFirstPlayer = finalGame.firstPlayer
    }
  }
}

function percentage(value: number, total: number): number {
  return total === 0 ? 0 : (value / total) * 100
}

// 95% normal-approximation half-width for a proportion, in percentage points.
function marginOfError(value: number, total: number): number {
  if (total === 0) return 0
  const p = value / total
  return 1.96 * Math.sqrt((p * (1 - p)) / total) * 100
}

function describeProfile(profile: Profile): string {
  const aggression = profile.options.aggression
  return [
    profile.variant,
    aggression == null ? 'aggression=dynamic' : `aggression=${aggression.toFixed(2)}`,
    profile.options.canCountCards ? 'count' : null,
    profile.options.canCountCards && profile.options.worlds ? `worlds=${profile.options.worlds}` : null,
    profile.options.cheats ? 'cheat' : null,
  ]
    .filter(Boolean)
    .join(',')
}

// Exported so benchmark-matrix.ts can type the --json output it parses back.
export interface Report {
  matches: number
  players: PlayerCount
  seed: number | null
  rotateSeats: boolean
  seatings: number
  totalRounds: number
  profiles: readonly {
    player: string
    profile: string
    variant: string
    aggression: number | null
    canCountCards: boolean
    roundsPlayed: number
    roundsWonPct: number
    roundsWonMoe: number
    roundsLostPct: number
    roundsTiedPct: number
    matchesWonPct: number
    matchesWonMoe: number
    scopePerRound: number
    cardsPointPct: number
    denariPointPct: number
    settebelloPct: number
    primieraPointPct: number
  }[]
}

function buildReport({
  args,
  stats,
  seatings,
  totalRounds,
}: {
  args: ParsedArgs
  stats: readonly ProfileStats[]
  seatings: number
  totalRounds: number
}): Report {
  return {
    matches: args.matches,
    players: args.players,
    seed: args.seed,
    rotateSeats: args.rotateSeats,
    seatings,
    totalRounds,
    profiles: stats.map((entry, playerId) => ({
      player: `p${playerId}`,
      profile: describeProfile(args.profiles[playerId]),
      variant: args.profiles[playerId].variant,
      aggression: args.profiles[playerId].options.aggression ?? null,
      canCountCards: args.profiles[playerId].options.canCountCards ?? false,
      roundsPlayed: entry.roundsPlayed,
      roundsWonPct: percentage(entry.roundsWon, entry.roundsPlayed),
      roundsWonMoe: marginOfError(entry.roundsWon, entry.roundsPlayed),
      roundsLostPct: percentage(entry.roundsLost, entry.roundsPlayed),
      roundsTiedPct: percentage(entry.roundsTied, entry.roundsPlayed),
      matchesWonPct: percentage(entry.matchesWon, entry.matchesPlayed),
      matchesWonMoe: marginOfError(entry.matchesWon, entry.matchesPlayed),
      scopePerRound: entry.roundsPlayed === 0 ? 0 : entry.scope / entry.roundsPlayed,
      cardsPointPct: percentage(entry.cards, entry.roundsPlayed),
      denariPointPct: percentage(entry.denari, entry.roundsPlayed),
      settebelloPct: percentage(entry.settebello, entry.roundsPlayed),
      primieraPointPct: percentage(entry.primiera, entry.roundsPlayed),
    })),
  }
}

function printTable(report: Report): void {
  console.log(`Simulated ${report.matches} completed match(es) with ${report.players} player(s).`)
  console.log(`Seed: ${report.seed ?? 'none (non-reproducible)'}`)
  console.log(`Seatings played: ${report.seatings}${report.rotateSeats ? ' (rotated)' : ''}`)
  console.log(`Total rounds played: ${report.totalRounds}`)

  console.table(
    report.profiles.map((entry) => ({
      player: entry.player,
      profile: entry.profile,
      roundsWon: `${entry.roundsWonPct.toFixed(2)}% ±${entry.roundsWonMoe.toFixed(2)}`,
      roundsLost: `${entry.roundsLostPct.toFixed(2)}%`,
      roundsTied: `${entry.roundsTiedPct.toFixed(2)}%`,
      matchesWon: `${entry.matchesWonPct.toFixed(2)}% ±${entry.matchesWonMoe.toFixed(2)}`,
    })),
  )

  console.log('Points won per round, by category:')
  console.table(
    report.profiles.map((entry) => ({
      player: entry.player,
      scope: entry.scopePerRound.toFixed(3),
      cards: `${entry.cardsPointPct.toFixed(2)}%`,
      denari: `${entry.denariPointPct.toFixed(2)}%`,
      settebello: `${entry.settebelloPct.toFixed(2)}%`,
      primiera: `${entry.primieraPointPct.toFixed(2)}%`,
    })),
  )
}

function simulate(args: ParsedArgs): void {
  const stats = args.profiles.map(emptyStats)
  const seatings = args.rotateSeats
    ? permutations(args.players)
    : [Array.from({ length: args.players }, (_, seat) => seat)]

  for (const seating of seatings) {
    runSeating({
      matches: args.matches,
      players: args.players,
      profiles: args.profiles,
      seed: args.seed,
      seating,
      stats,
    })
  }

  const totalRounds = stats[0]?.roundsPlayed ?? 0
  const report = buildReport({ args, stats, seatings: seatings.length, totalRounds })

  if (args.format === 'json') console.log(JSON.stringify(report, null, 2))
  else printTable(report)
}

function main(): void {
  try {
    const parsed = parseArgs(process.argv.slice(2))
    if (parsed.help) {
      console.log(usage())
      return
    }
    simulate(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    console.error('')
    console.error(usage())
    process.exitCode = 1
  }
}

main()
