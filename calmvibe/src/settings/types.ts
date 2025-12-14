export type TempoPreset = '4-6-4' | '5-5-5' | '4-4-4';
export type VibrationIntensity = 'low' | 'medium' | 'strong';
export type VibrationPattern = 'short' | 'pulse' | 'wave';

export type SettingsValues = {
  tempoPreset: TempoPreset;
  intensity: VibrationIntensity;
  pattern: VibrationPattern;
};

export interface SettingsRepository {
  getSettings(): Promise<SettingsValues>;
  saveSettings(values: SettingsValues): Promise<void>;
}

export const defaultSettings: SettingsValues = {
  tempoPreset: '4-6-4',
  intensity: 'medium',
  pattern: 'pulse',
};
