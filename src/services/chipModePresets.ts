import type { ChipMode } from '../rule-engine/score/scoreCalculator';

export interface ChipModePreset {
  id: string;
  label: string;
  description: string;
  chipMode: ChipMode;
}

/**
 * A handful of common Hong Kong Mahjong chip conventions. House rules vary
 * a lot here — these are reasonable, commonly-seen defaults, not a
 * canonical standard. The "自訂" option in the UI lets a table pick their
 * own chips-per-fan multiplier without editing code.
 */
export const CHIP_MODE_PRESETS: ChipModePreset[] = [
  {
    id: 'per-fan-1',
    label: '1番1雞',
    description: '每多一番加一嚿籌碼（預設）',
    chipMode: { type: 'perFan', chipsPerFan: 1 },
  },
  {
    id: 'per-fan-2',
    label: '1番2雞',
    description: '每多一番加兩嚿籌碼',
    chipMode: { type: 'perFan', chipsPerFan: 2 },
  },
  {
    id: 'traditional-table',
    label: '傳統追番表',
    description: '3番起跳，之後逢番大約加倍',
    chipMode: {
      type: 'fixed',
      table: { 3: 8, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96, 10: 128, 13: 192 },
    },
  },
];

export const DEFAULT_CHIP_MODE_PRESET_ID = 'per-fan-1';

export function customPerFanChipMode(chipsPerFan: number): ChipMode {
  return { type: 'perFan', chipsPerFan };
}

export function chipModeLabel(chipMode: ChipMode): string {
  const preset = CHIP_MODE_PRESETS.find(
    (p) =>
      p.chipMode.type === chipMode.type &&
      JSON.stringify(p.chipMode) === JSON.stringify(chipMode)
  );
  if (preset) return preset.label;
  if (chipMode.type === 'perFan') return `1番${chipMode.chipsPerFan}雞`;
  return '自訂追番表';
}
