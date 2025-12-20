import { SessionUseCase } from '../useCase';
import { GuidanceEngine, GuidanceListener } from '../../guidance';
import { SettingsRepository, SettingsValues } from '../../settings/types';
import { SessionRepository, SessionRecord } from '../types.ts';

jest.useFakeTimers();

const defaultSettings: SettingsValues = {
  bpm: 60,
  durationSec: 120,
  intensity: 'medium',
  breath: { type: 'three-phase', inhaleSec: 4, holdSec: 6, exhaleSec: 4, cycles: 2 },
};

const createMocks = () => {
  const startGuidance = jest.fn().mockResolvedValue({ ok: true });
  const stopGuidance = jest.fn().mockResolvedValue({ ok: true });
  const guidance: GuidanceEngine = {
    startGuidance,
    stopGuidance,
    isActive: () => false,
  };
  const settingsRepo: SettingsRepository = {
    get: jest.fn().mockResolvedValue(defaultSettings),
    save: jest.fn(),
  };
  const sessionRepo: SessionRepository = {
    save: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
  };
  return { guidance, settingsRepo, sessionRepo, startGuidance, stopGuidance };
};

describe('SessionUseCase start/stop', () => {
  it('設定を読んで振動モードで開始し、stopで終了する', async () => {
    const { guidance, settingsRepo, sessionRepo, startGuidance, stopGuidance } = createMocks();
    const useCase = new SessionUseCase(guidance, settingsRepo, sessionRepo);

    const res = await useCase.start({ mode: 'VIBRATION' }, undefined as GuidanceListener);
    expect(res.ok).toBe(true);
    expect(startGuidance).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'VIBRATION', bpm: 60, durationSec: 120 }),
      expect.any(Object)
    );
    expect(useCase.isActive()).toBe(true);

    const stopRes = await useCase.stop();
    expect(stopRes.ok).toBe(true);
    expect(stopGuidance).toHaveBeenCalled();
    expect(useCase.isActive()).toBe(false);
  });

  it('呼吸モードで開始時にbreath設定をミリ秒換算して渡す', async () => {
    const { guidance, settingsRepo, sessionRepo, startGuidance } = createMocks();
    const useCase = new SessionUseCase(guidance, settingsRepo, sessionRepo);

    await useCase.start({ mode: 'BREATH' }, undefined as GuidanceListener);

    expect(startGuidance).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'BREATH',
        breath: expect.objectContaining({ inhaleMs: 4000, holdMs: 6000, exhaleMs: 4000, cycles: 2 }),
      }),
      expect.any(Object)
    );
  });

  it('強度設定に応じて振動パターンが変わる', async () => {
    const { guidance, sessionRepo, startGuidance } = createMocks();
    // low 強度の設定を返す
    const settingsRepo: SettingsRepository = {
      get: jest.fn().mockResolvedValue({
        ...defaultSettings,
        intensity: 'low',
      }),
      save: jest.fn(),
    };
    const useCase = new SessionUseCase(guidance, settingsRepo, sessionRepo);

    await useCase.start({ mode: 'VIBRATION' });
    expect(startGuidance).toHaveBeenCalledWith(
      expect.objectContaining({ vibrationPattern: [80] }),
      expect.any(Object)
    );
  });

  it('二重開始を防ぎ、not_activeでstopを拒否する', async () => {
    const { guidance, settingsRepo, sessionRepo, startGuidance } = createMocks();
    const useCase = new SessionUseCase(guidance, settingsRepo, sessionRepo);

    await useCase.start({ mode: 'VIBRATION' });
    const second = await useCase.start({ mode: 'VIBRATION' });
    expect(second.ok).toBe(false);
    expect(second.error).toBe('already_active');
    expect(startGuidance).toHaveBeenCalledTimes(1);

    const stop = await useCase.stop();
    expect(stop.ok).toBe(true);

    const stop2 = await useCase.stop();
    expect(stop2.ok).toBe(false);
    expect(stop2.error).toBe('not_active');
  });

  it('ガイド終了(onComplete)でactiveを解除し、再度開始できる', async () => {
    const { guidance, settingsRepo, sessionRepo, startGuidance } = createMocks();
    const useCase = new SessionUseCase(guidance, settingsRepo, sessionRepo);

    await useCase.start({ mode: 'VIBRATION' }, {} as GuidanceListener);
    const listener = startGuidance.mock.calls[0][1] as GuidanceListener;
    listener.onComplete?.(); // 自動停止想定
    expect(useCase.isActive()).toBe(false);

    const res = await useCase.start({ mode: 'VIBRATION' });
    expect(res.ok).toBe(true);
    expect(startGuidance).toHaveBeenCalledTimes(2);
  });
});

describe('SessionUseCase complete', () => {
  it('開始・停止後に完了入力を保存する', async () => {
    const { guidance, settingsRepo, sessionRepo } = createMocks();
    const save = jest.fn().mockResolvedValue(undefined);
    sessionRepo.save = save;
    const useCase = new SessionUseCase(guidance, settingsRepo, sessionRepo);

    await useCase.start({ mode: 'VIBRATION' });
    await useCase.stop();
    const input = {
      guideType: 'VIBRATION' as const,
      preHr: 80,
      postHr: 70,
      improvement: 5,
      bpm: 60,
      breathConfig: null,
    };
    const res = await useCase.complete(input);
    expect(res.ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    const record = save.mock.calls[0][0] as SessionRecord;
    expect(record.guideType).toBe('VIBRATION');
    expect(record.bpm).toBe(60);
    expect(record.preHr).toBe(80);
    expect(record.postHr).toBe(70);
    expect(record.improvement).toBe(5);
    expect(record.startedAt).toBeTruthy();
    expect(record.endedAt).toBeTruthy();
    expect(record.recordedAt).toBeTruthy();
    if (record.startedAt && record.endedAt) {
      expect(new Date(record.startedAt).getTime()).toBeLessThanOrEqual(new Date(record.endedAt).getTime());
    }
  });

  it('開始前の記録も保存でき、開始/終了時刻は空で扱う', async () => {
    const { guidance, settingsRepo, sessionRepo } = createMocks();
    const save = jest.fn().mockResolvedValue(undefined);
    sessionRepo.save = save;
    const useCase = new SessionUseCase(guidance, settingsRepo, sessionRepo);

    const res = await useCase.complete({ guideType: 'VIBRATION', preHr: 72 });
    expect(res.ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    const record = save.mock.calls[0][0] as SessionRecord;
    expect(record.startedAt).toBeNull();
    expect(record.endedAt).toBeNull();
    expect(record.recordedAt).toBeTruthy();
  });
});
