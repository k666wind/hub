import { describe, expect, it } from 'vitest';
import { calculateBaseChips, calculateScore, type ChipMode } from '../src/rule-engine/score/scoreCalculator';

describe('calculateBaseChips', () => {
  it('multiplies fan by chips-per-fan for perFan mode', () => {
    const mode: ChipMode = { type: 'perFan', chipsPerFan: 2 };
    expect(calculateBaseChips(5, mode)).toBe(10);
  });

  it('looks up the exact fan in a fixed table', () => {
    const mode: ChipMode = { type: 'fixed', table: { 3: 8, 5: 16, 8: 32 } };
    expect(calculateBaseChips(5, mode)).toBe(16);
  });

  it('falls back to the largest breakpoint at or below the fan', () => {
    const mode: ChipMode = { type: 'fixed', table: { 3: 8, 5: 16, 8: 32 } };
    expect(calculateBaseChips(6, mode)).toBe(16);
    expect(calculateBaseChips(2, mode)).toBe(0);
  });
});

describe('calculateScore', () => {
  it('splits a self-draw win across every opponent', () => {
    const result = calculateScore({
      totalFan: 4,
      chipMode: { type: 'perFan', chipsPerFan: 1 },
      selfDraw: true,
      winnerIsDealer: false,
      discarderIsDealer: false,
      dealerBonus: 2,
      playerCount: 4,
    });
    expect(result.payments).toHaveLength(3);
    expect(result.payments.every((p) => p.amount === 4)).toBe(true);
    expect(result.winnerTotal).toBe(12);
    expect(result.dealerMultiplierApplied).toBe(false);
  });

  it('charges only the discarder on a discard win', () => {
    const result = calculateScore({
      totalFan: 4,
      chipMode: { type: 'perFan', chipsPerFan: 1 },
      selfDraw: false,
      winnerIsDealer: false,
      discarderIsDealer: false,
      dealerBonus: 2,
      playerCount: 4,
    });
    expect(result.payments).toEqual([{ role: 'discarder', amount: 4 }]);
    expect(result.winnerTotal).toBe(4);
  });

  it('doubles payment when the winner is the dealer', () => {
    const result = calculateScore({
      totalFan: 4,
      chipMode: { type: 'perFan', chipsPerFan: 1 },
      selfDraw: true,
      winnerIsDealer: true,
      discarderIsDealer: false,
      dealerBonus: 2,
      playerCount: 4,
    });
    expect(result.dealerMultiplierApplied).toBe(true);
    expect(result.payments.every((p) => p.amount === 8)).toBe(true);
    expect(result.winnerTotal).toBe(24);
  });

  it('doubles payment when the discarder is the dealer', () => {
    const result = calculateScore({
      totalFan: 4,
      chipMode: { type: 'perFan', chipsPerFan: 1 },
      selfDraw: false,
      winnerIsDealer: false,
      discarderIsDealer: true,
      dealerBonus: 2,
      playerCount: 4,
    });
    expect(result.payments).toEqual([{ role: 'discarder', amount: 8 }]);
  });

  it('ignores discarderIsDealer on a self-draw win', () => {
    const result = calculateScore({
      totalFan: 4,
      chipMode: { type: 'perFan', chipsPerFan: 1 },
      selfDraw: true,
      winnerIsDealer: false,
      discarderIsDealer: true,
      dealerBonus: 2,
      playerCount: 3,
    });
    expect(result.dealerMultiplierApplied).toBe(false);
    expect(result.payments.every((p) => p.amount === 4)).toBe(true);
  });
});
