import { GuidanceListener, SimpleGuidanceEngine, ExpoHapticsAdapter } from '../guidance';
import { SettingsRepository, SettingsValues } from '../settings/types';
import { SqliteSettingsRepository } from '../settings/sqliteRepository';
import { SessionUseCase } from './useCase';
import { SqliteSessionRepository } from './sqliteRepository';
import { RecordDraft } from './types';

type SessionRunningState = 'none' | 'vibration' | 'breath';
type SessionMode = 'VIBRATION' | 'BREATH';
type GuidePhase = 'INHALE' | 'HOLD' | 'EXHALE' | 'PULSE';

type SessionState = {
  loading: boolean;
  saving: boolean;
  values: SettingsValues | null;
  running: SessionRunningState;
  phase: GuidePhase;
  guideTick: number;
  selectedMode: SessionMode;
  recordVisible: boolean;
  recordDraft: RecordDraft | null;
  settingsError: string | null;
  hapticsNotice: string | null;
};

type ViewModelDeps = {
  settingsRepo?: SettingsRepository;
  useCase?: SessionUseCase;
};

const initialState: SessionState = {
  loading: true,
  saving: false,
  values: null,
  running: 'none',
  phase: 'PULSE',
  guideTick: 0,
  selectedMode: 'VIBRATION',
  recordVisible: false,
  recordDraft: null,
  settingsError: null,
  hapticsNotice: null,
};

export class SessionViewModel {
  private state: SessionState = { ...initialState };
  private listeners = new Set<() => void>();
  private settingsRepo: SettingsRepository;
  private useCase: SessionUseCase;
  private loaded = false;

  constructor(deps: ViewModelDeps = {}) {
    this.settingsRepo = deps.settingsRepo ?? new SqliteSettingsRepository();
    this.useCase =
      deps.useCase ??
      new SessionUseCase(
        new SimpleGuidanceEngine(new ExpoHapticsAdapter()),
        this.settingsRepo,
        new SqliteSessionRepository()
      );
  }

  getState(): SessionState {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(updater: (prev: SessionState) => SessionState) {
    this.state = updater(this.state);
    this.listeners.forEach((listener) => listener());
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    const loaded = await this.settingsRepo.get();
    this.setState((prev) => ({
      ...prev,
      values: loaded,
      loading: false,
    }));
  }

  setSelectedMode(mode: SessionMode) {
    this.setState((prev) => ({
      ...prev,
      selectedMode: mode,
      phase: this.resetPhaseForMode(mode),
      guideTick: prev.guideTick + 1,
    }));
  }

  changeBpm(delta: number) {
    this.setState((prev) => {
      if (!prev.values) return prev;
      const next = Math.min(120, Math.max(40, prev.values.bpm + delta));
      if (prev.running === 'vibration') {
        void this.useCase.updateVibrationBpm?.(next);
      }
      return { ...prev, values: { ...prev.values, bpm: next } };
    });
  }

  changeDuration(delta: number) {
    this.setState((prev) => {
      if (!prev.values) return prev;
      if (prev.values.durationSec === null) return prev;
      const next = Math.min(300, Math.max(60, prev.values.durationSec + delta));
      return { ...prev, values: { ...prev.values, durationSec: next } };
    });
  }

  toggleDurationInfinite() {
    this.setState((prev) => {
      if (!prev.values) return prev;
      return {
        ...prev,
        values: {
          ...prev.values,
          durationSec: prev.values.durationSec === null ? 180 : null,
        },
      };
    });
  }

  setBreath(breath: SettingsValues['breath']) {
    this.setState((prev) => {
      if (!prev.values) return prev;
      return { ...prev, values: { ...prev.values, breath } };
    });
  }

  changeBreathField(key: 'inhaleSec' | 'holdSec' | 'exhaleSec', delta: number) {
    this.setState((prev) => {
      if (!prev.values) return prev;
      if (prev.values.breath.type === 'two-phase' && key === 'holdSec') return prev;
      const next = Math.max(1, (prev.values.breath as any)[key] + delta);
      return { ...prev, values: { ...prev.values, breath: { ...prev.values.breath, [key]: next } as any } };
    });
  }

  changeCycles(delta: number | 'inf') {
    this.setState((prev) => {
      if (!prev.values) return prev;
      if (delta === 'inf') {
        return { ...prev, values: { ...prev.values, breath: { ...prev.values.breath, cycles: null } } };
      }
      const current = prev.values.breath.cycles ?? 0;
      const next = Math.max(1, current + delta);
      return { ...prev, values: { ...prev.values, breath: { ...prev.values.breath, cycles: next } } };
    });
  }

  async saveSettings() {
    if (!this.state.values) return { ok: false, error: 'no_values' } as const;
    const error = validateSettings(this.state.values);
    if (error) {
      this.setState((prev) => ({ ...prev, settingsError: error }));
      return { ok: false, error: 'invalid' } as const;
    }
    this.setState((prev) => ({ ...prev, saving: true }));
    const saved = await retryOnce(() => this.settingsRepo.save(this.state.values!));
    this.setState((prev) => ({ ...prev, saving: false }));
    if (!saved) return { ok: false, error: 'save_failed' } as const;
    this.setState((prev) => ({ ...prev, settingsError: null }));
    return { ok: true } as const;
  }

  async start() {
    if (!this.state.values || this.state.running !== 'none') return { ok: false, error: 'already_running' } as const;
    this.setState((prev) => ({ ...prev, hapticsNotice: null }));
    const res = await this.useCase.start({ mode: this.state.selectedMode }, this.createListener());
    if (!res.ok) return res;
    this.setState((prev) => ({
      ...prev,
      running: this.state.selectedMode === 'VIBRATION' ? 'vibration' : 'breath',
      phase: this.resetPhaseForMode(this.state.selectedMode),
      guideTick: prev.guideTick + 1,
    }));
    return { ok: true } as const;
  }

  async stop() {
    if (this.state.running === 'none') return { ok: false, error: 'not_running' } as const;
    await this.useCase.stop();
    this.setState((prev) => ({
      ...prev,
      running: 'none',
      phase: this.resetPhaseForMode(prev.selectedMode),
      guideTick: prev.guideTick + 1,
    }));
    return { ok: true } as const;
  }

  openRecord() {
    const values = this.state.values;
    const mode = this.state.running === 'vibration' ? 'VIBRATION' : this.state.running === 'breath' ? 'BREATH' : this.state.selectedMode;
    const draft: RecordDraft = {
      guideType: mode,
      bpm: mode === 'VIBRATION' ? values?.bpm : undefined,
      breathSummary: mode === 'BREATH' && values ? buildBreathSummary(values) : undefined,
      preHr: '',
      postHr: '',
      improvement: '',
    };
    this.setState((prev) => ({
      ...prev,
      recordDraft: draft,
      recordVisible: true,
    }));
  }

  closeRecord() {
    this.setState((prev) => ({ ...prev, recordVisible: false }));
  }

  updateRecordDraft(next: RecordDraft) {
    this.setState((prev) => ({ ...prev, recordDraft: next }));
  }

  updateGuideType(guideType: SessionMode) {
    this.setState((prev) => {
      if (!prev.values || !prev.recordDraft) return prev;
      return {
        ...prev,
        recordDraft: {
          ...prev.recordDraft,
          guideType,
          bpm: guideType === 'VIBRATION' ? prev.values.bpm : undefined,
          breathSummary: guideType === 'BREATH' ? buildBreathSummary(prev.values) : undefined,
        },
      };
    });
  }

  async saveRecord() {
    if (!this.state.recordDraft) return { ok: false, error: 'no_draft' } as const;
    const draft = this.state.recordDraft;
    const res = await this.useCase.complete({
      guideType: draft.guideType,
      bpm: draft.bpm,
      preHr: draft.preHr ? Number(draft.preHr) : undefined,
      postHr: draft.postHr ? Number(draft.postHr) : undefined,
      improvement: draft.improvement ? Number(draft.improvement) : undefined,
      breathConfig: draft.breathSummary,
    });
    if (!res.ok) return res;
    this.setState((prev) => ({ ...prev, recordVisible: false }));
    return { ok: true } as const;
  }

  private createListener(): GuidanceListener {
    return {
      onStep: (step) => {
        if (step.phase) {
          this.setState((prev) => ({ ...prev, phase: step.phase as GuidePhase, guideTick: prev.guideTick + 1 }));
        } else {
          this.setState((prev) => ({ ...prev, guideTick: prev.guideTick + 1 }));
        }
      },
      onComplete: () => {
        this.setState((prev) => ({
          ...prev,
          running: 'none',
          phase: this.resetPhaseForMode(prev.selectedMode),
          guideTick: prev.guideTick + 1,
        }));
      },
      onStop: () => {
        this.setState((prev) => ({
          ...prev,
          running: 'none',
          phase: this.resetPhaseForMode(prev.selectedMode),
          guideTick: prev.guideTick + 1,
        }));
      },
      onHapticsError: () => {
        this.setState((prev) =>
          prev.hapticsNotice
            ? prev
            : { ...prev, hapticsNotice: '振動が利用できないため、視覚ガイドのみで継続します。' }
        );
      },
    };
  }

  private resetPhaseForMode(mode: SessionMode) {
    return mode === 'VIBRATION' ? 'PULSE' : 'INHALE';
  }
}

let singleton: SessionViewModel | null = null;

export const getSessionViewModel = () => {
  if (!singleton) {
    singleton = new SessionViewModel();
  }
  return singleton;
};

const validateSettings = (values: SettingsValues) => {
  if (values.bpm < 40 || values.bpm > 120) {
    return 'BPMは40〜120の範囲で入力してください';
  }
  if (values.durationSec !== null && (values.durationSec < 60 || values.durationSec > 300)) {
    return '時間は60〜300秒の範囲で入力してください';
  }
  if (values.breath.cycles !== null && values.breath.cycles < 1) {
    return 'サイクルは1以上で入力してください';
  }
  if (values.breath.inhaleSec < 1 || values.breath.exhaleSec < 1) {
    return '呼吸の秒数は1以上で入力してください';
  }
  if (values.breath.type === 'three-phase' && values.breath.holdSec < 1) {
    return '止める秒数は1以上で入力してください';
  }
  return null;
};

const retryOnce = async (fn: () => Promise<void>) => {
  try {
    await fn();
    return true;
  } catch {
    try {
      await fn();
      return true;
    } catch {
      return false;
    }
  }
};

const buildBreathSummary = (values: SettingsValues) =>
  values.breath.type === 'three-phase'
    ? `吸${values.breath.inhaleSec}-止${values.breath.holdSec}-吐${values.breath.exhaleSec}`
    : `吸${values.breath.inhaleSec}-吐${values.breath.exhaleSec}`;
