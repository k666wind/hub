import { suitsUsed } from '../tiles';
import type { HandContext } from '../hand';
import {
  findWinningDecompositions,
  type CompletedSet,
  type Decomposition,
  type StandardDecomposition,
} from '../patterns/winningHand';
import type { RuleProfileRules } from '../profiles';

export interface FanResult {
  label: string;
  fan: number;
  awarded: boolean;
  reason: string;
}

export interface FanCalculationResult {
  decomposition: Decomposition;
  breakdown: FanResult[];
  /** Sum of every awarded entry in `breakdown`, before any limit-hand override. */
  rawFan: number;
  /** Final fan used for scoring — equals `rawFan` unless a limit hand applies. */
  totalFan: number;
  isLimitHand: boolean;
  isChickenHand: boolean;
  /** False when rawFan is below the profile's minFan and Chicken Hand is off. */
  meetsMinimum: boolean;
}

/**
 * Canonical fan values used by this engine for the named patterns. Hong
 * Kong Mahjong house rules vary a lot on exact numbers — these are the
 * common defaults; adjust here if your table plays differently. Values that
 * come from the rule *profile* itself (self-draw bonus, min/max fan) are
 * read from `RuleProfileRules` instead of hardcoded here.
 */
const FAN_VALUES = {
  concealedHand: 1,
  allPongs: 3,
  mixedOneSuit: 3,
  pureOneSuit: 7,
  smallDragons: 5,
  bigDragons: 8,
  smallWinds: 6,
  bigWinds: 10,
  sevenPairs: 4,
} as const;

function isDragonSet(set: CompletedSet): boolean {
  return set.tiles[0]?.kind === 'dragon';
}
function isWindSet(set: CompletedSet): boolean {
  return set.tiles[0]?.kind === 'wind';
}
function isTripletLike(set: CompletedSet): boolean {
  return set.type === 'pong' || set.type === 'kong';
}

function allTilesOf(decomposition: StandardDecomposition) {
  return [decomposition.pair, ...decomposition.sets.flatMap((s) => s.tiles)];
}

function evaluateStandard(
  context: HandContext,
  decomposition: StandardDecomposition,
  rules: RuleProfileRules
): FanResult[] {
  const results: FanResult[] = [];
  const sets = decomposition.sets;

  // --- Self Draw (自摸) ------------------------------------------------
  results.push({
    label: '自摸',
    fan: rules.selfDrawBonus,
    awarded: context.selfDraw,
    reason: context.selfDraw ? '自己摸番食糊' : '呢舖係食糊（打出），唔係自摸',
  });

  // --- Concealed Hand (門前清) ------------------------------------------
  const fullyConcealed = context.melds.every((m) => m.concealed);
  results.push({
    label: '門前清',
    fan: FAN_VALUES.concealedHand,
    awarded: fullyConcealed,
    reason: fullyConcealed ? '成手牌都冇上枱（食糊嗰隻除外）' : '手牌有明副露（碰／上），唔算門前清',
  });

  // --- All Pongs (碰碰胡) ------------------------------------------------
  const allTriplets = sets.every(isTripletLike);
  results.push({
    label: '碰碰胡',
    fan: FAN_VALUES.allPongs,
    awarded: rules.allPongs && allTriplets,
    reason: !allTriplets
      ? '手牌入面有順子，唔係全部刻子'
      : rules.allPongs
        ? '四組都係刻子（碰／杠）'
        : '呢個規則庫冇開放碰碰胡',
  });

  // --- One Suit family (一色) --------------------------------------------
  const tiles = allTilesOf(decomposition);
  const suits = suitsUsed(tiles);
  const hasHonors = tiles.some((t) => t.kind === 'wind' || t.kind === 'dragon');

  if (suits.length > 1) {
    results.push({
      label: '清一色',
      fan: FAN_VALUES.pureOneSuit,
      awarded: false,
      reason: '手牌用咗多過一種花色',
    });
    results.push({
      label: '混一色',
      fan: FAN_VALUES.mixedOneSuit,
      awarded: false,
      reason: '手牌用咗多過一種花色',
    });
  } else if (suits.length === 1) {
    const pureQualifies = !hasHonors;
    results.push({
      label: '清一色',
      fan: FAN_VALUES.pureOneSuit,
      awarded: rules.pureOneSuit && pureQualifies,
      reason: !pureQualifies
        ? '手牌有字牌（風／三元牌），唔係清一色'
        : rules.pureOneSuit
          ? '成手牌淨係一種花色，冇字牌'
          : '呢個規則庫冇開放清一色',
    });
    results.push({
      label: '混一色',
      fan: FAN_VALUES.mixedOneSuit,
      awarded: rules.mixedOneSuit && hasHonors,
      reason: !hasHonors
        ? '手牌冇字牌，已經算清一色喇'
        : rules.mixedOneSuit
          ? '一種花色加埋字牌'
          : '呢個規則庫冇開放混一色',
    });
  }
  // suits.length === 0 (all-honor hand) — one-suit family doesn't apply; skip.

  // --- Dragons (三元牌) ---------------------------------------------------
  const dragonTriplets = sets.filter((s) => isDragonSet(s) && isTripletLike(s)).length;
  const pairIsDragon = decomposition.pair.kind === 'dragon';
  if (dragonTriplets >= 2) {
    if (dragonTriplets === 3) {
      results.push({
        label: '大三元',
        fan: FAN_VALUES.bigDragons,
        awarded: rules.bigDragons,
        reason: rules.bigDragons ? '三隻三元牌都刻齊' : '呢個規則庫冇開放大三元',
      });
    } else {
      results.push({
        label: '小三元',
        fan: FAN_VALUES.smallDragons,
        awarded: rules.smallDragons && pairIsDragon,
        reason: !pairIsDragon
          ? '兩組三元刻子，但將眼唔係第三隻三元牌'
          : rules.smallDragons
            ? '兩組三元刻子加第三隻三元牌做將眼'
            : '呢個規則庫冇開放小三元',
      });
    }
  }

  // --- Winds (風牌) -------------------------------------------------------
  const windTriplets = sets.filter((s) => isWindSet(s) && isTripletLike(s)).length;
  const pairIsWind = decomposition.pair.kind === 'wind';
  if (windTriplets >= 2) {
    if (windTriplets === 4) {
      results.push({
        label: '大四喜',
        fan: FAN_VALUES.bigWinds,
        awarded: rules.bigWinds,
        reason: rules.bigWinds ? '四隻風牌都刻齊' : '呢個規則庫冇開放大四喜',
      });
    } else if (windTriplets === 3) {
      results.push({
        label: '小四喜',
        fan: FAN_VALUES.smallWinds,
        awarded: rules.smallWinds && pairIsWind,
        reason: !pairIsWind
          ? '三組風牌刻子，但將眼唔係第四隻風牌'
          : rules.smallWinds
            ? '三組風牌刻子加第四隻風牌做將眼'
            : '呢個規則庫冇開放小四喜',
      });
    }
  }

  return results;
}

function evaluateOne(
  context: HandContext,
  decomposition: Decomposition,
  rules: RuleProfileRules
): FanCalculationResult | null {
  let breakdown: FanResult[];
  let isLimitHand = false;

  if (decomposition.kind === 'standard') {
    breakdown = evaluateStandard(context, decomposition, rules);
  } else if (decomposition.kind === 'sevenPairs') {
    if (!rules.sevenPairs) return null;
    breakdown = [
      { label: '七對', fan: FAN_VALUES.sevenPairs, awarded: true, reason: '七組唔同嘅對子' },
    ];
  } else {
    // thirteenOrphans
    if (!rules.thirteenOrphans) return null;
    breakdown = [{ label: '十三么', fan: rules.maxFan, awarded: true, reason: '十三隻么九字牌齊晒' }];
    isLimitHand = rules.limitHands;
  }

  const rawFan = breakdown.filter((r) => r.awarded).reduce((sum, r) => sum + r.fan, 0);

  const bigLimitAwarded = breakdown.some(
    (r) => r.awarded && (r.label === '大三元' || r.label === '大四喜')
  );
  if (bigLimitAwarded && rules.limitHands) isLimitHand = true;

  const totalFan = isLimitHand ? rules.maxFan : Math.min(rawFan, rules.maxFan);
  const isChickenHand = rawFan < rules.minFan && rules.chickenHandEnabled;
  const meetsMinimum = rawFan >= rules.minFan || isChickenHand;

  return {
    decomposition,
    breakdown,
    rawFan,
    totalFan: isChickenHand && rawFan < rules.minFan ? rawFan : totalFan,
    isLimitHand,
    isChickenHand,
    meetsMinimum,
  };
}

/**
 * Calculates fan for the best-scoring valid decomposition of the hand. Picks
 * whichever decomposition (there can be several ways to read the same
 * tiles) yields the highest fan — that's the one a real player would claim.
 * Returns null if the tiles don't form any winning hand recognised by this
 * rule profile.
 */
export function calculateFan(
  context: HandContext,
  rules: RuleProfileRules
): FanCalculationResult | null {
  const decompositions = findWinningDecompositions(context);
  if (decompositions.length === 0) return null;

  let best: FanCalculationResult | null = null;
  for (const decomposition of decompositions) {
    const result = evaluateOne(context, decomposition, rules);
    if (!result) continue;
    if (!best || result.totalFan > best.totalFan) best = result;
  }
  return best;
}
