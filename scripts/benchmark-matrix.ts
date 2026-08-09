#!/usr/bin/env node

// Runs the acceptance matrix: every candidate profile against one control, across several seeds and both player
// counts.
//
// Each run is a child process rather than an in-process call because the simulation is CPU-bound and single-threaded
// — one process per core is the parallelism, and it cut the standard matrix from hours to minutes. Node startup
// (~150ms) is noise against a run measured in minutes. The `Report` type is imported so the JSON boundary still
// type-checks against the simulator.

import { execFile } from 'node:child_process'
import { cpus } from 'node:os'
import { promisify } from 'node:util'
import type { Report } from './simulate-matches.ts'

const execFileAsync = promisify(execFile)

const SIMULATOR = 'scripts/simulate-matches.ts'

// What src/ui/OfflineMode.tsx actually ships, per player count. `shipped` resolves to this in --control/--candidate,
// so ship decisions are measured against the real default rather than against the neutral control.
const SHIPPED: Record<2 | 3, string> = {
  2: 'aggression=-1',
  3: 'aggression=1',
}

const SHIPPED_KEYWORD = 'shipped'

const DEFAULT_CANDIDATES: readonly string[] = [
  'aggression=0',
  SHIPPED_KEYWORD,
  'aggression=1',
  'aggression=-1',
  '',
  'aggression=0,count',
  'aggression=0,lookahead',
  'aggression=0,count,lookahead',
  'count',
  'lookahead',
]

const resolve = (spec: string, players: 2 | 3): string => (spec === SHIPPED_KEYWORD ? SHIPPED[players] : spec)

interface Options {
  matches: number
  seeds: readonly number[]
  players: readonly (2 | 3)[]
  control: string
  candidates: readonly string[]
  json: boolean
  concurrency: number
}

interface Run {
  players: 2 | 3
  candidate: string
  seed: number
  rounds: number
  liftRoundWin: number
  liftMatchWin: number
  lift: Record<Category, number>
  netPoints: number
}

const CATEGORIES = ['scope', 'cards', 'denari', 'settebello', 'primiera'] as const
type Category = (typeof CATEGORIES)[number]

type ProfileReport = Report['profiles'][number]

const LIFT_KEY: Record<Category, keyof ProfileReport> = {
  scope: 'scopePerRound',
  cards: 'cardsPointPct',
  denari: 'denariPointPct',
  settebello: 'settebelloPct',
  primiera: 'primieraPointPct',
}

function usage(): string {
  return [
    'Usage:',
    '  node --experimental-strip-types scripts/benchmark-matrix.ts [options]',
    '',
    'Options:',
    '  --matches <n>        completed matches per seating per run (default 1500)',
    '  --seeds <a,b,c>      independent seeds; spread across seeds is the error bar (default 1,2,3,4)',
    '  --players <2|3|2,3>  player counts to run (default 2,3)',
    '  --control <spec>     control profile every candidate is measured against (default aggression=0)',
    '  --candidate <spec>   repeatable; replaces the default candidate set',
    '  --concurrency <n>    parallel simulator processes (default: cores - 1)',
    '  --json               emit raw aggregated JSON instead of a table',
    '',
    'Profile spec is the same as simulate-matches.ts: [variant=<name>][,aggression=<n>][,count][,lookahead].',
    'An empty spec ("") means dynamic aggression with counting and lookahead off.',
    '',
    `--control and --candidate also accept the keyword "${SHIPPED_KEYWORD}", which resolves per player count to what`,
    `src/ui/OfflineMode.tsx ships: 2p "${SHIPPED[2]}", 3p "${SHIPPED[3]}". Keep the default aggression=0 control to`,
    `attribute a change; use --control ${SHIPPED_KEYWORD} to decide whether it is worth shipping.`,
    '',
    'Scope lift is in points per round and is unbounded (Scopa scores one point per sweep). The other four',
    'categories are winner-takes-all, so their lift is in percentage points. "net" converts everything to',
    'expected points per round (pp / 100) and sums it.',
  ].join('\n')
}

function parseArgs(argv: readonly string[]): Options | null {
  const options: Options = {
    matches: 1500,
    seeds: [1, 2, 3, 4],
    players: [2, 3],
    control: 'aggression=0',
    candidates: DEFAULT_CANDIDATES,
    json: false,
    concurrency: Math.max(2, cpus().length - 1),
  }
  const candidates: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]
    if (arg === '--help' || arg === '-h') return null
    if (arg === '--json') {
      options.json = true
      continue
    }
    if (next == null) throw new Error(`${arg} requires a value`)
    index += 1
    if (arg === '--matches') options.matches = Number.parseInt(next, 10)
    else if (arg === '--concurrency') options.concurrency = Number.parseInt(next, 10)
    else if (arg === '--control') options.control = next
    else if (arg === '--candidate') candidates.push(next)
    else if (arg === '--seeds') options.seeds = next.split(',').map((value) => Number.parseInt(value, 10))
    else if (arg === '--players') {
      options.players = next.split(',').map((value) => {
        const count = Number.parseInt(value, 10)
        if (count !== 2 && count !== 3) throw new Error('--players accepts 2, 3, or 2,3')
        return count
      })
    } else throw new Error(`Unknown argument: ${arg}`)
  }

  if (candidates.length > 0) options.candidates = candidates
  if (!Number.isFinite(options.matches) || options.matches <= 0) throw new Error('--matches must be a positive integer')
  return options
}

function simulatorArgs({
  players,
  candidate,
  seed,
  options,
}: {
  players: 2 | 3
  candidate: string
  seed: number
  options: Options
}): string[] {
  const base = [
    '--experimental-strip-types',
    SIMULATOR,
    '--matches',
    String(options.matches),
    '--seed',
    String(seed),
    '--players',
    String(players),
    '--rotate-seats',
    '--json',
  ]
  const control = resolve(options.control, players)
  const arm = resolve(candidate, players)
  // The candidate always takes the last seat; every other seat is a control, so 3p measures one candidate against two.
  return players === 2
    ? [...base, '--p0', control, '--p1', arm]
    : [...base, '--p0', control, '--p1', control, '--p2', arm]
}

async function runOne(job: { players: 2 | 3; candidate: string; seed: number }, options: Options): Promise<Run> {
  const { stdout } = await execFileAsync('node', simulatorArgs({ ...job, options }), { maxBuffer: 1 << 26 })
  const report: Report = JSON.parse(stdout)
  const candidateIndex = job.players - 1
  const candidate = report.profiles[candidateIndex]
  const controls = report.profiles.filter((_, index) => index !== candidateIndex)
  const controlMean = (key: keyof ProfileReport) =>
    controls.reduce((total, profile) => total + Number(profile[key]), 0) / controls.length

  const lift = Object.fromEntries(
    CATEGORIES.map((category) => [category, Number(candidate[LIFT_KEY[category]]) - controlMean(LIFT_KEY[category])]),
  ) as Record<Category, number>

  // Winner-takes-all categories are worth 1 point, so a percentage point of win rate is 0.01 points per round.
  // Scope is already points per round.
  const netPoints = CATEGORIES.reduce(
    (total, category) => total + (category === 'scope' ? lift[category] : lift[category] / 100),
    0,
  )

  return {
    ...job,
    rounds: report.totalRounds,
    liftRoundWin: candidate.roundsWonPct - controlMean('roundsWonPct'),
    liftMatchWin: candidate.matchesWonPct - controlMean('matchesWonPct'),
    lift,
    netPoints,
  }
}

async function pool<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let next = 0
  let done = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next]
        next += 1
        results.push(await worker(item))
        done += 1
        process.stderr.write(`\r${done}/${items.length} runs`)
      }
    }),
  )
  process.stderr.write('\n')
  return results
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0
  const average = mean(values)
  return Math.sqrt(values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1))
}

function label(candidate: string, control: string): string {
  if (candidate === control) return `control (${control})`
  if (candidate === SHIPPED_KEYWORD) return 'shipped default'
  return candidate === '' ? 'dynamic aggression' : candidate
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  if (options == null) {
    console.log(usage())
    return
  }

  const jobs = options.players.flatMap((players) =>
    options.candidates.flatMap((candidate) => options.seeds.map((seed) => ({ players, candidate, seed }))),
  )
  const runs = await pool(jobs, options.concurrency, (job) => runOne(job, options))

  const rows = options.players.flatMap((players) =>
    options.candidates.map((candidate) => {
      const group = runs.filter((run) => run.players === players && run.candidate === candidate)
      const roundWin = group.map((run) => run.liftRoundWin)
      const matchWin = group.map((run) => run.liftMatchWin)
      return {
        mode: `${players}p`,
        candidate: label(candidate, options.control),
        roundWin: mean(roundWin),
        sd: standardDeviation(roundWin),
        matchWin: mean(matchWin),
        // §6 calls match win the primary metric, so it needs a spread of its own to be actionable.
        matchSd: standardDeviation(matchWin),
        net: mean(group.map((run) => run.netPoints)),
        lift: Object.fromEntries(
          CATEGORIES.map((category) => [category, mean(group.map((run) => run.lift[category]))]),
        ) as Record<Category, number>,
        rounds: group.reduce((total, run) => total + run.rounds, 0),
      }
    }),
  )

  if (options.json) {
    console.log(JSON.stringify({ options, rows }, null, 2))
    return
  }

  console.log(`Control: ${options.control} | matches/run: ${options.matches} | seeds: ${options.seeds.join(',')}`)
  console.log('Lift vs control. scope + net are points/round; the rest are percentage points.')
  console.table(
    rows.map((row) => ({
      mode: row.mode,
      candidate: row.candidate,
      roundWin: `${row.roundWin.toFixed(2)} ±${row.sd.toFixed(2)}`,
      matchWin: `${row.matchWin.toFixed(2)} ±${row.matchSd.toFixed(2)}`,
      net: row.net.toFixed(4),
      scope: row.lift.scope.toFixed(3),
      cards: row.lift.cards.toFixed(2),
      denari: row.lift.denari.toFixed(2),
      sette: row.lift.settebello.toFixed(2),
      primiera: row.lift.primiera.toFixed(2),
      rounds: row.rounds,
    })),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  console.error('')
  console.error(usage())
  process.exitCode = 1
})
