import { getDB } from '../storage/indexeddb/db';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'zh-HK' | 'en';

export const SETTINGS_KEYS = {
  theme: 'theme',
  language: 'language',
  ruleProfileId: 'ruleProfileId',
} as const;

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDB();
  const entry = await db.get('settings', key);
  return entry ? (entry.value as T) : fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}
