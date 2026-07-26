import { getAll, put, type StatisticsSnapshot } from '../storage/indexeddb/db';

/**
 * Recomputes one player's statistics snapshot from scratch by scanning all
 * games/hands. Simple and always-correct rather than incremental — fine at
 * the scale a local offline app deals with, and it means undo (spec §5.11)
 * never has to separately "un-count" a stat update.
 */
export async function recomputeStatisticsForPlayer(playerId: string): Promise<StatisticsSnapshot> {
  const [games, hands] = await Promise.all([getAll('games'), getAll('hands')]);

  const gamesPlayed = games.filter((g) => g.playerIds.includes(playerId)).length;
  const wonHands = hands.filter((h) => h.winnerId === playerId);
  const discardLossCount = hands.filter((h) => h.discarderId === playerId).length;

  const snapshot: StatisticsSnapshot = {
    id: playerId,
    gamesPlayed,
    handsWon: wonHands.length,
    totalFan: wonHands.reduce((sum, h) => sum + h.totalFan, 0),
    highestFan: wonHands.reduce((max, h) => Math.max(max, h.totalFan), 0),
    selfDrawCount: wonHands.filter((h) => h.selfDraw).length,
    discardLossCount,
    updatedAt: Date.now(),
  };

  await put('statistics', snapshot);
  return snapshot;
}

export async function getStatistics(playerId: string): Promise<StatisticsSnapshot | undefined> {
  const all = await getAll('statistics');
  return all.find((s) => s.id === playerId);
}

export async function listStatistics(): Promise<StatisticsSnapshot[]> {
  return getAll('statistics');
}
