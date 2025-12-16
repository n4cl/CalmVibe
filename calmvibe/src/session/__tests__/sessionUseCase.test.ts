import { SessionUseCase } from '../useCase';
import { GuidanceEngine, GuidanceListener } from '../../guidance';
import { SettingsRepository, SettingsValues } from '../../settings/types';
import { SessionRepository } from '../types.ts';

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
      undefined
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
      undefined
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
});
