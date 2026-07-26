import { getAll, put, remove, type Player } from '../storage/indexeddb/db';

export async function listPlayers(): Promise<Player[]> {
  const players = await getAll('players');
  return [...players].sort((a, b) => a.createdAt - b.createdAt);
}

export async function createPlayer(name: string): Promise<Player> {
  const player: Player = {
    id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    createdAt: Date.now(),
  };
  await put('players', player);
  return player;
}

export async function renamePlayer(id: string, name: string): Promise<void> {
  const players = await getAll('players');
  const existing = players.find((p) => p.id === id);
  if (!existing) throw new Error(`Player not found: ${id}`);
  await put('players', { ...existing, name: name.trim() });
}

export async function deletePlayer(id: string): Promise<void> {
  await remove('players', id);
}
