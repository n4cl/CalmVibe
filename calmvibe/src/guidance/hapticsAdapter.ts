import * as ExpoHaptics from 'expo-haptics';
import { HapticsAdapter, Result } from './types';

/**
 * expo-haptics に依存するアダプタ。プラットフォームで無効/拒否された場合は error を返す。
 */
export class ExpoHapticsAdapter implements HapticsAdapter {
  async play(pattern: number[]): Promise<Result> {
    try {
      if (pattern.length === 0) return { ok: true };
      await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: this.mapError(e) };
    }
  }

  async stop(): Promise<Result> {
    // expo-haptics に停止APIはないため成功扱いで返す
    return { ok: true };
  }

  private mapError(e: any): string {
    const msg = `${e}`;
    if (msg.includes('denied') || msg.includes('permission')) return 'permission';
    if (msg.includes('disabled')) return 'disabled';
    return 'unknown';
  }
}
