import { HapticsAdapter, Result } from './types';

// Webではハプティクスが無効なためダミーで成功を返す
export class NativeHapticsAdapter implements HapticsAdapter {
  async playPattern(): Promise<Result> {
    return { ok: true };
  }
  async stop(): Promise<Result> {
    return { ok: true };
  }
}
