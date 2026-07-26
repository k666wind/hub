/**
 * Turns a total fan count into chip payments (spec §5.8). This module is as
 * deterministic as the fan calculator — no randomness, no AI.
 *
 * Payment assumptions (house rules vary — these are the common Hong Kong
 * defaults and are the only place you need to change them):
 *  - Self-draw (自摸): every other player at the table pays the winner.
 *  - Discard win (出銃): only the discarder pays.
 *  - Dealer bonus (`dealerBonus` from the rule profile) is a payment
 *    *multiplier* applied whenever the dealer is the winner OR the dealer is
 *    the discarder — i.e. whenever the dealer's seat is involved in the
 *    payment. A profile with `dealerBonus: 1` effectively disables it.
 */

export type ChipMode =
  | { type: 'perFan'; chipsPerFan: number }
  | { type: 'fixed' | 'custom'; table: Record<number, number> };

export interface ScoreInput {
  totalFan: number;
  chipMode: ChipMode;
  selfDraw: boolean;
  winnerIsDealer: boolean;
  /** Ignored when `selfDraw` is true. */
  discarderIsDealer: boolean;
  /** From `RuleProfileRules.dealerBonus`. */
  dealerBonus: number;
  playerCount: 2 | 3 | 4;
}

export interface ScorePayment {
  role: 'discarder' | 'opponent';
  amount: number;
}

export interface ScoreResult {
  baseChips: number;
  dealerMultiplierApplied: boolean;
  payments: ScorePayment[];
  winnerTotal: number;
}

/**
 * Chips per fan for `fixed`/`custom` modes: the table is keyed by fan count
 * and we look up the largest key ≤ the hand's fan (so you don't have to
 * enumerate every possible fan value, just the breakpoints).
 */
export function calculateBaseChips(fan: number, chipMode: ChipMode): number {
  if (chipMode.type === 'perFan') return fan * chipMode.chipsPerFan;

  const table = chipMode.table;
  if (table[fan] != null) return table[fan];
  const applicableKeys = Object.keys(table)
    .map(Number)
    .filter((k) => k <= fan)
    .sort((a, b) => b - a);
  return applicableKeys.length ? table[applicableKeys[0]] : 0;
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const baseChips = calculateBaseChips(input.totalFan, input.chipMode);
  const dealerInvolved = input.selfDraw
    ? input.winnerIsDealer
    : input.winnerIsDealer || input.discarderIsDealer;
  const multiplier = dealerInvolved ? input.dealerBonus : 1;
  const perPayment = baseChips * multiplier;

  if (input.selfDraw) {
    const opponentCount = input.playerCount - 1;
    const payments: ScorePayment[] = Array.from({ length: opponentCount }, () => ({
      role: 'opponent',
      amount: perPayment,
    }));
    return {
      baseChips,
      dealerMultiplierApplied: dealerInvolved,
      payments,
      winnerTotal: perPayment * opponentCount,
    };
  }

  return {
    baseChips,
    dealerMultiplierApplied: dealerInvolved,
    payments: [{ role: 'discarder', amount: perPayment }],
    winnerTotal: perPayment,
  };
}
