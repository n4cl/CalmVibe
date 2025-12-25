import { SettingsRepository, SettingsValues, defaultSettings } from './types';

/**
 * Web用のメモリ実装。expo-sqlite を参照しない。
 */
export class SqliteSettingsRepository implements SettingsRepository {
  async get(): Promise<SettingsValues> {
    if (!memoryStore.value) memoryStore.value = defaultSettings;
    return memoryStore.value;
  }

  async save(values: SettingsValues): Promise<void> {
    memoryStore.value = normalize(values);
  }
}

const memoryStore: { value: SettingsValues | null } = { value: null };

const normalize = (values: SettingsValues): SettingsValues => ({
  bpm: clamp(values.bpm, 40, 120, defaultSettings.bpm),
  durationSec: values.durationSec === null ? null : clamp(values.durationSec, 60, 300, defaultSettings.durationSec as number),
  intensity: values.intensity,
  breath: normalizeBreath(values.breath),
});

const clamp = (val: number, min: number, max: number, fallback: number) => {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  if (val < min || val > max) return fallback;
  return val;
};

const normalizeBreath = (breath: SettingsValues['breath']) => {
  if (breath.type === 'two-phase') {
    if (breath.inhaleSec <= 0 || breath.exhaleSec <= 0) return defaultSettings.breath;
    return breath;
  }
  if (breath.inhaleSec <= 0 || breath.exhaleSec <= 0 || breath.holdSec <= 0) return defaultSettings.breath;
  return breath;
};
