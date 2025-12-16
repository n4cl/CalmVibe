import { GuidanceEngine, GuidanceListener } from '../guidance';
import { SettingsRepository } from '../settings/types';
import { SessionRecord, SessionRepository } from './types.ts';

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
  private startedAt: number | null = null;

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
    this.startedAt = Date.now();
    const wrappedListener = this.wrapListener(listener);

    const config =
      input.mode === 'VIBRATION'
        ? {
            mode: 'VIBRATION' as const,
            bpm: settings.bpm,
            durationSec,
            visualEnabled: true,
            vibrationPattern: [50], // 50ms パルス
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
              haptics: { pattern: [50] },
            },
          };

    const res = await this.guidance.startGuidance(config, wrappedListener);
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
    if (!this.startedAt) return { ok: false, error: 'not_started' };
    const endedAt = Date.now();
    const record: SessionRecord = {
      id: `${endedAt}`,
      startedAt: new Date(this.startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      guideType: input.guideType,
      bpm: input.bpm,
      preHr: input.preHr,
      postHr: input.postHr,
      comfort: input.comfort,
      improvement: input.improvement,
      breathConfig: input.breathConfig,
    };
    await this.sessionRepo.save(record);
    this.active = false;
    this.startedAt = null;
    return { ok: true };
  }

  private wrapListener(listener?: GuidanceListener): GuidanceListener | undefined {
    if (!listener) {
      return {
        onComplete: () => {
          this.active = false;
        },
        onStop: () => {
          this.active = false;
        },
      };
    }
    return {
        onStep: (s) => listener.onStep?.(s),
        onComplete: () => {
          this.active = false;
          listener.onComplete?.();
        },
        onStop: () => {
          this.active = false;
          listener.onStop?.();
        },
      };
  }
}
