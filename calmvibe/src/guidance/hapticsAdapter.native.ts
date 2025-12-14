import * as Haptics from 'expo-haptics';
import { HapticsAdapter, Result } from './types';

export class NativeHapticsAdapter implements HapticsAdapter {
  private timers: NodeJS.Timeout[] = [];

  async playPattern(patternMs: number[], amplitudes?: number[]): Promise<Result> {
    this.clearTimers();
    patternMs.forEach((delay, index) => {
      const amp = amplitudes?.[index];
      const style = amp && amp > 66 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium;
      const timer = setTimeout(() => {
        Haptics.impactAsync(style).catch(() => {});
      }, delay);
      this.timers.push(timer);
    });
    return { ok: true };
  }

  async stop(): Promise<Result> {
    this.clearTimers();
    return { ok: true };
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
