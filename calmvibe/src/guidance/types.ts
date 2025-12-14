export type TempoPreset = '4-6-4' | '5-5-5' | '4-4-4';

export type GuidanceMode = 'BREATH' | 'VIBRATION';

export type GuidanceConfig = {
  mode: GuidanceMode;
  tempo: TempoPreset;
  durationSec: number;
  vibrationPattern?: number[]; // ms単位
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
