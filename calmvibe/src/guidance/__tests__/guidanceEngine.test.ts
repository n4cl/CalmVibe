import { SimpleGuidanceEngine } from '../guidanceEngine';
import { HapticsAdapter } from '../types';

jest.useFakeTimers();

const createAdapter = (): { adapter: HapticsAdapter; play: jest.Mock; stop: jest.Mock } => {
  const play = jest.fn().mockResolvedValue({ ok: true });
  const stop = jest.fn().mockResolvedValue({ ok: true });
  return {
    adapter: { play, stop },
    play,
    stop,
  };
};

describe('SimpleGuidanceEngine VIBRATION', () => {
  it('BPM間隔で振動し、durationで完了する', async () => {
    const { adapter, play } = createAdapter();
    const engine = new SimpleGuidanceEngine(adapter);
    const onComplete = jest.fn();
    await engine.startGuidance(
      {
        mode: 'VIBRATION',
        bpm: 60,
        durationSec: 2,
        visualEnabled: true,
        vibrationPattern: [0],
      },
      { onComplete }
    );

    // 初回再生
    expect(play).toHaveBeenCalledTimes(1);

    // 2秒経過で完了（合計呼び出し回数: 初回＋1回）
    jest.advanceTimersByTime(2000);
    jest.runAllTimers();
    expect(play).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(engine.isActive()).toBe(false);
  });

  it('二重開始を拒否する', async () => {
    const { adapter } = createAdapter();
    const engine = new SimpleGuidanceEngine(adapter);
    const first = await engine.startGuidance({
      mode: 'VIBRATION',
      bpm: 60,
      durationSec: 1,
      visualEnabled: true,
      vibrationPattern: [0],
    });
    expect(first.ok).toBe(true);
    const second = await engine.startGuidance({
      mode: 'VIBRATION',
      bpm: 60,
      durationSec: 1,
      visualEnabled: true,
      vibrationPattern: [0],
    });
    expect(second.ok).toBe(false);
    expect(second.error).toBe('already_running');
  });

  it('stopGuidanceで振動を停止し、タイマーも止まる', async () => {
    const { adapter, play, stop } = createAdapter();
    const engine = new SimpleGuidanceEngine(adapter);
    await engine.startGuidance({
      mode: 'VIBRATION',
      bpm: 120,
      durationSec: 10,
      visualEnabled: true,
      vibrationPattern: [0],
    });

    // 少し進めてから停止
    jest.advanceTimersByTime(500);
    await engine.stopGuidance();
    expect(stop).toHaveBeenCalledTimes(1);
    const callsBefore = play.mock.calls.length;

    // さらに時間を進めても再生されない
    jest.advanceTimersByTime(2000);
    expect(play.mock.calls.length).toBe(callsBefore);
    expect(engine.isActive()).toBe(false);
  });
});

describe('SimpleGuidanceEngine BREATH', () => {
  beforeAll(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  it('吸→止→吐をcycles回実行し完了する', async () => {
    const { adapter } = createAdapter();
    const engine = new SimpleGuidanceEngine(adapter);
    const onComplete = jest.fn();
    const onStep = jest.fn();
    await engine.startGuidance(
      {
        mode: 'BREATH',
        durationSec: 5,
        visualEnabled: true,
        breath: { inhaleMs: 300, holdMs: 200, exhaleMs: 400, cycles: 2, haptics: { pattern: [0] } },
      },
      { onStep, onComplete }
    );
    await Promise.resolve();

    // フェーズ進行を待つ（リアルタイマー）
    await new Promise((r) => setTimeout(r, 350));
    await new Promise((r) => setTimeout(r, 220));
    await new Promise((r) => setTimeout(r, 420));
    await new Promise((r) => setTimeout(r, 350 + 220 + 420));

    const phases = onStep.mock.calls.map((c) => c[0].phase);
    expect(phases).toEqual(['INHALE', 'HOLD', 'EXHALE', 'INHALE', 'HOLD', 'EXHALE']);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(engine.isActive()).toBe(false);
  });

  it('cyclesがnullの場合、durationで終了する', async () => {
    const { adapter } = createAdapter();
    const engine = new SimpleGuidanceEngine(adapter);
    const onComplete = jest.fn();
    await engine.startGuidance(
      {
        mode: 'BREATH',
        durationSec: 1,
        visualEnabled: true,
        breath: { inhaleMs: 300, exhaleMs: 300, cycles: null, haptics: { pattern: [0] } },
      },
      { onComplete }
    );
    await Promise.resolve();

    await new Promise((r) => setTimeout(r, 1100));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(engine.isActive()).toBe(false);
  });
});
