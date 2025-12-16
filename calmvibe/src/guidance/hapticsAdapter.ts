import * as ExpoHaptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';
import { HapticsAdapter, Result } from './types';

/**
 * expo-haptics に依存するアダプタ。プラットフォームで無効/拒否された場合は error を返す。
 */
export class ExpoHapticsAdapter implements HapticsAdapter {
  private normalizePattern(pattern: number[]): number[] {
    if (pattern.length === 0) return [];
    return pattern.some((p) => p > 0) ? pattern : [50];
  }

  async play(pattern: number[]): Promise<Result> {
    try {
      const normalizedPattern = this.normalizePattern(pattern);
      if (normalizedPattern.length === 0) return { ok: true };
      if (Platform.OS === 'android') {
        // Android は notificationAsync の方が鳴りやすい端末があるため併用
        await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
        // 体感を確実にするため 300ms の物理バイブを追加
        const pulse = normalizedPattern.length > 1 ? normalizedPattern : [300];
        Vibration.vibrate(pulse.length > 1 ? pulse : pulse[0]);
      } else {
        await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
      }
      return { ok: true };
    } catch (e: any) {
      // Android 実機で impactAsync が失敗する場合に備えてバイブレーションAPIでフォールバック
      if (Platform.OS === 'android') {
        try {
          const normalizedPattern = this.normalizePattern(pattern);
          Vibration.vibrate(normalizedPattern.length > 1 ? normalizedPattern : normalizedPattern[0]);
          return { ok: true };
        } catch (err: any) {
          return { ok: false, error: this.mapError(err) };
        }
      }
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
