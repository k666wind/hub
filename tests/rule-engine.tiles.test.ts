import { describe, expect, it } from 'vitest';
import { dragon, flower, isTerminalOrHonor, sortTiles, suit, suitsUsed, tileId, tileLabel, tilesEqual, wind } from '../src/rule-engine/tiles';

describe('rule-engine/tiles', () => {
  it('gives identical ids/labels for the same tile constructed twice', () => {
    const a = suit('dots', 5);
    const b = suit('dots', 5);
    expect(tilesEqual(a, b)).toBe(true);
    expect(tileId(a)).toBe(tileId(b));
    expect(tileLabel(a)).toBe('5筒');
  });

  it('labels honors correctly', () => {
    expect(tileLabel(wind('east'))).toBe('東');
    expect(tileLabel(dragon('red'))).toBe('中');
    expect(tileLabel(flower(3))).toBe('花3');
  });

  it('sorts characters, dots, bamboo, winds, dragons in order', () => {
    const tiles = [wind('north'), dragon('red'), suit('bamboo', 2), suit('characters', 9), suit('dots', 1)];
    const sorted = sortTiles(tiles).map(tileLabel);
    expect(sorted).toEqual(['9萬', '1筒', '2條', '北', '中']);
  });

  it('identifies terminal-or-honor tiles for Thirteen Orphans', () => {
    expect(isTerminalOrHonor(suit('dots', 1))).toBe(true);
    expect(isTerminalOrHonor(suit('dots', 5))).toBe(false);
    expect(isTerminalOrHonor(wind('south'))).toBe(true);
    expect(isTerminalOrHonor(dragon('white'))).toBe(true);
  });

  it('collects distinct suits used, ignoring honors', () => {
    const tiles = [suit('dots', 1), suit('dots', 2), wind('east'), dragon('red')];
    expect(suitsUsed(tiles)).toEqual(['dots']);
  });
});
