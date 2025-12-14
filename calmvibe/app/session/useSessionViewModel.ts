import { useCallback, useMemo, useState } from 'react';
import { GuidanceEngine, GuidanceMode } from '../../src/guidance/types';
import { SettingsRepository, SettingsValues } from '../../src/settings/types';
import { mapPatternToMs } from './utils';

const DEFAULT_DURATION = 180; // 秒

export type SessionViewModel = {
  mode: GuidanceMode;
  running: boolean;
  status: string;
  cycle: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  setMode: (mode: GuidanceMode) => void;
};

export const useSessionViewModel = ({
  engine,
  repo,
}: {
  engine: GuidanceEngine;
  repo: SettingsRepository;
}): SessionViewModel => {
  const [mode, setMode] = useState<GuidanceMode>('BREATH');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('状態: 待機中');
  const [cycle, setCycle] = useState(0);

  const loadSettings = useCallback(async (): Promise<SettingsValues> => {
    const settings = await repo.getSettings();
    return settings;
  }, [repo]);

  const start = useCallback(async () => {
    if (running) return;
    const settings = await loadSettings();
    const pattern = mapPatternToMs(settings.pattern);
    const result = await engine.startGuidance(
      {
        mode,
        tempo: settings.tempoPreset as any,
        durationSec: DEFAULT_DURATION,
        vibrationPattern: pattern,
      },
      {
        onStep: ({ cycle }) => {
          setCycle(cycle);
          setStatus('状態: 進行中...');
        },
        onComplete: () => {
          setRunning(false);
          setStatus('状態: 完了しました');
        },
        onStop: () => {
          setRunning(false);
          setStatus('状態: 停止しました');
        },
      }
    );

    if (result.ok) {
      setRunning(true);
      setStatus('状態: 進行中...');
      setCycle(0);
    } else {
      setStatus('状態: 開始できませんでした');
    }
  }, [engine, loadSettings, mode, running]);

  const stop = useCallback(async () => {
    if (!running) return;
    await engine.stopGuidance();
    setRunning(false);
    setStatus('状態: 停止しました');
  }, [engine, running]);

  return useMemo(
    () => ({ mode, running, status, cycle, start, stop, setMode }),
    [mode, running, status, cycle, start, stop]
  );
};
