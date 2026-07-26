import type { Tile, Wind } from './tiles';

export type MeldType = 'chow' | 'pong' | 'kong';

/**
 * A declared set of 3 (chow/pong) or 4 (kong) identical/sequential tiles.
 * `concealed` matters for the 門前清 (concealed hand) fan and for scoring —
 * a concealed kong is still "concealed" even though it's exposed on the
 * table, so it's tracked separately from pong/chow exposure.
 */
export interface Meld {
  type: MeldType;
  tiles: Tile[];
  concealed: boolean;
}

/**
 * Everything the Rule Engine needs to score one completed hand. Built by the
 * game-management layer (Phase 3) from the live scoreboard state — this
 * module never reads IndexedDB or React state directly.
 */
export interface HandContext {
  /** Tiles still in hand (not yet melded), including the winning tile. */
  concealedTiles: Tile[];
  /** Sets already declared (chow/pong/kong), concealed or exposed. */
  melds: Meld[];
  winningTile: Tile;
  selfDraw: boolean;
  seatWind: Wind;
  roundWind: Wind;
  /** Flower/season tiles set aside — they never take part in the hand shape. */
  flowers: Tile[];
}
