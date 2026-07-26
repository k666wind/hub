import { getAll, put, remove, type RuleProfile } from '../storage/indexeddb/db';
import { getBuiltInProfiles } from '../rule-engine/profiles';

/**
 * Built-in profiles (香港正規 / 香港啤牌) live as static JSON and are always
 * available — they never touch IndexedDB. Only user-created "Custom Rules"
 * profiles (spec §5.2) are persisted, in the `ruleProfiles` store.
 */

export async function listAllProfiles(): Promise<RuleProfile[]> {
  const custom = await getAll('ruleProfiles');
  const builtIn = getBuiltInProfiles().map(
    (p): RuleProfile => ({ id: p.id, name: p.name, isBuiltIn: true, rules: p.rules })
  );
  return [...builtIn, ...custom];
}

export async function getProfile(id: string): Promise<RuleProfile | undefined> {
  const builtIn = getBuiltInProfiles().find((p) => p.id === id);
  if (builtIn) return { id: builtIn.id, name: builtIn.name, isBuiltIn: true, rules: builtIn.rules };
  const custom = await getAll('ruleProfiles');
  return custom.find((p) => p.id === id);
}

export async function createCustomProfile(
  input: Pick<RuleProfile, 'name' | 'rules'>
): Promise<RuleProfile> {
  const profile: RuleProfile = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    isBuiltIn: false,
    rules: input.rules,
  };
  await put('ruleProfiles', profile);
  return profile;
}

export async function updateCustomProfile(
  id: string,
  patch: Partial<Pick<RuleProfile, 'name' | 'rules'>>
): Promise<RuleProfile> {
  const custom = await getAll('ruleProfiles');
  const existing = custom.find((p) => p.id === id);
  if (!existing) throw new Error(`Custom rule profile not found: ${id}`);
  const updated: RuleProfile = { ...existing, ...patch };
  await put('ruleProfiles', updated);
  return updated;
}

export async function deleteCustomProfile(id: string): Promise<void> {
  if (getBuiltInProfiles().some((p) => p.id === id)) {
    throw new Error('Built-in rule profiles cannot be deleted');
  }
  await remove('ruleProfiles', id);
}
