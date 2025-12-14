import { GuidanceConfig, GuidanceEngine, GuidanceListener, HapticsAdapter, Result } from './types';

export class SimpleGuidanceEngine implements GuidanceEngine {
  private adapter: HapticsAdapter;
  private listener?: GuidanceListener;
  private interval: NodeJS.Timeout | null = null;
  private endTimeout: NodeJS.Timeout | null = null;
  private active = false;
  private startAt = 0;
  private intervalMs = 0;

  constructor(adapter: HapticsAdapter) {
    this.adapter = adapter;
  }

  isActive(): boolean {
    return this.active;
  }

  async startGuidance(config: GuidanceConfig, listener?: GuidanceListener): Promise<Result> {
    if (this.active) return { ok: false, error: 'already_running' };
    if (config.durationSec <= 0) return { ok: false, error: 'invalid_duration' };
    if (config.bpm <= 0) return { ok: false, error: 'invalid_bpm' };

    this.listener = listener;
    this.active = true;
    this.startAt = Date.now();
    this.intervalMs = Math.max(1, Math.round(60000 / config.bpm));

    // 最初のトリガー
    await this.adapter.playPattern(config.vibrationPattern ?? [0]);
    this.listener?.onStep?.({ elapsedSec: 0, cycle: 0 });

    this.endTimeout = setTimeout(() => {
      this.stopGuidanceInternal(false);
      this.listener?.onComplete?.();
    }, config.durationSec * 1000);

    let plannedNext = this.startAt + this.intervalMs;
    this.interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - this.startAt;
      if (elapsedMs >= config.durationSec * 1000) return;
      const cycle = Math.floor(elapsedMs / this.intervalMs);
      void this.adapter.playPattern(config.vibrationPattern ?? [0]);
      this.listener?.onStep?.({ elapsedSec: Math.floor(elapsedMs / 1000), cycle });
      // 簡易補正: 次回予定を更新し、遅延があれば差分を引く
      plannedNext += this.intervalMs;
      const drift = now - plannedNext;
      if (drift > 5) {
        plannedNext = now + this.intervalMs - drift;
      }
    }, this.intervalMs);

    return { ok: true };
  }

  async stopGuidance(): Promise<Result> {
    await this.stopGuidanceInternal(true);
    this.listener?.onStop?.();
    return { ok: true };
  }

  private async stopGuidanceInternal(fromStop: boolean) {
    if (!this.active) return;
    if (this.interval) clearInterval(this.interval);
    if (this.endTimeout) clearTimeout(this.endTimeout);
    this.interval = null;
    this.endTimeout = null;
    this.active = false;
    if (fromStop) {
      await this.adapter.stop();
    }
  }
}
