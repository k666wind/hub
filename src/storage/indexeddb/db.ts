import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { RuleProfileRules } from '../../rule-engine/profiles';
import type { Wind } from '../../rule-engine/tiles';
import type { ChipMode } from '../../rule-engine/score/scoreCalculator';

// ---------------------------------------------------------------------------
// Local-only persistence layer. No network, no backend — everything lives in
// IndexedDB on the device. Collections mirror spec section 9.
// ---------------------------------------------------------------------------

export interface Player {
  id: string;
  name: string;
  createdAt: number;
}

export interface RuleProfile {
  id: string;
  name: string;
  isBuiltIn: boolean;
  rules: RuleProfileRules;
}

export interface Game {
  id: string;
  createdAt: number;
  finishedAt?: number;
  playerCount: 2 | 3 | 4;
  /** Fixed physical seating order — winds rotate around this, seats don't move. */
  playerIds: string[];
  ruleProfileId: string;
  chipMode: ChipMode;
  status: 'active' | 'finished';
  /** Index into `playerIds` of the current dealer (莊家). */
  dealerSeatIndex: number;
  /** 0=east 1=south 2=west 3=north — the current round wind (圈風). */
  roundWindIndex: number;
  seatWinds: Record<string, Wind>;
  scores: Record<string, number>;
  handNumber: number;
}

import type { FanResult } from '../../rule-engine/fan/fanCalculator';

/** Snapshot of the mutable parts of a Game, taken right before a hand is
 * applied — lets `undoLastHand` put the game back exactly as it was. */
export interface GameStateSnapshot {
  dealerSeatIndex: number;
  roundWindIndex: number;
  scores: Record<string, number>;
  handNumber: number;
}

export interface Hand {
  id: string;
  gameId: string;
  timestamp: number;
  winnerId: string | null;
  selfDraw: boolean;
  discarderId: string | null;
  tiles: string[];
  /** JSON-serialized Meld[] — exposed/concealed pong/chow/kong sets declared before the win. */
  melds: string[];
  fanBreakdown: FanResult[];
  totalFan: number;
  score: number;
  screenshot?: string;
  gameStateBefore: GameStateSnapshot;
}

export interface StatisticsSnapshot {
  id: string; // playerId
  gamesPlayed: number;
  handsWon: number;
  totalFan: number;
  highestFan: number;
  selfDrawCount: number;
  discardLossCount: number;
  updatedAt: number;
}

export interface SettingEntry {
  key: string;
  value: unknown;
}

interface MahjongDB extends DBSchema {
  players: { key: string; value: Player };
  games: { key: string; value: Game; indexes: { 'by-status': string } };
  hands: { key: string; value: Hand; indexes: { 'by-game': string } };
  statistics: { key: string; value: StatisticsSnapshot };
  settings: { key: string; value: SettingEntry };
  ruleProfiles: { key: string; value: RuleProfile };
}

const DB_NAME = 'hk-mahjong-ai-assistant';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MahjongDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MahjongDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MahjongDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('players')) {
          db.createObjectStore('players', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('games')) {
          const store = db.createObjectStore('games', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('hands')) {
          const store = db.createObjectStore('hands', { keyPath: 'id' });
          store.createIndex('by-game', 'gameId');
        }
        if (!db.objectStoreNames.contains('statistics')) {
          db.createObjectStore('statistics', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('ruleProfiles')) {
          db.createObjectStore('ruleProfiles', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/** Test-only: drops the cached connection so the next getDB() call opens a
 * fresh one — needed when tests swap in a new fake IndexedDB per test. */
export function __resetDBForTests(): void {
  dbPromise = null;
}

// Generic helpers reused by every future service (players, games, hands, ...)
export async function getAll<K extends keyof MahjongDB>(
  store: K
): Promise<MahjongDB[K]['value'][]> {
  const db = await getDB();
  // @ts-expect-error - generic store name is narrowed at call sites
  return db.getAll(store);
}

export async function put<K extends keyof MahjongDB>(store: K, value: MahjongDB[K]['value']) {
  const db = await getDB();
  // @ts-expect-error - generic store name is narrowed at call sites
  return db.put(store, value);
}

export async function remove<K extends keyof MahjongDB>(store: K, key: MahjongDB[K]['key']) {
  const db = await getDB();
  // @ts-expect-error - generic store name is narrowed at call sites
  return db.delete(store, key);
}

export async function exportAllData() {
  const db = await getDB();
  const [players, games, hands, statistics, settings, ruleProfiles] = await Promise.all([
    db.getAll('players'),
    db.getAll('games'),
    db.getAll('hands'),
    db.getAll('statistics'),
    db.getAll('settings'),
    db.getAll('ruleProfiles'),
  ]);
  return { players, games, hands, statistics, settings, ruleProfiles, exportedAt: Date.now() };
}

export async function importAllData(data: Awaited<ReturnType<typeof exportAllData>>) {
  const db = await getDB();
  const tx = db.transaction(
    ['players', 'games', 'hands', 'statistics', 'settings', 'ruleProfiles'],
    'readwrite'
  );
  await Promise.all([
    ...data.players.map((p) => tx.objectStore('players').put(p)),
    ...data.games.map((g) => tx.objectStore('games').put(g)),
    ...data.hands.map((h) => tx.objectStore('hands').put(h)),
    ...data.statistics.map((s) => tx.objectStore('statistics').put(s)),
    ...data.settings.map((s) => tx.objectStore('settings').put(s)),
    ...data.ruleProfiles.map((r) => tx.objectStore('ruleProfiles').put(r)),
  ]);
  await tx.done;
}
