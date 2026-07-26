import { describe, expect, it } from 'vitest';
import { dragon, suit, wind, type Tile } from '../src/rule-engine/tiles';
import type { HandContext, Meld } from '../src/rule-engine/hand';
import {
  checkSevenPairs,
  checkThirteenOrphans,
  decomposeStandardHand,
  isWinningHand,
} from '../src/rule-engine/patterns/winningHand';

function context(concealedTiles: Tile[], melds: Meld[] = []): HandContext {
  return {
    concealedTiles,
    melds,
    winningTile: concealedTiles[concealedTiles.length - 1],
    selfDraw: false,
    seatWind: 'east',
    roundWind: 'east',
    flowers: [],
  };
}

describe('decomposeStandardHand', () => {
  it('finds the 3-chow + 1-pong + pair decomposition of a clean hand', () => {
    const tiles: Tile[] = [
      suit('characters', 1), suit('characters', 2), suit('characters', 3),
      suit('characters', 4), suit('characters', 5), suit('characters', 6),
      suit('characters', 7), suit('characters', 8), suit('characters', 9),
      suit('bamboo', 1), suit('bamboo', 1), suit('bamboo', 1),
      suit('dots', 9), suit('dots', 9),
    ];
    const results = decomposeStandardHand(context(tiles));
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.sets.length === 4 && r.pair.kind === 'suit' && r.pair.suit === 'dots')).toBe(true);
  });

  it('accounts for tiles already locked into an exposed meld', () => {
    const meld: Meld = { type: 'pong', tiles: [wind('east'), wind('east'), wind('east')], concealed: false };
    const concealed: Tile[] = [
      suit('characters', 1), suit('characters', 2), suit('characters', 3),
      suit('characters', 4), suit('characters', 5), suit('characters', 6),
      suit('characters', 7), suit('characters', 8), suit('characters', 9),
      suit('dots', 9), suit('dots', 9),
    ];
    const results = decomposeStandardHand(context(concealed, [meld]));
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sets).toHaveLength(4);
  });

  it('returns no decomposition for tiles that cannot form sets', () => {
    const tiles: Tile[] = [
      suit('characters', 1), suit('characters', 2), suit('characters', 4),
      suit('characters', 5), suit('characters', 7), suit('bamboo', 9),
      suit('dots', 3), suit('dots', 6), wind('east'), wind('south'),
      dragon('red'), dragon('green'), suit('dots', 1), suit('dots', 2),
    ];
    expect(decomposeStandardHand(context(tiles))).toEqual([]);
  });
});

describe('checkSevenPairs', () => {
  it('recognises seven distinct pairs that cannot form runs/triplets', () => {
    const tiles: Tile[] = [
      suit('characters', 1), suit('characters', 1),
      suit('characters', 9), suit('characters', 9),
      suit('dots', 1), suit('dots', 1),
      suit('dots', 9), suit('dots', 9),
      suit('bamboo', 1), suit('bamboo', 1),
      wind('east'), wind('east'),
      dragon('red'), dragon('red'),
    ];
    const result = checkSevenPairs(context(tiles));
    expect(result?.pairs).toHaveLength(7);
  });

  it('rejects a hand with melds (seven pairs must be fully concealed)', () => {
    const meld: Meld = { type: 'pong', tiles: [wind('east'), wind('east'), wind('east')], concealed: false };
    const tiles: Tile[] = Array.from({ length: 11 }, (_, i) => suit('dots', ((i % 9) + 1) as never));
    expect(checkSevenPairs(context(tiles, [meld]))).toBeNull();
  });

  it('rejects four-of-a-kind counted as two pairs', () => {
    const tiles: Tile[] = [
      suit('characters', 1), suit('characters', 1), suit('characters', 1), suit('characters', 1),
      suit('dots', 1), suit('dots', 1),
      suit('dots', 9), suit('dots', 9),
      suit('bamboo', 1), suit('bamboo', 1),
      wind('east'), wind('east'),
      dragon('red'), dragon('red'),
    ];
    expect(checkSevenPairs(context(tiles))).toBeNull();
  });
});

describe('checkThirteenOrphans', () => {
  it('recognises the thirteen terminal/honor tiles plus one duplicate', () => {
    const tiles: Tile[] = [
      suit('characters', 1), suit('characters', 9),
      suit('dots', 1), suit('dots', 9),
      suit('bamboo', 1), suit('bamboo', 9),
      wind('east'), wind('south'), wind('west'), wind('north'),
      dragon('red'), dragon('green'), dragon('white'),
      suit('characters', 1), // duplicate
    ];
    const result = checkThirteenOrphans(context(tiles));
    expect(result?.pairTile.kind).toBe('suit');
  });

  it('rejects a hand missing one of the thirteen required kinds', () => {
    const tiles: Tile[] = [
      suit('characters', 1), suit('characters', 9),
      suit('dots', 1), suit('dots', 9),
      suit('bamboo', 1), suit('bamboo', 9),
      wind('east'), wind('south'), wind('west'), wind('north'),
      dragon('red'), dragon('green'), dragon('green'), // white missing, green duplicated
      suit('characters', 1),
    ];
    expect(checkThirteenOrphans(context(tiles))).toBeNull();
  });
});

describe('isWinningHand', () => {
  it('is false for a random non-winning hand', () => {
    const tiles: Tile[] = [
      suit('characters', 1), suit('characters', 2), suit('characters', 4),
      suit('characters', 5), suit('characters', 7), suit('bamboo', 9),
      suit('dots', 3), suit('dots', 6), wind('east'), wind('south'),
      dragon('red'), dragon('green'), suit('dots', 1), suit('dots', 2),
    ];
    expect(isWinningHand(context(tiles))).toBe(false);
  });
});
