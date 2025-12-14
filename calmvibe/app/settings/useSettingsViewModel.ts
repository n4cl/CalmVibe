import { useEffect, useMemo, useState } from 'react';
import { SettingsRepository, SettingsValues, defaultSettings, VibrationIntensity, VibrationPattern, BreathPreset } from '../../src/settings/types';

export type SettingsViewModel = {
  values: SettingsValues;
  loading: boolean;
  saving: boolean;
  setBpm: (bpm: number) => void;
  setDuration: (sec: number) => void;
  setIntensity: (intensity: VibrationIntensity) => void;
  setPattern: (pattern: VibrationPattern) => void;
  setUseBreath: (on: boolean) => void;
  setBreathPreset: (preset: BreathPreset) => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
};

export const useSettingsViewModel = (repo: SettingsRepository): SettingsViewModel => {
  const [values, setValues] = useState<SettingsValues>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const loaded = await repo.get();
    setValues(loaded);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    await repo.save(values);
    setSaving(false);
  };

  const setBpm = (bpm: number) => setValues((v) => ({ ...v, bpm }));
  const setDuration = (sec: number) => setValues((v) => ({ ...v, durationSec: sec }));
  const setIntensity = (intensity: VibrationIntensity) => setValues((v) => ({ ...v, intensity }));
  const setPattern = (pattern: VibrationPattern) => setValues((v) => ({ ...v, pattern }));
  const setUseBreath = (on: boolean) => setValues((v) => ({ ...v, useBreath: on }));
  const setBreathPreset = (preset: BreathPreset) => setValues((v) => ({ ...v, breathPreset: preset }));

  return useMemo(
    () => ({ values, loading, saving, setBpm, setDuration, setIntensity, setPattern, setUseBreath, setBreathPreset, save, reload: load }),
    [values, loading, saving]
  );
};
