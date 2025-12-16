import { GuidanceEngine, GuidanceListener } from '../guidance';
import { SettingsRepository } from '../settings/types';
import { SessionRepository } from './types';

export type StartInput = { mode: 'VIBRATION' | 'BREATH' };

export type CompleteInput = {
  preHr?: number;
  postHr?: number;
  guideType: 'VIBRATION' | 'BREATH';
  comfort?: number;
  improvement?: number;
  breathConfig?: any;
  bpm?: number;
};

type Result = { ok: true } | { ok: false; error: string };

export class SessionUseCase {
  private guidance: GuidanceEngine;
  private settingsRepo: SettingsRepository;
  private sessionRepo: SessionRepository;
  private active = false;

  constructor(guidance: GuidanceEngine, settingsRepo: SettingsRepository, sessionRepo: SessionRepository) {
    this.guidance = guidance;
    this.settingsRepo = settingsRepo;
    this.sessionRepo = sessionRepo;
  }

  isActive() {
    return this.active;
  }

  async start(input: StartInput, listener?: GuidanceListener): Promise<Result> {
    if (this.active) return { ok: false, error: 'already_active' };
    const settings = await this.settingsRepo.get();
    const durationSec = settings.durationSec ?? 3600; // 無制限時の上限は1h仮置き

    const config =
      input.mode === 'VIBRATION'
        ? {
            mode: 'VIBRATION' as const,
            bpm: settings.bpm,
            durationSec,
            visualEnabled: true,
            vibrationPattern: [0],
          }
        : {
            mode: 'BREATH' as const,
            durationSec,
            visualEnabled: true,
            breath: {
              inhaleMs: settings.breath.inhaleSec * 1000,
              holdMs: settings.breath.type === 'three-phase' ? settings.breath.holdSec * 1000 : undefined,
              exhaleMs: settings.breath.exhaleSec * 1000,
              cycles: settings.breath.cycles === null ? null : settings.breath.cycles,
              haptics: { pattern: [0] },
            },
          };

    const res = await this.guidance.startGuidance(config, listener);
    if (!res.ok) return res;
    this.active = true;
    return { ok: true };
  }

  async stop(): Promise<Result> {
    if (!this.active) return { ok: false, error: 'not_active' };
    await this.guidance.stopGuidance();
    this.active = false;
    return { ok: true };
  }

  async complete(input: CompleteInput): Promise<Result> {
    // NOTE: 記録保存はタスク4.2/4.3で実装予定。ここではOKのみ返す。
    this.active = false;
    return { ok: true };
  }
}
