export type PlayerCount = 2 | 3 | 4 | 6

// Only 4 and 6 play as partnerships; the other counts give every seat its own side.
const SIDES: Record<PlayerCount, number> = { 2: 2, 3: 3, 4: 2, 6: 3 }

const isPlayerCount = (players: number): players is PlayerCount => players in SIDES

export const sideCount = (players: number): number => (isPlayerCount(players) ? SIDES[players] : players)

export const sideOf = (seat: number, players: number): number => (isPlayerCount(players) ? seat % SIDES[players] : seat)
