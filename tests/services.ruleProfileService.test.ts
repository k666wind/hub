import { describe, expect, it } from 'vitest';
import {
  createCustomProfile,
  deleteCustomProfile,
  getProfile,
  listAllProfiles,
  updateCustomProfile,
} from '../src/services/ruleProfileService';
import { getBuiltInProfileById } from '../src/rule-engine/profiles';

describe('ruleProfileService', () => {
  it('lists the built-in profiles even with no custom ones saved', async () => {
    const profiles = await listAllProfiles();
    const ids = profiles.map((p) => p.id);
    expect(ids).toContain('hk-classic');
    expect(ids).toContain('hk-casual');
  });

  it('creates, reads, updates, and deletes a custom profile', async () => {
    const base = getBuiltInProfileById('hk-classic')!;
    const created = await createCustomProfile({ name: '我嘅自訂規則', rules: base.rules });
    expect(created.isBuiltIn).toBe(false);

    const fetched = await getProfile(created.id);
    expect(fetched?.name).toBe('我嘅自訂規則');

    const updated = await updateCustomProfile(created.id, { name: '改咗名' });
    expect(updated.name).toBe('改咗名');

    await deleteCustomProfile(created.id);
    expect(await getProfile(created.id)).toBeUndefined();
  });

  it('refuses to delete a built-in profile', async () => {
    await expect(deleteCustomProfile('hk-classic')).rejects.toThrow();
  });
});
