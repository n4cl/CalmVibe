import { GuidanceEngine, GuidanceListener } from '../guidance';
import { SettingsRepository } from '../settings/types';
import { SessionRecord, SessionRepository } from './types.ts';

export type StartInput = { mode: 'VIBRATION' | 'BREATH' };

export type CompleteInput = {
  preHr?: number;
  postHr?: number;
  guideType: 'VIBRATION' | 'BREATH';
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
  private currentMode: StartInput['mode'] | null = null;

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

    const intensityToMs = (intensity: SettingsValues['intensity']) => {
      switch (intensity) {
        case 'low':
          return 80;
        case 'strong':
          return 250;
        case 'medium':
        default:
          return 150;
      }
    };
    const pulseMs = intensityToMs(settings.intensity);

    const config =
      input.mode === 'VIBRATION'
        ? {
            mode: 'VIBRATION' as const,
            bpm: settings.bpm,
            durationSec,
            visualEnabled: true,
            vibrationPattern: [pulseMs],
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
              haptics: { pattern: [pulseMs] },
            },
          };

    const res = await this.guidance.startGuidance(config, wrappedListener);
    if (!res.ok) return res;
    this.active = true;
    this.currentMode = input.mode;
    return { ok: true };
  }

  async stop(): Promise<Result> {
    if (!this.active) return { ok: false, error: 'not_active' };
    await this.guidance.stopGuidance();
    this.active = false;
    this.currentMode = null;
    return { ok: true };
  }

  async complete(input: CompleteInput): Promise<Result> {
    const recordedAt = Date.now();
    const startedAtIso = this.startedAt ? new Date(this.startedAt).toISOString() : null;
    const endedAtIso = this.startedAt ? new Date(recordedAt).toISOString() : null;
    const record: SessionRecord = {
      id: `${recordedAt}`,
      recordedAt: new Date(recordedAt).toISOString(),
      startedAt: startedAtIso,
      endedAt: endedAtIso,
      guideType: input.guideType,
      bpm: input.bpm,
      preHr: input.preHr,
      postHr: input.postHr,
      improvement: input.improvement,
      breathConfig: input.breathConfig,
    };
    await this.sessionRepo.save(record);
    if (!this.active) {
      this.startedAt = null;
      this.currentMode = null;
    }
    return { ok: true };
  }

  async updateVibrationBpm(bpm: number): Promise<Result> {
    if (!this.active || this.currentMode !== 'VIBRATION') return { ok: false, error: 'not_vibration_active' };
    if (typeof this.guidance.updateVibrationBpm !== 'function') return { ok: false, error: 'unsupported' };
    return await this.guidance.updateVibrationBpm(bpm);
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
