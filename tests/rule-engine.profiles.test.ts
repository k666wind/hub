import { describe, expect, it } from 'vitest';
import { getBuiltInProfileById, getBuiltInProfiles } from '../src/rule-engine/profiles';

describe('rule-engine/profiles', () => {
  it('exposes the two built-in Hong Kong rule profiles', () => {
    const profiles = getBuiltInProfiles();
    const ids = profiles.map((p) => p.id);
    expect(ids).toEqual(['hk-classic', 'hk-casual']);
    expect(profiles.every((p) => p.isBuiltIn)).toBe(true);
  });

  it('looks up a profile by id', () => {
    const classic = getBuiltInProfileById('hk-classic');
    expect(classic?.name).toBe('香港正規');
    expect(classic?.rules.minFan).toBe(3);
  });

  it('returns undefined for an unknown profile id', () => {
    expect(getBuiltInProfileById('does-not-exist')).toBeUndefined();
  });
});
