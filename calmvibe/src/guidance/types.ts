export type GuidanceMode = 'BREATH' | 'VIBRATION';

export type GuidanceConfig = {
  bpm: number; // 40-90
  durationSec: number;
  vibrationPattern: number[]; // ms 単位（1拍内での複数振動、通常は単発[0]）
  visualEnabled: boolean;
  breath?:
    | { type: 'two-phase'; inhaleSec: number; exhaleSec: number; cycles: number | null }
    | { type: 'three-phase'; inhaleSec: number; holdSec: number; exhaleSec: number; cycles: number | null };
};

export type GuidanceStep = {
  elapsedSec: number;
  cycle: number;
};

export type GuidanceListener = {
  onStep?: (step: GuidanceStep) => void;
  onComplete?: () => void;
  onStop?: () => void;
};

export type Result = { ok: true } | { ok: false; error: string };

export interface HapticsAdapter {
  playPattern(patternMs: number[], amplitudes?: number[]): Promise<Result>;
  stop(): Promise<Result>;
}

export interface GuidanceEngine {
  startGuidance(config: GuidanceConfig, listener?: GuidanceListener): Promise<Result>;
  stopGuidance(): Promise<Result>;
  isActive(): boolean;
}
