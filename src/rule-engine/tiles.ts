/**
 * Tile model — pure data, no React/IndexedDB here. Every other rule-engine
 * module (winning-hand validation, fan calculation, scoring) builds on this.
 */

export type Suit = 'dots' | 'bamboo' | 'characters';
export type Wind = 'east' | 'south' | 'west' | 'north';
export type Dragon = 'red' | 'green' | 'white';

export interface SuitTile {
  kind: 'suit';
  suit: Suit;
  rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export interface WindTile {
  kind: 'wind';
  wind: Wind;
}

export interface DragonTile {
  kind: 'dragon';
  dragon: Dragon;
}

export interface FlowerTile {
  kind: 'flower';
  /** 1-4 = flowers, 5-8 = seasons, by convention. */
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export type Tile = SuitTile | WindTile | DragonTile | FlowerTile;
export type HonorTile = WindTile | DragonTile;

const SUIT_LABEL: Record<Suit, string> = {
  dots: '筒',
  bamboo: '條',
  characters: '萬',
};

const WIND_LABEL: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

const DRAGON_LABEL: Record<Dragon, string> = {
  red: '中',
  green: '發',
  white: '白',
};

/** Stable, comparable identity for a tile — used for grouping/sorting/equality. */
export function tileId(tile: Tile): string {
  switch (tile.kind) {
    case 'suit':
      return `suit:${tile.suit}:${tile.rank}`;
    case 'wind':
      return `wind:${tile.wind}`;
    case 'dragon':
      return `dragon:${tile.dragon}`;
    case 'flower':
      return `flower:${tile.number}`;
  }
}

export function tileLabel(tile: Tile): string {
  switch (tile.kind) {
    case 'suit':
      return `${tile.rank}${SUIT_LABEL[tile.suit]}`;
    case 'wind':
      return WIND_LABEL[tile.wind];
    case 'dragon':
      return DRAGON_LABEL[tile.dragon];
    case 'flower':
      return `花${tile.number}`;
  }
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return tileId(a) === tileId(b);
}

export function isHonor(tile: Tile): tile is HonorTile {
  return tile.kind === 'wind' || tile.kind === 'dragon';
}

export function isTerminal(tile: Tile): boolean {
  return tile.kind === 'suit' && (tile.rank === 1 || tile.rank === 9);
}

/** Terminal-or-honor — the 13 tile kinds relevant to Thirteen Orphans. */
export function isTerminalOrHonor(tile: Tile): boolean {
  return isHonor(tile) || isTerminal(tile);
}

/** Sort order: characters, dots, bamboo (by rank), then winds, then dragons. */
const SUIT_ORDER: Record<Suit, number> = { characters: 0, dots: 1, bamboo: 2 };
const WIND_ORDER: Record<Wind, number> = { east: 0, south: 1, west: 2, north: 3 };
const DRAGON_ORDER: Record<Dragon, number> = { red: 0, green: 1, white: 2 };

function sortKey(tile: Tile): number {
  switch (tile.kind) {
    case 'suit':
      return SUIT_ORDER[tile.suit] * 10 + tile.rank;
    case 'wind':
      return 100 + WIND_ORDER[tile.wind];
    case 'dragon':
      return 200 + DRAGON_ORDER[tile.dragon];
    case 'flower':
      return 300 + tile.number;
  }
}

export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => sortKey(a) - sortKey(b));
}

export function groupBySuit(tiles: Tile[]): Record<Suit, SuitTile[]> {
  const groups: Record<Suit, SuitTile[]> = { dots: [], bamboo: [], characters: [] };
  for (const tile of tiles) {
    if (tile.kind === 'suit') groups[tile.suit].push(tile);
  }
  return groups;
}

/** Every distinct suit present among suit tiles in the hand (ignores honors/flowers). */
export function suitsUsed(tiles: Tile[]): Suit[] {
  const set = new Set<Suit>();
  for (const tile of tiles) if (tile.kind === 'suit') set.add(tile.suit);
  return [...set];
}

// --- Convenience constructors, mainly for tests and future UI wiring -------

export function suit(s: Suit, rank: SuitTile['rank']): SuitTile {
  return { kind: 'suit', suit: s, rank };
}
export function wind(w: Wind): WindTile {
  return { kind: 'wind', wind: w };
}
export function dragon(d: Dragon): DragonTile {
  return { kind: 'dragon', dragon: d };
}
export function flower(n: FlowerTile['number']): FlowerTile {
  return { kind: 'flower', number: n };
}
