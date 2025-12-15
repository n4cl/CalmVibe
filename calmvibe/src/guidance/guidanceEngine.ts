import { GuidanceConfig, GuidanceEngine, GuidanceListener, HapticsAdapter, Result } from './types';

export class SimpleGuidanceEngine implements GuidanceEngine {
  private adapter: HapticsAdapter;
  private listener?: GuidanceListener;
  private timer: NodeJS.Timeout | null = null;
  private endTimer: NodeJS.Timeout | null = null;
  private active = false;
  private intervalMs = 0;
  private startAt = 0;

  constructor(adapter: HapticsAdapter) {
    this.adapter = adapter;
  }

  isActive(): boolean {
    return this.active;
  }

  async startGuidance(config: GuidanceConfig, listener?: GuidanceListener): Promise<Result> {
    if (this.active) return { ok: false, error: 'already_running' };
    if (config.durationSec <= 0) return { ok: false, error: 'invalid_duration' };
    if (config.mode === 'VIBRATION' && (!config.bpm || config.bpm <= 0)) return { ok: false, error: 'invalid_bpm' };

    this.listener = listener;
    this.active = true;
    this.startAt = Date.now();
    this.intervalMs = config.mode === 'VIBRATION' ? Math.max(1, Math.round(60000 / (config.bpm as number))) : 0;

    if (config.mode === 'VIBRATION') {
      await this.runVibration(config);
    } else {
      this.active = false;
      return { ok: false, error: 'unsupported_mode' };
    }

    return { ok: true };
  }

  async stopGuidance(): Promise<Result> {
    await this.stopInternal(true);
    this.listener?.onStop?.();
    return { ok: true };
  }

  private async runVibration(config: GuidanceConfig) {
    const pattern = config.vibrationPattern ?? [];

    // 初回
    if (pattern.length > 0) await this.adapter.play(pattern);
    this.listener?.onStep?.({ elapsedSec: 0, cycle: 0 });

    // 終了タイマー
    this.endTimer = setTimeout(() => {
      this.stopInternal(false);
      this.listener?.onComplete?.();
    }, config.durationSec * 1000);

    // ドリフト補正付きループ
    let plannedNext = this.startAt + this.intervalMs;
    const tick = async () => {
      if (!this.active) return;
      const now = Date.now();
      const elapsedMs = now - this.startAt;
      if (elapsedMs >= config.durationSec * 1000) return;
      const cycle = Math.floor(elapsedMs / this.intervalMs); // 初回0送信済みなのでそのまま
      if (pattern.length > 0) await this.adapter.play(pattern);
      this.listener?.onStep?.({ elapsedSec: Math.floor(elapsedMs / 1000), cycle });
      plannedNext += this.intervalMs;
      const drift = now - plannedNext;
      const nextDelay = Math.max(0, this.intervalMs - drift);
      this.timer = setTimeout(tick, nextDelay);
    };
    this.timer = setTimeout(tick, this.intervalMs);
  }

  private async stopInternal(fromStop: boolean) {
    if (!this.active) return;
    if (this.timer) clearTimeout(this.timer);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.timer = null;
    this.endTimer = null;
    this.active = false;
    if (fromStop) await this.adapter.stop();
  }
}
