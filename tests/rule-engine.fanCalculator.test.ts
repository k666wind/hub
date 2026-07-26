import { describe, expect, it } from 'vitest';
import { dragon, suit, wind, type Tile } from '../src/rule-engine/tiles';
import type { HandContext, Meld } from '../src/rule-engine/hand';
import { calculateFan } from '../src/rule-engine/fan/fanCalculator';
import type { RuleProfileRules } from '../src/rule-engine/profiles';

const fullRules: RuleProfileRules = {
  minFan: 3,
  maxFan: 13,
  flowerTilesEnabled: true,
  chickenHandEnabled: false,
  dealerBonus: 2,
  selfDrawBonus: 1,
  limitHands: true,
  sevenPairs: true,
  thirteenOrphans: true,
  allPongs: true,
  mixedOneSuit: true,
  pureOneSuit: true,
  smallDragons: true,
  bigDragons: true,
  smallWinds: true,
  bigWinds: true,
};

function context(overrides: Partial<HandContext> & { concealedTiles: Tile[] }): HandContext {
  return {
    melds: [],
    winningTile: overrides.concealedTiles[overrides.concealedTiles.length - 1],
    selfDraw: false,
    seatWind: 'east',
    roundWind: 'east',
    flowers: [],
    ...overrides,
  };
}

function label(result: ReturnType<typeof calculateFan>, name: string) {
  return result?.breakdown.find((r) => r.label === name);
}

describe('calculateFan', () => {
  it('returns null for a hand that is not a winning shape', () => {
    const ctx = context({
      concealedTiles: [
        suit('characters', 1), suit('characters', 2), suit('characters', 4),
        suit('characters', 5), suit('characters', 7), suit('bamboo', 9),
        suit('dots', 3), suit('dots', 6), wind('east'), wind('south'),
        dragon('red'), dragon('green'), suit('dots', 1), suit('dots', 2),
      ],
    });
    expect(calculateFan(ctx, fullRules)).toBeNull();
  });

  it('awards Self Draw and All Pongs, and reports one-suit patterns as not awarded (mixed suits)', () => {
    const ctx = context({
      selfDraw: true,
      concealedTiles: [
        suit('characters', 1), suit('characters', 1), suit('characters', 1),
        suit('dots', 5), suit('dots', 5), suit('dots', 5),
        wind('east'), wind('east'), wind('east'),
        dragon('red'), dragon('red'), dragon('red'),
        suit('bamboo', 9), suit('bamboo', 9),
      ],
    });
    const result = calculateFan(ctx, fullRules);
    expect(result).not.toBeNull();
    expect(label(result, '自摸')?.awarded).toBe(true);
    expect(label(result, '碰碰胡')?.awarded).toBe(true);
    expect(label(result, '清一色')?.awarded).toBe(false);
    expect(label(result, '清一色')?.reason).toContain('多過一種花色');
  });

  it('awards Pure One Suit for a single-suit, all-pong hand with no honors', () => {
    const ctx = context({
      concealedTiles: [
        suit('dots', 1), suit('dots', 1), suit('dots', 1),
        suit('dots', 4), suit('dots', 4), suit('dots', 4),
        suit('dots', 5), suit('dots', 5), suit('dots', 5),
        suit('dots', 7), suit('dots', 7), suit('dots', 7),
        suit('dots', 9), suit('dots', 9),
      ],
    });
    const result = calculateFan(ctx, fullRules);
    expect(label(result, '清一色')?.awarded).toBe(true);
    expect(label(result, '混一色')?.awarded).toBe(false);
  });

  it('awards Mixed One Suit when one suit is combined with honor triplets', () => {
    const ctx = context({
      concealedTiles: [
        suit('dots', 1), suit('dots', 1), suit('dots', 1),
        suit('dots', 4), suit('dots', 4), suit('dots', 4),
        suit('dots', 7), suit('dots', 7), suit('dots', 7),
        wind('east'), wind('east'), wind('east'),
        suit('dots', 9), suit('dots', 9),
      ],
    });
    const result = calculateFan(ctx, fullRules);
    expect(label(result, '混一色')?.awarded).toBe(true);
    expect(label(result, '清一色')?.awarded).toBe(false);
  });

  it('awards Small Dragons for two dragon triplets plus a dragon pair', () => {
    const ctx = context({
      concealedTiles: [
        suit('characters', 1), suit('characters', 2), suit('characters', 3),
        suit('characters', 4), suit('characters', 5), suit('characters', 6),
        dragon('red'), dragon('red'), dragon('red'),
        dragon('green'), dragon('green'), dragon('green'),
        dragon('white'), dragon('white'),
      ],
    });
    const result = calculateFan(ctx, fullRules);
    expect(label(result, '小三元')?.awarded).toBe(true);
  });

  it('awards Big Dragons as a limit hand', () => {
    const ctx = context({
      concealedTiles: [
        dragon('red'), dragon('red'), dragon('red'),
        dragon('green'), dragon('green'), dragon('green'),
        dragon('white'), dragon('white'), dragon('white'),
        suit('characters', 1), suit('characters', 1), suit('characters', 1),
        suit('bamboo', 9), suit('bamboo', 9),
      ],
    });
    const result = calculateFan(ctx, fullRules);
    expect(label(result, '大三元')?.awarded).toBe(true);
    expect(result?.isLimitHand).toBe(true);
    expect(result?.totalFan).toBe(fullRules.maxFan);
  });

  it('scores Thirteen Orphans as a limit hand', () => {
    const ctx = context({
      concealedTiles: [
        suit('characters', 1), suit('characters', 9),
        suit('dots', 1), suit('dots', 9),
        suit('bamboo', 1), suit('bamboo', 9),
        wind('east'), wind('south'), wind('west'), wind('north'),
        dragon('red'), dragon('green'), dragon('white'),
        suit('characters', 1),
      ],
    });
    const result = calculateFan(ctx, fullRules);
    expect(result?.decomposition.kind).toBe('thirteenOrphans');
    expect(result?.isLimitHand).toBe(true);
    expect(result?.totalFan).toBe(fullRules.maxFan);
  });

  it('is a Chicken Hand when raw fan is below minFan and the profile allows it', () => {
    const meld: Meld = { type: 'chow', tiles: [suit('characters', 1), suit('characters', 2), suit('characters', 3)], concealed: false };
    const ctx = context({
      melds: [meld],
      concealedTiles: [
        suit('characters', 4), suit('characters', 5), suit('characters', 6),
        suit('characters', 7), suit('characters', 8), suit('characters', 9),
        suit('dots', 1), suit('dots', 2), suit('dots', 3),
        suit('bamboo', 9), suit('bamboo', 9),
      ],
    });
    const chickenRules: RuleProfileRules = { ...fullRules, minFan: 3, chickenHandEnabled: true };
    const result = calculateFan(ctx, chickenRules);
    expect(result?.rawFan).toBeLessThan(chickenRules.minFan);
    expect(result?.isChickenHand).toBe(true);
    expect(result?.meetsMinimum).toBe(true);
  });

  it('does not meet the minimum when raw fan is too low and Chicken Hand is disabled', () => {
    const meld: Meld = { type: 'chow', tiles: [suit('characters', 1), suit('characters', 2), suit('characters', 3)], concealed: false };
    const ctx = context({
      melds: [meld],
      concealedTiles: [
        suit('characters', 4), suit('characters', 5), suit('characters', 6),
        suit('characters', 7), suit('characters', 8), suit('characters', 9),
        suit('dots', 1), suit('dots', 2), suit('dots', 3),
        suit('bamboo', 9), suit('bamboo', 9),
      ],
    });
    const strictRules: RuleProfileRules = { ...fullRules, minFan: 3, chickenHandEnabled: false };
    const result = calculateFan(ctx, strictRules);
    expect(result?.meetsMinimum).toBe(false);
  });
});
