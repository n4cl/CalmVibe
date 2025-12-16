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
    this.listener = listener;
    this.active = true;
    this.startAt = Date.now();
    this.durationMs = config.durationSec * 1000;

    if (config.mode === 'VIBRATION') {
      if (!config.bpm || config.bpm <= 0) return { ok: false, error: 'invalid_bpm' };
      this.intervalMs = Math.max(10, Math.round(60000 / config.bpm));
      await this.playOnce(config, 'PULSE');
      this.scheduleEndTimer();
      this.loopVibration(config, this.startAt + this.intervalMs);
      return { ok: true };
    }

    if (config.mode === 'BREATH') {
      const breath = config.breath;
      if (!breath) return { ok: false, error: 'invalid_breath' };
      const { inhaleMs, exhaleMs, holdMs } = breath;
      if (inhaleMs <= 0 || exhaleMs <= 0 || (holdMs !== undefined && holdMs < 0)) return { ok: false, error: 'invalid_breath' };
      this.scheduleEndTimer();
      this.loopBreath(config);
      return { ok: true };
    }

    return { ok: false, error: 'unsupported_mode' };
  }

  async stopGuidance(): Promise<Result> {
    this.stopInternal();
    await this.adapter.stop();
    this.listener?.onStop?.();
    return { ok: true };
  }

  private scheduleEndTimer() {
    this.endTimer = setTimeout(() => {
      if (!this.active) return;
      this.stopInternal();
      this.listener?.onComplete?.();
    }, this.durationMs);
  }

  private async playOnce(config: GuidanceConfig, phase: GuidanceStep['phase'], cycle: number = 0) {
    const pattern = config.vibrationPattern ?? [];
    if (pattern.length > 0) {
      await this.adapter.play(pattern);
    }
    const elapsedSec = Math.floor((Date.now() - this.startAt) / 1000);
    this.listener?.onStep?.({ elapsedSec, cycle, phase });
  }

  private loopVibration(config: GuidanceConfig, plannedNext: number) {
    const tick = async () => {
      if (!this.active) return;
      const now = Date.now();
      const elapsed = now - this.startAt;
      if (elapsed >= this.durationMs) return;
      const cycle = Math.floor(elapsed / this.intervalMs);
      await this.playOnce(config, 'PULSE', cycle);
      plannedNext += this.intervalMs;
      const drift = Date.now() - plannedNext;
      const nextDelay = Math.max(0, this.intervalMs - drift);
      this.timer = setTimeout(tick, nextDelay);
    };
    this.timer = setTimeout(tick, this.intervalMs);
  }

  private loopBreath(config: GuidanceConfig) {
    const breath = config.breath as NonNullable<GuidanceConfig['breath']>;
    const phases: Array<{ phase: GuidanceStep['phase']; duration: number; pattern?: number[] }> = [
      { phase: 'INHALE', duration: breath.inhaleMs, pattern: breath.haptics?.pattern },
      ...(breath.holdMs ? [{ phase: 'HOLD', duration: breath.holdMs, pattern: breath.haptics?.pattern }] : []),
      { phase: 'EXHALE', duration: breath.exhaleMs, pattern: breath.haptics?.pattern },
    ];
    let cycle = 0;
    let phaseIndex = 0;
    const tick = () => {
      if (!this.active) return;
      const current = phases[phaseIndex];
      const patternBackup = config.vibrationPattern;
      config.vibrationPattern = current.pattern ?? config.vibrationPattern;
      void this.playOnce(config, current.phase, cycle);
      config.vibrationPattern = patternBackup;
      phaseIndex += 1;
      if (phaseIndex >= phases.length) {
        phaseIndex = 0;
        cycle += 1;
        if (breath.cycles !== null && breath.cycles !== undefined && cycle >= breath.cycles) {
          this.stopInternal();
          this.listener?.onComplete?.();
          return;
        }
      }
      const duration = current.duration;
      this.timer = setTimeout(tick, duration);
    };
    tick();
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
