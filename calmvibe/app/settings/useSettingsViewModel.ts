import { useEffect, useMemo, useState } from 'react';
import { SettingsRepository, SettingsValues, defaultSettings, TempoPreset, VibrationIntensity, VibrationPattern } from '../../src/settings/types';

export type SettingsViewModel = {
  values: SettingsValues;
  loading: boolean;
  saving: boolean;
  setTempo: (tempo: TempoPreset) => void;
  setIntensity: (intensity: VibrationIntensity) => void;
  setPattern: (pattern: VibrationPattern) => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
};

export const useSettingsViewModel = (repo: SettingsRepository): SettingsViewModel => {
  const [values, setValues] = useState<SettingsValues>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const loaded = await repo.getSettings();
    setValues(loaded);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    await repo.saveSettings(values);
    setSaving(false);
  };

  const setTempo = (tempo: TempoPreset) => setValues((v) => ({ ...v, tempoPreset: tempo }));
  const setIntensity = (intensity: VibrationIntensity) => setValues((v) => ({ ...v, intensity }));
  const setPattern = (pattern: VibrationPattern) => setValues((v) => ({ ...v, pattern }));

  return useMemo(
    () => ({ values, loading, saving, setTempo, setIntensity, setPattern, save, reload: load }),
    [values, loading, saving]
  );
};
