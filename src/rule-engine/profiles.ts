import rulesData from './rules.json';

export interface RuleProfileRules {
  minFan: number;
  maxFan: number;
  flowerTilesEnabled: boolean;
  chickenHandEnabled: boolean;
  dealerBonus: number;
  selfDrawBonus: number;
  limitHands: boolean;
  sevenPairs: boolean;
  thirteenOrphans: boolean;
  allPongs: boolean;
  mixedOneSuit: boolean;
  pureOneSuit: boolean;
  smallDragons: boolean;
  bigDragons: boolean;
  smallWinds: boolean;
  bigWinds: boolean;
}

export interface BuiltInRuleProfile {
  id: string;
  name: string;
  isBuiltIn: true;
  rules: RuleProfileRules;
}

/**
 * Built-in rule profiles bundled with the app (section 5.2 of the spec).
 * Custom profiles created by the user live in IndexedDB (`ruleProfiles`
 * store), not here — this module only ever returns the read-only presets.
 */
export function getBuiltInProfiles(): BuiltInRuleProfile[] {
  return rulesData.profiles as BuiltInRuleProfile[];
}

export function getBuiltInProfileById(id: string): BuiltInRuleProfile | undefined {
  return getBuiltInProfiles().find((profile) => profile.id === id);
}
