import { SimpleGuidanceEngine } from '../../src/guidance/guidanceEngine';
import { GuidanceConfig, GuidanceListener, HapticsAdapter } from '../../src/guidance/types';

describe('GuidanceEngine (vibration)', () => {
  jest.useFakeTimers();

  const baseConfig: GuidanceConfig = {
    mode: 'VIBRATION',
    bpm: 60,
    durationSec: 2,
    vibrationPattern: [0],
    visualEnabled: true,
  };

  const createAdapter = () => {
    const adapter: HapticsAdapter = {
      play: jest.fn().mockResolvedValue({ ok: true }),
      stop: jest.fn().mockResolvedValue({ ok: true }),
    };
    return adapter;
  };

  const createListener = () => {
    const listener: GuidanceListener = {
      onStep: jest.fn(),
      onComplete: jest.fn(),
      onStop: jest.fn(),
    };
    return listener;
  };

  it('開始時に1拍再生し、周期ごとに再生・onStepを通知する', async () => {
    const adapter = createAdapter();
    const listener = createListener();
    const engine = new SimpleGuidanceEngine(adapter);

    await engine.startGuidance(baseConfig, listener);

    expect(adapter.play).toHaveBeenCalledTimes(1);
    expect(listener.onStep).toHaveBeenCalledWith({ elapsedSec: 0, cycle: 0, phase: 'PULSE' });

    jest.advanceTimersByTime(1000); // 60bpm => 約1秒
    await Promise.resolve(); // play()の非同期完了を待つ
    expect(adapter.play).toHaveBeenCalledTimes(2);
    expect(listener.onStep).toHaveBeenLastCalledWith({ elapsedSec: 1, cycle: 1, phase: 'PULSE' });
  });

  it('duration経過でonCompleteし停止する', async () => {
    const adapter = createAdapter();
    const listener = createListener();
    const engine = new SimpleGuidanceEngine(adapter);

    await engine.startGuidance({ ...baseConfig, durationSec: 1 }, listener);
    jest.advanceTimersByTime(1000);

    expect(listener.onComplete).toHaveBeenCalled();
    expect(engine.isActive()).toBe(false);
  });

  it('stopGuidanceで停止しonStopを通知する', async () => {
    const adapter = createAdapter();
    const listener = createListener();
    const engine = new SimpleGuidanceEngine(adapter);

    await engine.startGuidance(baseConfig, listener);
    await engine.stopGuidance();

    expect(listener.onStop).toHaveBeenCalled();
    expect(engine.isActive()).toBe(false);
    expect(adapter.stop).toHaveBeenCalled();
  });

  it('二重開始を防ぎエラーを返す', async () => {
    const adapter = createAdapter();
    const engine = new SimpleGuidanceEngine(adapter);

    const first = await engine.startGuidance(baseConfig);
    const second = await engine.startGuidance(baseConfig);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.error).toBe('already_running');
  });
});
