export type GuidanceMode = 'VIBRATION' | 'BREATH';

export type GuidanceConfig = {
  mode: GuidanceMode;
  bpm?: number; // 振動モードで使用 (40-90)
  vibrationPattern?: number[]; // 振動モード: 通常 [0]
  durationSec: number; // 振動モードの時間 or 呼吸モードの上限時間
  visualEnabled: boolean;
  breath?: {
    inhaleMs: number;
    holdMs?: number;
    exhaleMs: number;
    cycles: number | null;
    haptics?: { pattern: number[] };
  };
};

export type GuidanceStep = {
  elapsedSec: number;
  cycle: number;
  phase?: 'INHALE' | 'HOLD' | 'EXHALE' | 'PULSE';
};

export type GuidanceListener = {
  onStep?: (step: GuidanceStep) => void;
  onComplete?: () => void;
  onStop?: () => void;
};

export type Result = { ok: true } | { ok: false; error: string };

export interface HapticsAdapter {
  play(pattern: number[], amplitudes?: number[]): Promise<Result>;
  stop(): Promise<Result>;
}

export interface GuidanceEngine {
  startGuidance(config: GuidanceConfig, listener?: GuidanceListener): Promise<Result>;
  stopGuidance(): Promise<Result>;
  isActive(): boolean;
  updateVibrationBpm?(bpm: number): Promise<Result>;
}
