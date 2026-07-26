import { getAll, getDB, put, remove, type Game, type GameStateSnapshot, type Hand } from '../storage/indexeddb/db';
import type { RuleProfile } from '../storage/indexeddb/db';
import type { Tile, Wind } from '../rule-engine/tiles';
import type { HandContext, Meld } from '../rule-engine/hand';
import { calculateFan, type FanCalculationResult } from '../rule-engine/fan/fanCalculator';
import { calculateScore, type ChipMode } from '../rule-engine/score/scoreCalculator';
import { recomputeStatisticsForPlayer } from './statisticsService';

/**
 * Winds actually in play for a given table size. Hong Kong Mahjong is
 * normally 4-player; 2/3-player variants exist but house rules on which
 * winds get used vary. This engine picks the simplest consistent scheme —
 * change here if your table plays a different convention.
 */
const WINDS_BY_COUNT: Record<2 | 3 | 4, Wind[]> = {
  2: ['east', 'west'],
  3: ['east', 'south', 'west'],
  4: ['east', 'south', 'west', 'north'],
};
const ROUND_WIND_ORDER: Wind[] = ['east', 'south', 'west', 'north'];

function seatWindsFor(playerIds: string[], dealerSeatIndex: number): Record<string, Wind> {
  const n = playerIds.length as 2 | 3 | 4;
  const winds = WINDS_BY_COUNT[n];
  const map: Record<string, Wind> = {};
  playerIds.forEach((id, i) => {
    map[id] = winds[(i - dealerSeatIndex + n) % n];
  });
  return map;
}

export async function listGames(): Promise<Game[]> {
  const games = await getAll('games');
  return [...games].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getActiveGame(): Promise<Game | undefined> {
  const db = await getDB();
  const games = await db.getAllFromIndex('games', 'by-status', 'active');
  return games[0];
}

export async function createGame(input: {
  playerIds: string[];
  ruleProfileId: string;
  chipMode: ChipMode;
}): Promise<Game> {
  const { playerIds, ruleProfileId, chipMode } = input;
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error('香港麻雀支援 2 至 4 人');
  }
  const dealerSeatIndex = 0;
  const game: Game = {
    id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    playerCount: playerIds.length as 2 | 3 | 4,
    playerIds,
    ruleProfileId,
    chipMode,
    status: 'active',
    dealerSeatIndex,
    roundWindIndex: 0,
    seatWinds: seatWindsFor(playerIds, dealerSeatIndex),
    scores: Object.fromEntries(playerIds.map((id) => [id, 0])),
    handNumber: 1,
  };
  await put('games', game);
  return game;
}

export async function endGame(gameId: string): Promise<void> {
  const games = await getAll('games');
  const game = games.find((g) => g.id === gameId);
  if (!game) throw new Error(`Game not found: ${gameId}`);
  await put('games', { ...game, status: 'finished', finishedAt: Date.now() });
}

function snapshot(game: Game): GameStateSnapshot {
  return {
    dealerSeatIndex: game.dealerSeatIndex,
    roundWindIndex: game.roundWindIndex,
    scores: { ...game.scores },
    handNumber: game.handNumber,
  };
}

export interface RecordWinInput {
  game: Game;
  ruleProfile: RuleProfile;
  winnerId: string;
  selfDraw: boolean;
  /** Required when `selfDraw` is false. */
  discarderId: string | null;
  tiles: Tile[];
  /** Already-declared exposed/concealed pong/chow/kong sets. Empty means a fully concealed hand. */
  melds: Meld[];
}

export interface RecordWinResult {
  hand: Hand;
  game: Game;
  fanResult: FanCalculationResult;
}

/**
 * Scores one completed hand: runs the Rule Engine, applies chip payments to
 * the live scoreboard, rotates the dealer/round wind, and persists both the
 * updated Game and a new Hand record (with a pre-hand snapshot so this can
 * be undone). Throws if the tiles don't form a valid, rule-satisfying win —
 * the UI should surface `calculateFan`'s null/meetsMinimum cases before
 * calling this so the person can fix the tile entry instead of hitting an
 * exception.
 */
export async function recordWin(input: RecordWinInput): Promise<RecordWinResult> {
  const { game, ruleProfile, winnerId, selfDraw, discarderId, tiles, melds } = input;

  const context: HandContext = {
    concealedTiles: tiles,
    melds,
    winningTile: tiles[tiles.length - 1],
    selfDraw,
    seatWind: game.seatWinds[winnerId],
    roundWind: ROUND_WIND_ORDER[game.roundWindIndex],
    flowers: [],
  };

  const fanResult = calculateFan(context, ruleProfile.rules);
  if (!fanResult) throw new Error('呢舖牌唔係有效嘅胡牌牌型');
  if (!fanResult.meetsMinimum) throw new Error('番數未夠呢個規則庫嘅最低番數，又冇開雞胡');

  const scoreResult = calculateScore({
    totalFan: fanResult.totalFan,
    chipMode: game.chipMode,
    selfDraw,
    winnerIsDealer: winnerId === game.playerIds[game.dealerSeatIndex],
    discarderIsDealer: discarderId === game.playerIds[game.dealerSeatIndex],
    dealerBonus: ruleProfile.rules.dealerBonus,
    playerCount: game.playerCount,
  });

  const before = snapshot(game);
  const scores = { ...game.scores };
  scores[winnerId] = (scores[winnerId] ?? 0) + scoreResult.winnerTotal;

  if (selfDraw) {
    const opponents = game.playerIds.filter((id) => id !== winnerId);
    opponents.forEach((id, i) => {
      scores[id] = (scores[id] ?? 0) - scoreResult.payments[i].amount;
    });
  } else if (discarderId) {
    scores[discarderId] = (scores[discarderId] ?? 0) - scoreResult.payments[0].amount;
  }

  // Dealer rotation (連莊 if the dealer wins, otherwise it passes on).
  const dealerWon = winnerId === game.playerIds[game.dealerSeatIndex];
  let dealerSeatIndex = game.dealerSeatIndex;
  let roundWindIndex = game.roundWindIndex;
  if (!dealerWon) {
    dealerSeatIndex = (dealerSeatIndex + 1) % game.playerIds.length;
    if (dealerSeatIndex === 0) {
      roundWindIndex = (roundWindIndex + 1) % ROUND_WIND_ORDER.length;
    }
  }

  const updatedGame: Game = {
    ...game,
    scores,
    dealerSeatIndex,
    roundWindIndex,
    seatWinds: seatWindsFor(game.playerIds, dealerSeatIndex),
    handNumber: game.handNumber + 1,
  };

  const hand: Hand = {
    id: `hand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameId: game.id,
    timestamp: Date.now(),
    winnerId,
    selfDraw,
    discarderId: selfDraw ? null : discarderId,
    tiles: tiles.map((t) => JSON.stringify(t)),
    melds: melds.map((m) => JSON.stringify(m)),
    fanBreakdown: fanResult.breakdown,
    totalFan: fanResult.totalFan,
    score: scoreResult.winnerTotal,
    gameStateBefore: before,
  };

  await put('games', updatedGame);
  await put('hands', hand);

  for (const playerId of game.playerIds) {
    await recomputeStatisticsForPlayer(playerId);
  }

  return { hand, game: updatedGame, fanResult };
}

/** Undo the most recent hand of a game (spec §5.11) — restores dealer,
 * round wind, and scores to what they were right before that hand. */
export async function undoLastHand(gameId: string): Promise<Game> {
  const [games, hands] = await Promise.all([getAll('games'), getAll('hands')]);
  const game = games.find((g) => g.id === gameId);
  if (!game) throw new Error(`Game not found: ${gameId}`);

  const gameHands = hands.filter((h) => h.gameId === gameId).sort((a, b) => b.timestamp - a.timestamp);
  const lastHand = gameHands[0];
  if (!lastHand) throw new Error('冇嘢可以復原');

  const restoredGame: Game = {
    ...game,
    dealerSeatIndex: lastHand.gameStateBefore.dealerSeatIndex,
    roundWindIndex: lastHand.gameStateBefore.roundWindIndex,
    scores: lastHand.gameStateBefore.scores,
    handNumber: lastHand.gameStateBefore.handNumber,
    seatWinds: seatWindsFor(game.playerIds, lastHand.gameStateBefore.dealerSeatIndex),
  };

  await put('games', restoredGame);
  await remove('hands', lastHand.id);

  for (const playerId of game.playerIds) {
    await recomputeStatisticsForPlayer(playerId);
  }

  return restoredGame;
}

export async function listHandsForGame(gameId: string): Promise<Hand[]> {
  const db = await getDB();
  const hands = await db.getAllFromIndex('hands', 'by-game', gameId);
  return hands.sort((a, b) => b.timestamp - a.timestamp);
}

export async function listAllHands(): Promise<Hand[]> {
  const hands = await getAll('hands');
  return [...hands].sort((a, b) => b.timestamp - a.timestamp);
}
