export type VibrationIntensity = 'low' | 'medium' | 'strong';

export type BreathPattern =
  | { type: 'two-phase'; inhaleSec: number; exhaleSec: number; cycles: number | null }
  | { type: 'three-phase'; inhaleSec: number; holdSec: number; exhaleSec: number; cycles: number | null };

export type SettingsValues = {
  bpm: number; // 40-90
  durationSec: number | null; // 60-300 or null (∞)
  intensity: VibrationIntensity;
  breath: BreathPattern;
};

export interface SettingsRepository {
  get(): Promise<SettingsValues>;
  save(values: SettingsValues): Promise<void>;
}

export const defaultSettings: SettingsValues = {
  bpm: 60,
  durationSec: 180,
  intensity: 'medium',
  breath: { type: 'two-phase', inhaleSec: 4, exhaleSec: 4, cycles: 5 },
};
