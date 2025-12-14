import { SimpleGuidanceEngine } from '../../src/guidance/guidanceEngine';
import { GuidanceConfig, GuidanceListener, HapticsAdapter } from '../../src/guidance/types';

describe('GuidanceEngine', () => {
  jest.useFakeTimers();

  const config: GuidanceConfig = {
    bpm: 60,
    durationSec: 30,
    vibrationPattern: [0],
    visualEnabled: true,
  };

  const createAdapter = () => {
    const adapter: HapticsAdapter = {
      playPattern: jest.fn().mockResolvedValue({ ok: true }),
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

  it('開始時にハプティクスを呼び、周期ごとに通知する', async () => {
    const adapter = createAdapter();
    const listener = createListener();
    const engine = new SimpleGuidanceEngine(adapter);

    await engine.startGuidance(config, listener);

    expect(adapter.playPattern).toHaveBeenCalledTimes(1);
    expect(listener.onStep).toHaveBeenCalledWith({ elapsedSec: 0, cycle: 0 });

    jest.advanceTimersByTime(1000); // ~1サイクル(60bpm => 1000ms)
    expect(adapter.playPattern).toHaveBeenCalledTimes(2);
  });

  it('終了時にonCompleteを呼びアクティブを解除する', async () => {
    const adapter = createAdapter();
    const listener = createListener();
    const engine = new SimpleGuidanceEngine(adapter);

    await engine.startGuidance({ ...config, durationSec: 2 }, listener);
    jest.advanceTimersByTime(2000);

    expect(listener.onComplete).toHaveBeenCalled();
    expect(engine.isActive()).toBe(false);
  });

  it('二重開始を防ぐ', async () => {
    const adapter = createAdapter();
    const engine = new SimpleGuidanceEngine(adapter);

    const first = await engine.startGuidance(config);
    const second = await engine.startGuidance(config);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });

  it('stopGuidanceで停止しonStopを呼ぶ', async () => {
    const adapter = createAdapter();
    const listener = createListener();
    const engine = new SimpleGuidanceEngine(adapter);

    await engine.startGuidance(config, listener);
    await engine.stopGuidance();

    expect(listener.onStop).toHaveBeenCalled();
    expect(engine.isActive()).toBe(false);
    expect(adapter.stop).toHaveBeenCalled();
  });
});
