#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const { mkdirSync, mkdtempSync, rmSync } = require('node:fs')
const path = require('node:path')
const { isOk } = require('@pacote/result')
const { shuffle } = require('@pacote/shuffle')

const ROOT_DIR = path.resolve(__dirname, '..')
const TSC_PATH = path.join(ROOT_DIR, 'node_modules', 'typescript', 'bin', 'tsc')
const ENGINE_SOURCES = [
  'src/engine/cards.ts',
  'src/engine/move.ts',
  'src/engine/opponent.ts',
  'src/engine/scopa.ts',
  'src/engine/scores.ts',
  'src/engine/state.ts',
]

function usage() {
  return [
    'Usage:',
    '  node scripts/simulate-matches.cjs --matches <N> --p0 [spec] --p1 [spec] [--p2 [spec]]',
    '',
    'Player spec:',
    '  [aggression=<number>][,count][,lookahead]',
    '  Examples:',
    '    --p0 aggression=0.4,count,lookahead',
    '    --p1 count',
    '    --p2',
    '',
    'Optional:',
    '  --players <2|3>    (if omitted, inferred from configured players)',
    '',
    'Defaults:',
    '  matches=100, players=2, canCountCards=false, canLookAhead=false, aggression=dynamic',
  ].join('\n')
}

function parseInteger(value, argName) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) throw new Error(`${argName} expects an integer, got "${value}"`)
  return parsed
}

function parseNumber(value, argName) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) throw new Error(`${argName} expects a number, got "${value}"`)
  return parsed
}

function parseProfileSpec(spec, argName) {
  const profile = {
    canCountCards: false,
    canLookAhead: false,
    aggression: undefined,
  }

  if (spec == null || spec.trim() === '') return profile

  const tokens = spec
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  for (const token of tokens) {
    const normalized = token.toLowerCase()
    if (normalized === 'count') {
      profile.canCountCards = true
      continue
    }
    if (normalized === 'lookahead') {
      profile.canLookAhead = true
      continue
    }
    if (normalized.startsWith('aggression=')) {
      const value = token.slice('aggression='.length)
      profile.aggression = parseNumber(value, `${argName} aggression`)
      continue
    }
    throw new Error(`Unknown token "${token}" in ${argName}. Expected aggression=<n>,count,lookahead`)
  }

  return profile
}

function parseArgs(argv) {
  let matches = 100
  let players = null
  const profiles = Array.from({ length: 3 }, () => ({
    canCountCards: false,
    canLookAhead: false,
    aggression: undefined,
  }))
  const configuredPlayers = new Set([0, 1])

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
      players = parseInteger(next, '--players')
      index += 1
      continue
    }

    const match = arg.match(/^--p([0-2])$/i)
    if (match != null) {
      const playerId = Number.parseInt(match[1], 10)
      configuredPlayers.add(playerId)
      const hasValue = next != null && !next.startsWith('--')
      const spec = hasValue ? next : ''
      profiles[playerId] = parseProfileSpec(spec, arg)
      if (hasValue) {
        index += 1
      }
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  const inferredPlayers = configuredPlayers.has(2) ? 3 : 2
  players ??= inferredPlayers
  if (![2, 3].includes(players)) throw new Error('--players must be 2 or 3')
  if (matches <= 0) throw new Error('--matches must be greater than 0')

  for (const playerId of configuredPlayers) {
    if (playerId >= players) {
      throw new Error(`Player p${playerId} was configured but --players is ${players}`)
    }
  }

  return {
    help: false,
    matches,
    players,
    profiles: profiles.slice(0, players),
  }
}

function compileEngine(outDir) {
  const args = [
    TSC_PATH,
    '--pretty',
    'false',
    '--module',
    'commonjs',
    '--target',
    'esnext',
    '--lib',
    'esnext',
    '--moduleResolution',
    'node',
    '--outDir',
    outDir,
    '--rootDir',
    ROOT_DIR,
    '--skipLibCheck',
    '--esModuleInterop',
    '--rewriteRelativeImportExtensions',
    'true',
    ...ENGINE_SOURCES,
  ]
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`Failed to compile engine sources.\n${output}`)
  }
}

function dealRound({ deal, deck, players, score, forcePlayerZero }) {
  while (true) {
    const maybeGame = deal(shuffle(deck()), { players, score: [...score] })
    if (!isOk(maybeGame)) continue
    return forcePlayerZero ? { ...maybeGame.value, turn: 0 } : maybeGame.value
  }
}

function playUntilStop({ game, move, play, profiles }) {
  let state = game

  while (state.state !== 'stop') {
    const currentMove = move(state, profiles[state.turn])
    const maybeNext = play(currentMove, state)
    if (!isOk(maybeNext)) throw new Error(`Invalid move for player ${state.turn}: ${maybeNext.error.message}`)
    state = maybeNext.value
  }

  return state
}

function roundLeaders(roundTotals) {
  const max = Math.max(...roundTotals)
  return roundTotals.flatMap((value, playerId) => (value === max ? [playerId] : []))
}

function matchWinner(scoreboard) {
  const max = Math.max(...scoreboard)
  if (max < 11) return null
  const leaders = scoreboard.flatMap((score, playerId) => (score === max ? [playerId] : []))
  return leaders.length === 1 ? leaders[0] : null
}

function percentage(value, total) {
  return `${((value / total) * 100).toFixed(2)}%`
}

function formatAggression(value) {
  return value == null ? 'dynamic' : value.toFixed(2)
}

function simulate({ matches, players, profiles }) {
  const tempRoot = path.join(ROOT_DIR, 'node_modules', '.tmp')
  mkdirSync(tempRoot, { recursive: true })
  const tempDir = mkdtempSync(path.join(tempRoot, 'scopa-sim-'))

  try {
    compileEngine(tempDir)
    const { deck } = require(path.join(tempDir, 'src/engine/cards.js'))
    const { move } = require(path.join(tempDir, 'src/engine/opponent.js'))
    const { deal, play } = require(path.join(tempDir, 'src/engine/scopa.js'))

    const stats = Array.from({ length: players }, () => ({
      matchesWon: 0,
      roundsWon: 0,
      roundsLost: 0,
      roundsTied: 0,
    }))
    let matchScore = Array(players).fill(0)
    let firstRoundInMatch = true
    let completedMatches = 0
    let totalRounds = 0

    while (completedMatches < matches) {
      const scoreAtRoundStart = firstRoundInMatch ? Array(players).fill(0) : [...matchScore]
      const initialGame = dealRound({
        deal,
        deck,
        players,
        score: scoreAtRoundStart,
        forcePlayerZero: firstRoundInMatch,
      })
      const finalGame = playUntilStop({ game: initialGame, move, play, profiles })
      totalRounds += 1
      const scoreAtRoundEnd = [...finalGame.score]
      const roundTotals = scoreAtRoundEnd.map((total, playerId) => total - scoreAtRoundStart[playerId])
      const leaders = roundLeaders(roundTotals)
      const hasSingleWinner = leaders.length === 1

      for (let playerId = 0; playerId < players; playerId += 1) {
        if (hasSingleWinner && leaders[0] === playerId) {
          stats[playerId].roundsWon += 1
          continue
        }
        if (leaders.includes(playerId)) {
          stats[playerId].roundsTied += 1
          continue
        }
        stats[playerId].roundsLost += 1
      }

      const winner = matchWinner(scoreAtRoundEnd)
      if (winner != null) {
        stats[winner].matchesWon += 1
        completedMatches += 1
        matchScore = Array(players).fill(0)
        firstRoundInMatch = true
      } else {
        matchScore = scoreAtRoundEnd
        firstRoundInMatch = false
      }
    }

    const rows = stats.map((entry, playerId) => ({
      player: `p${playerId}`,
      aggression: formatAggression(profiles[playerId].aggression),
      canCountCards: profiles[playerId].canCountCards,
      canLookAhead: profiles[playerId].canLookAhead,
      roundsWon: entry.roundsWon,
      roundsWonPct: percentage(entry.roundsWon, totalRounds),
      roundsLost: entry.roundsLost,
      roundsLostPct: percentage(entry.roundsLost, totalRounds),
      roundsTied: entry.roundsTied,
      roundsTiedPct: percentage(entry.roundsTied, totalRounds),
      matchesWon: entry.matchesWon,
      matchesWonPct: percentage(entry.matchesWon, matches),
    }))

    console.log(`Simulated ${matches} completed match(es) with ${players} player(s).`)
    console.log(`Total rounds played: ${totalRounds}`)
    console.log(`Completed matches: ${completedMatches}`)
    console.table(rows)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function main() {
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
