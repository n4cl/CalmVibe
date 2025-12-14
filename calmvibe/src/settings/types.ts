export type VibrationIntensity = 'low' | 'medium' | 'strong';
export type BreathPreset = '4-6-4' | '5-5-5' | '4-4-4';

export type SettingsValues = {
  bpm: number; // 40-90
  durationSec: number; // 60-300
  intensity: VibrationIntensity;
  useBreath: boolean;
  breathPreset: BreathPreset;
};

export interface SettingsRepository {
  get(): Promise<SettingsValues>;
  save(values: SettingsValues): Promise<void>;
}

export const defaultSettings: SettingsValues = {
  bpm: 60,
  durationSec: 180,
  intensity: 'medium',
  useBreath: true,
  breathPreset: '4-6-4',
};
