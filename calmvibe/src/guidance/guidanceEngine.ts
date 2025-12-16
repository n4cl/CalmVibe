import { GuidanceConfig, GuidanceEngine, GuidanceListener, HapticsAdapter, Result } from './types';

/**
 * 振動ガイド専用のシンプル実装。
 * - 単一アクティブ
 * - BPM間隔で単発振動（±5%を目標にドリフト補正）
 * - durationSec 経過で自動停止し onComplete を通知
 */
export class SimpleGuidanceEngine implements GuidanceEngine {
  private adapter: HapticsAdapter;
  private listener?: GuidanceListener;
  private timer: NodeJS.Timeout | null = null;
  private endTimer: NodeJS.Timeout | null = null;
  private active = false;
  private startAt = 0;
  private intervalMs = 0;
  private durationMs = 0;

  constructor(adapter: HapticsAdapter) {
    this.adapter = adapter;
  }

  isActive(): boolean {
    return this.active;
  }

  async startGuidance(config: GuidanceConfig, listener?: GuidanceListener): Promise<Result> {
    if (this.active) return { ok: false, error: 'already_running' };
    if (config.durationSec <= 0) return { ok: false, error: 'invalid_duration' };
    if (config.mode !== 'VIBRATION') return { ok: false, error: 'unsupported_mode' };
    if (!config.bpm || config.bpm <= 0) return { ok: false, error: 'invalid_bpm' };

    this.listener = listener;
    this.active = true;
    this.startAt = Date.now();
    this.intervalMs = Math.max(10, Math.round(60000 / config.bpm));
    this.durationMs = config.durationSec * 1000;

    await this.playOnce(config);
    this.endTimer = setTimeout(() => {
      if (!this.active) return;
      this.stopInternal();
      this.listener?.onComplete?.();
    }, this.durationMs);
    this.loop(config, this.startAt + this.intervalMs);

    return { ok: true };
  }

  async stopGuidance(): Promise<Result> {
    this.stopInternal();
    await this.adapter.stop();
    this.listener?.onStop?.();
    return { ok: true };
  }

  private async playOnce(config: GuidanceConfig, cycle: number = 0) {
    const pattern = config.vibrationPattern ?? [];
    if (pattern.length > 0) {
      await this.adapter.play(pattern);
    }
    const elapsedSec = Math.floor((Date.now() - this.startAt) / 1000);
    this.listener?.onStep?.({ elapsedSec, cycle });
  }

  private loop(config: GuidanceConfig, plannedNext: number) {
    const tick = async () => {
      if (!this.active) return;
      const now = Date.now();
      const elapsed = now - this.startAt;
      if (elapsed >= this.durationMs) return;
      const cycle = Math.floor(elapsed / this.intervalMs);
      await this.playOnce(config, cycle);
      plannedNext += this.intervalMs;
      const drift = Date.now() - plannedNext;
      const nextDelay = Math.max(0, this.intervalMs - drift);
      this.timer = setTimeout(tick, nextDelay);
    };
    this.timer = setTimeout(tick, this.intervalMs);
  }

  private stopInternal() {
    if (!this.active) return;
    if (this.timer) clearTimeout(this.timer);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
    this.timer = null;
    this.active = false;
  }
}
