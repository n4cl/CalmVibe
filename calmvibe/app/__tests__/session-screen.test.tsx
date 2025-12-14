import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionScreen from '../session';
import { GuidanceConfig, GuidanceListener, GuidanceEngine } from '../../src/guidance/types';
import { SettingsRepository, SettingsValues } from '../../src/settings/types';

class MockGuidanceEngine implements GuidanceEngine {
  public lastConfig: GuidanceConfig | null = null;
  public listener?: GuidanceListener;
  public started = false;
  public stopCalled = false;

  async startGuidance(config: GuidanceConfig, listener?: GuidanceListener) {
    this.lastConfig = config;
    this.listener = listener;
    this.started = true;
    return { ok: true as const };
  }
  async stopGuidance() {
    this.stopCalled = true;
    this.started = false;
    this.listener?.onStop?.();
    return { ok: true as const };
  }
  isActive() {
    return this.started;
  }
  emitStep(cycle: number, elapsedSec: number) {
    this.listener?.onStep?.({ cycle, elapsedSec });
  }
  emitComplete() {
    this.started = false;
    this.listener?.onComplete?.();
  }
}

const settings: SettingsValues = {
  bpm: 60,
  durationSec: 180,
  pattern: 'pulse',
  intensity: 'medium',
  useBreath: false,
  breathPreset: '4-6-4',
};

const createRepo = (): SettingsRepository => ({
  get: jest.fn().mockResolvedValue(settings),
  save: jest.fn(),
});

describe('SessionScreen', () => {
  it('デフォルトで振動モードで開始する', async () => {
    const engine = new MockGuidanceEngine();
    const repo = createRepo();

    const { getByText, findByText } = render(
      <SessionScreen guidanceEngine={engine} settingsRepo={repo} />
    );

    fireEvent.press(getByText('開始'));

    await findByText('状態: 進行中...');
    expect(engine.lastConfig?.bpm).toBe(60);
    expect(engine.lastConfig?.durationSec).toBe(180);
  });

  it('振動のみモードで開始できる', async () => {
    const engine = new MockGuidanceEngine();
    const repo = createRepo();
    const { getByText, findByText } = render(
      <SessionScreen guidanceEngine={engine} settingsRepo={repo} />
    );

    fireEvent.press(getByText('振動のみ'));
    fireEvent.press(getByText('開始'));

    await findByText('状態: 進行中...');
    expect(engine.lastConfig?.visualEnabled).toBe(false);
  });

  it('停止でstopGuidanceが呼ばれ停止メッセージを表示する', async () => {
    const engine = new MockGuidanceEngine();
    const repo = createRepo();
    const { getByText, findByText } = render(
      <SessionScreen guidanceEngine={engine} settingsRepo={repo} />
    );

    fireEvent.press(getByText('開始'));
    await findByText('状態: 進行中...');

    fireEvent.press(getByText('停止'));
    await findByText('状態: 停止しました');
    expect(engine.stopCalled).toBe(true);
  });

  it('進行ステップが表示される', async () => {
    const engine = new MockGuidanceEngine();
    const repo = createRepo();
    const { getByText, findByText } = render(
      <SessionScreen guidanceEngine={engine} settingsRepo={repo} />
    );

    fireEvent.press(getByText('開始'));
    await findByText('状態: 進行中...');

    engine.emitStep(1, 1);

    await findByText('サイクル 1');
  });
});
