import { describe, expect, it } from 'vitest';
import {
  CHIP_MODE_PRESETS,
  DEFAULT_CHIP_MODE_PRESET_ID,
  chipModeLabel,
  customPerFanChipMode,
} from '../src/services/chipModePresets';

describe('chipModePresets', () => {
  it('defaults to 1番1雞', () => {
    const preset = CHIP_MODE_PRESETS.find((p) => p.id === DEFAULT_CHIP_MODE_PRESET_ID);
    expect(preset?.chipMode).toEqual({ type: 'perFan', chipsPerFan: 1 });
  });

  it('labels a preset chip mode using the preset name', () => {
    expect(chipModeLabel({ type: 'perFan', chipsPerFan: 2 })).toBe('1番2雞');
  });

  it('labels a custom perFan chip mode generically', () => {
    expect(chipModeLabel(customPerFanChipMode(5))).toBe('1番5雞');
  });

  it('labels a fixed table chip mode not matching any preset', () => {
    expect(chipModeLabel({ type: 'fixed', table: { 3: 10 } })).toBe('自訂追番表');
  });
});
