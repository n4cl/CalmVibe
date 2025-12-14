import { GuidanceConfig, GuidanceEngine, GuidanceListener, HapticsAdapter, Result, TempoPreset } from './types';

const tempoSeconds: Record<TempoPreset, number> = {
  '4-6-4': 14,
  '5-5-5': 15,
  '4-4-4': 12,
};

export class SimpleGuidanceEngine implements GuidanceEngine {
  private adapter: HapticsAdapter;
  private listener?: GuidanceListener;
  private interval: NodeJS.Timeout | null = null;
  private endTimeout: NodeJS.Timeout | null = null;
  private active = false;
  private startAt = 0;
  private cycleMs = 0;

  constructor(adapter: HapticsAdapter) {
    this.adapter = adapter;
  }

  isActive(): boolean {
    return this.active;
  }

  async startGuidance(config: GuidanceConfig, listener?: GuidanceListener): Promise<Result> {
    if (this.active) return { ok: false, error: 'already_running' };
    if (config.durationSec <= 0) return { ok: false, error: 'invalid_duration' };

    this.listener = listener;
    this.active = true;
    this.startAt = Date.now();
    this.cycleMs = tempoSeconds[config.tempo] * 1000;

    // 最初のトリガー
    await this.adapter.playPattern(config.vibrationPattern ?? [0]);
    this.listener?.onStep?.({ elapsedSec: 0, cycle: 0 });

    this.endTimeout = setTimeout(() => {
      this.stopGuidanceInternal(false);
      this.listener?.onComplete?.();
    }, config.durationSec * 1000);

    this.interval = setInterval(() => {
      const elapsedMs = Date.now() - this.startAt;
      if (elapsedMs >= config.durationSec * 1000) return;
      const cycle = Math.floor(elapsedMs / this.cycleMs);
      void this.adapter.playPattern(config.vibrationPattern ?? [0]);
      this.listener?.onStep?.({ elapsedSec: Math.floor(elapsedMs / 1000), cycle });
    }, this.cycleMs);

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
