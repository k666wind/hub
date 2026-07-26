import {
  isTerminalOrHonor,
  sortTiles,
  tileId,
  type Dragon,
  type SuitTile,
  type Tile,
  type Wind,
} from '../tiles';
import type { HandContext, Meld } from '../hand';

export interface CompletedSet {
  type: 'chow' | 'pong' | 'kong';
  tiles: Tile[];
  concealed: boolean;
}

export interface StandardDecomposition {
  kind: 'standard';
  pair: Tile;
  /** Always exactly 4 completed sets: declared melds + the concealed sets found. */
  sets: CompletedSet[];
}

export interface SevenPairsDecomposition {
  kind: 'sevenPairs';
  pairs: Tile[];
}

export interface ThirteenOrphansDecomposition {
  kind: 'thirteenOrphans';
  pairTile: Tile;
}

export type Decomposition =
  | StandardDecomposition
  | SevenPairsDecomposition
  | ThirteenOrphansDecomposition;

// ---------------------------------------------------------------------------
// Internal: multiset helpers over concealed tiles
// ---------------------------------------------------------------------------

interface CounterEntry {
  tile: Tile;
  count: number;
}
type Counter = Map<string, CounterEntry>;

function toCounter(tiles: Tile[]): Counter {
  const map: Counter = new Map();
  for (const t of tiles) {
    const id = tileId(t);
    const existing = map.get(id);
    if (existing) existing.count += 1;
    else map.set(id, { tile: t, count: 1 });
  }
  return map;
}

function nextRank(tile: SuitTile, delta: 1 | 2): SuitTile | null {
  const rank = tile.rank + delta;
  if (rank > 9) return null;
  return { kind: 'suit', suit: tile.suit, rank: rank as SuitTile['rank'] };
}

/**
 * All ways to fully consume a counter's remaining tiles into pong/chow sets.
 * Returns one array of CompletedSet per valid decomposition; [] if the
 * remaining tiles cannot be fully grouped into sets of 3.
 */
function decomposeSets(counter: Counter): CompletedSet[][] {
  const entries = [...counter.values()].filter((e) => e.count > 0);
  if (entries.length === 0) return [[]];

  // Always branch on the lowest-sorted remaining tile — keeps the search
  // deterministic and avoids generating the same decomposition twice.
  const { tile } = entries.sort((a, b) => tileSortKey(a.tile) - tileSortKey(b.tile))[0];
  const id = tileId(tile);
  const entry = counter.get(id)!;
  const results: CompletedSet[][] = [];

  // Option 1: triplet (pong)
  if (entry.count >= 3) {
    entry.count -= 3;
    for (const rest of decomposeSets(counter)) {
      results.push([{ type: 'pong', tiles: [tile, tile, tile], concealed: true }, ...rest]);
    }
    entry.count += 3;
  }

  // Option 2: run (chow) — suit tiles only
  if (tile.kind === 'suit') {
    const t2 = nextRank(tile, 1);
    const t3 = nextRank(tile, 2);
    if (t2 && t3) {
      const id2 = tileId(t2);
      const id3 = tileId(t3);
      const e2 = counter.get(id2);
      const e3 = counter.get(id3);
      if (e2 && e2.count > 0 && e3 && e3.count > 0) {
        entry.count -= 1;
        e2.count -= 1;
        e3.count -= 1;
        for (const rest of decomposeSets(counter)) {
          results.push([{ type: 'chow', tiles: [tile, e2.tile, e3.tile], concealed: true }, ...rest]);
        }
        entry.count += 1;
        e2.count += 1;
        e3.count += 1;
      }
    }
  }

  return results;
}

function tileSortKey(tile: Tile): number {
  switch (tile.kind) {
    case 'suit':
      return ({ characters: 0, dots: 1, bamboo: 2 } as const)[tile.suit] * 10 + tile.rank;
    case 'wind':
      return 100 + ({ east: 0, south: 1, west: 2, north: 3 } as const)[tile.wind];
    case 'dragon':
      return 200 + ({ red: 0, green: 1, white: 2 } as const)[tile.dragon];
    case 'flower':
      return 300 + tile.number;
  }
}

function meldToCompletedSet(meld: Meld): CompletedSet {
  return { type: meld.type, tiles: meld.tiles, concealed: meld.concealed };
}

// ---------------------------------------------------------------------------
// Standard hand: 4 sets + 1 pair
// ---------------------------------------------------------------------------

export function decomposeStandardHand(context: HandContext): StandardDecomposition[] {
  const setsNeeded = 4 - context.melds.length;
  if (setsNeeded < 0) return [];

  const concealed = context.concealedTiles.filter((t) => t.kind !== 'flower');
  if (concealed.length !== setsNeeded * 3 + 2) return [];

  const counter = toCounter(concealed);
  const pairCandidates = [...counter.values()].filter((e) => e.count >= 2);
  const meldSets = context.melds.map(meldToCompletedSet);

  const results: StandardDecomposition[] = [];
  for (const candidate of pairCandidates) {
    candidate.count -= 2;
    const setDecompositions = decomposeSets(counter);
    for (const sets of setDecompositions) {
      if (sets.length === setsNeeded) {
        results.push({ kind: 'standard', pair: candidate.tile, sets: [...meldSets, ...sets] });
      }
    }
    candidate.count += 2;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Seven Pairs (七對) — 7 distinct pairs, fully concealed
// ---------------------------------------------------------------------------

export function checkSevenPairs(context: HandContext): SevenPairsDecomposition | null {
  if (context.melds.length > 0) return null;
  const concealed = context.concealedTiles.filter((t) => t.kind !== 'flower');
  if (concealed.length !== 14) return null;

  const counter = toCounter(concealed);
  const pairs: Tile[] = [];
  for (const entry of counter.values()) {
    if (entry.count !== 2) return null; // any triple/single breaks seven pairs
    pairs.push(entry.tile);
  }
  return pairs.length === 7 ? { kind: 'sevenPairs', pairs } : null;
}

// ---------------------------------------------------------------------------
// Thirteen Orphans (十三么) — one of each terminal/honor, plus one duplicate
// ---------------------------------------------------------------------------

const ORPHAN_TILES: Tile[] = [
  ...([1, 9] as const).flatMap((rank) =>
    (['characters', 'dots', 'bamboo'] as const).map(
      (suit): Tile => ({ kind: 'suit', suit, rank })
    )
  ),
  ...(['east', 'south', 'west', 'north'] as Wind[]).map((w): Tile => ({ kind: 'wind', wind: w })),
  ...(['red', 'green', 'white'] as Dragon[]).map((d): Tile => ({ kind: 'dragon', dragon: d })),
];

export function checkThirteenOrphans(context: HandContext): ThirteenOrphansDecomposition | null {
  if (context.melds.length > 0) return null;
  const concealed = context.concealedTiles.filter((t) => t.kind !== 'flower');
  if (concealed.length !== 14) return null;
  if (!concealed.every(isTerminalOrHonor)) return null;

  const counter = toCounter(concealed);
  if (counter.size !== 13) return null; // must cover exactly the 13 kinds

  const orphanIds = new Set(ORPHAN_TILES.map(tileId));
  let pairTile: Tile | null = null;
  for (const entry of counter.values()) {
    if (!orphanIds.has(tileId(entry.tile))) return null;
    if (entry.count === 2) {
      if (pairTile) return null; // more than one duplicate — invalid
      pairTile = entry.tile;
    } else if (entry.count !== 1) {
      return null;
    }
  }
  return pairTile ? { kind: 'thirteenOrphans', pairTile } : null;
}

// ---------------------------------------------------------------------------

export function findWinningDecompositions(context: HandContext): Decomposition[] {
  const decompositions: Decomposition[] = [...decomposeStandardHand(context)];
  const sevenPairs = checkSevenPairs(context);
  if (sevenPairs) decompositions.push(sevenPairs);
  const thirteenOrphans = checkThirteenOrphans(context);
  if (thirteenOrphans) decompositions.push(thirteenOrphans);
  return decompositions;
}

export function isWinningHand(context: HandContext): boolean {
  return findWinningDecompositions(context).length > 0;
}

/** Re-exported for convenience so callers don't need to import sortTiles separately. */
export { sortTiles };
