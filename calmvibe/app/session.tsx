import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { VisualGuide, GuidePhase } from './session/_visualGuide';
import { SettingsRepository, SettingsValues, BreathPattern } from '../src/settings/types';
import { SqliteSettingsRepository } from '../src/settings/sqliteRepository';
import { GuidanceListener, SimpleGuidanceEngine, ExpoHapticsAdapter } from '../src/guidance';
import { SessionUseCase } from '../src/session/useCase';
import { SqliteSessionRepository } from '../src/session/sqliteRepository';
import RecordModal, { RecordDraft } from '../components/record-modal';

export type SessionScreenProps = {
  settingsRepo?: SettingsRepository;
  useCase?: SessionUseCase;
};

const breathPresets: { label: string; pattern: BreathPattern }[] = [
  { label: '4-4 (5回)', pattern: { type: 'two-phase', inhaleSec: 4, exhaleSec: 4, cycles: 5 } },
  { label: '4-6-4 (5回)', pattern: { type: 'three-phase', inhaleSec: 4, holdSec: 6, exhaleSec: 4, cycles: 5 } },
];

const buildBreathSummary = (values: SettingsValues) =>
  values.breath.type === 'three-phase'
    ? `吸${values.breath.inhaleSec}-止${values.breath.holdSec}-吐${values.breath.exhaleSec}`
    : `吸${values.breath.inhaleSec}-吐${values.breath.exhaleSec}`;

export default function SessionScreen({ settingsRepo, useCase: injectedUseCase }: SessionScreenProps) {
  const repo = useMemo<SettingsRepository>(() => settingsRepo ?? new SqliteSettingsRepository(), [settingsRepo]);
  const useCase = useMemo<SessionUseCase>(
    () =>
      injectedUseCase ??
      new SessionUseCase(
        new SimpleGuidanceEngine(new ExpoHapticsAdapter()),
        repo,
        new SqliteSessionRepository()
      ),
    [repo, injectedUseCase]
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<SettingsValues | null>(null);
  const [running, setRunning] = useState<'none' | 'vibration' | 'breath'>('none');
  const [phase, setPhase] = useState<GuidePhase>('PULSE');
  const [guideTick, setGuideTick] = useState(0);
  const runningRef = React.useRef<'none' | 'vibration' | 'breath'>('none');
  const [selectedMode, setSelectedMode] = useState<'VIBRATION' | 'BREATH'>('VIBRATION');
  const [recordVisible, setRecordVisible] = useState(false);
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null);
  const repeatTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRepeat = () => {
    if (repeatTimer.current) {
      clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
    }
  };
  const startRepeat = (fn: () => void) => {
    stopRepeat();
    repeatTimer.current = setTimeout(function tick() {
      fn();
      repeatTimer.current = setTimeout(tick, 120);
    }, 350);
  };
  useEffect(() => stopRepeat, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await repo.get();
      if (mounted) {
        setValues(loaded);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [repo]);

  const changeBpm = (delta: number) => {
    setValues((prev) => {
      if (!prev) return prev;
      const next = Math.min(90, Math.max(40, prev.bpm + delta));
      if (runningRef.current === 'vibration') {
        void useCase.updateVibrationBpm?.(next);
      }
      return { ...prev, bpm: next };
    });
  };

  const changeDuration = (delta: number) => {
    setValues((prev) => {
      if (!prev) return prev;
      if (prev.durationSec === null) return prev; // 無制限時はスキップ
      const next = Math.min(300, Math.max(60, prev.durationSec + delta));
      return { ...prev, durationSec: next };
    });
  };

  const toggleDurationInfinite = () => {
    setValues((prev) => {
      if (!prev) return prev;
      return { ...prev, durationSec: prev.durationSec === null ? 180 : null };
    });
  };

  const setBreath = (pattern: BreathPattern) => {
    if (!values) return;
    setValues({ ...values, breath: pattern });
  };

  const changeBreathField = (key: 'inhaleSec' | 'holdSec' | 'exhaleSec', delta: number) => {
    if (!values) return;
    if (values.breath.type === 'two-phase' && key === 'holdSec') return;
    const next = Math.max(1, (values.breath as any)[key] + delta);
    if (values.breath.type === 'two-phase') {
      setValues({ ...values, breath: { ...values.breath, [key]: next } as BreathPattern });
    } else {
      setValues({ ...values, breath: { ...values.breath, [key]: next } as BreathPattern });
    }
  };

  const changeCycles = (delta: number | 'inf') => {
    if (!values) return;
    if (delta === 'inf') {
      setValues({ ...values, breath: { ...values.breath, cycles: null } });
      return;
    }
    const current = values.breath.cycles ?? 0;
    const next = Math.max(1, current + delta);
    setValues({ ...values, breath: { ...values.breath, cycles: next } });
  };

  const save = async () => {
    if (!values) return;
    setSaving(true);
    await repo.save(values);
    setSaving(false);
  };

  const handleRecordGuideTypeChange = (guideType: 'VIBRATION' | 'BREATH', draft: RecordDraft) => {
    if (!values) return { ...draft, guideType };
    return {
      ...draft,
      guideType,
      bpm: guideType === 'VIBRATION' ? values.bpm : undefined,
      breathSummary: guideType === 'BREATH' ? buildBreathSummary(values) : undefined,
    };
  };

  const listener: GuidanceListener = {
    onStep: (step) => {
      if (step.phase) setPhase(step.phase as GuidePhase);
      setGuideTick((t) => t + 1);
    },
    onComplete: () => {
      setRunning('none');
      runningRef.current = 'none';
      setGuideTick((t) => t + 1);
    },
    onStop: () => {
      setRunning('none');
      runningRef.current = 'none';
      setGuideTick((t) => t + 1);
    },
  };

  const resetPhaseForMode = (mode: 'VIBRATION' | 'BREATH') => (mode === 'VIBRATION' ? 'PULSE' : 'INHALE');

  const stop = async () => {
    if (runningRef.current === 'none') return;
    await useCase.stop();
    setRunning('none');
    runningRef.current = 'none';
    setPhase(resetPhaseForMode(selectedMode));
    setGuideTick((t) => t + 1);
  };

  const start = async () => {
    if (!values || runningRef.current !== 'none') return;
    const res = await useCase.start({ mode: selectedMode }, listener);
    if (res.ok) {
      const runMode = selectedMode === 'VIBRATION' ? 'vibration' : 'breath';
      setRunning(runMode);
      runningRef.current = runMode;
      setPhase(selectedMode === 'VIBRATION' ? 'PULSE' : 'INHALE');
    }
  };

  if (loading || !values) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>セッション開始</Text>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, selectedMode === 'VIBRATION' && styles.modeChipActive]}
          onPress={() => {
            if (running !== 'none' && running !== 'vibration') return;
            setSelectedMode('VIBRATION');
            setPhase(resetPhaseForMode('VIBRATION'));
            setGuideTick((t) => t + 1);
          }}
          disabled={running !== 'none' && running !== 'vibration'}
        >
          <Text style={[styles.modeLabel, selectedMode === 'VIBRATION' && styles.modeLabelActive]}>心拍ガイド</Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, selectedMode === 'BREATH' && styles.modeChipActive]}
          onPress={() => {
            if (running !== 'none' && running !== 'breath') return;
            setSelectedMode('BREATH');
            setPhase(resetPhaseForMode('BREATH'));
            setGuideTick((t) => t + 1);
          }}
          disabled={running !== 'none' && running !== 'breath'}
        >
          <Text style={[styles.modeLabel, selectedMode === 'BREATH' && styles.modeLabelActive]}>呼吸ガイド</Text>
        </Pressable>
      </View>
      <VisualGuide
        phase={phase}
        tick={guideTick}
        paused={running === 'none'}
        mode={selectedMode}
        phaseDurations={
          running === 'breath' && values
            ? {
                INHALE: values.breath.inhaleSec * 1000,
                HOLD: values.breath.type === 'three-phase' ? values.breath.holdSec * 1000 : undefined,
                EXHALE: values.breath.exhaleSec * 1000,
              }
            : undefined
        }
        testID="visual-guide"
        accessibilityLabel={running === 'none' ? '待機中' : phase}
      />
      <View style={styles.card}>
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.actionButton,
              running !== 'none' && styles.actionButtonDisabled,
              running !== 'none' && styles.previewActive,
            ]}
            onPress={start}
            disabled={running !== 'none'}
          >
            <Text style={styles.saveLabel}>開始</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, running === 'none' && styles.actionButtonDisabled]}
            onPress={stop}
            disabled={running === 'none'}
          >
            <Text style={styles.saveLabel}>停止</Text>
          </Pressable>
        </View>
        <View style={styles.recordRow}>
          <Pressable
            style={styles.recordButton}
            onPress={() => {
              const mode = runningRef.current === 'vibration' ? 'VIBRATION' : runningRef.current === 'breath' ? 'BREATH' : selectedMode;
              const draft = {
                guideType: mode,
                bpm: mode === 'VIBRATION' ? values?.bpm : undefined,
                breathSummary:
                  mode === 'BREATH' && values
                    ? buildBreathSummary(values)
                    : undefined,
                preHr: '',
                postHr: '',
                improvement: '',
              };
              setRecordDraft(draft);
              setRecordVisible(true);
            }}
          >
            <Text style={styles.recordLabel}>記録する</Text>
          </Pressable>
        </View>
        <Text style={styles.summary}>
          状態: {running === 'none' ? '停止中' : running === 'vibration' ? '心拍ガイド実行中' : '呼吸ガイド実行中'}
        </Text>
      </View>

      <Text style={styles.title}>設定</Text>

      {selectedMode === 'VIBRATION' && (
        <View style={styles.card}>
          <Text style={styles.subTitle}>心拍ガイド設定</Text>
          <View style={styles.row}>
            <Text style={styles.label}>BPM: {values.bpm}</Text>
            <Pressable
              style={styles.button}
              onPress={() => changeBpm(-1)}
              onPressIn={() => startRepeat(() => changeBpm(-1))}
              onPressOut={stopRepeat}
            >
              <Text style={styles.buttonLabel}>-BPM</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={() => changeBpm(+1)}
              onPressIn={() => startRepeat(() => changeBpm(+1))}
              onPressOut={stopRepeat}
            >
              <Text style={styles.buttonLabel}>+BPM</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              時間: {values.durationSec === null ? '∞' : `${values.durationSec}秒`}
            </Text>
            {values.durationSec !== null && (
              <>
                <Pressable
                  style={styles.button}
                  onPress={() => changeDuration(-30)}
                  onPressIn={() => startRepeat(() => changeDuration(-30))}
                  onPressOut={stopRepeat}
                >
                  <Text style={styles.buttonLabel}>-時間</Text>
                </Pressable>
                <Pressable
                  style={styles.button}
                  onPress={() => changeDuration(+30)}
                  onPressIn={() => startRepeat(() => changeDuration(+30))}
                  onPressOut={stopRepeat}
                >
                  <Text style={styles.buttonLabel}>+時間</Text>
                </Pressable>
              </>
            )}
            <Pressable style={styles.button} onPress={toggleDurationInfinite}>
              <Text style={styles.buttonLabel}>{values.durationSec === null ? '時間ON' : '∞にする'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {selectedMode === 'BREATH' && (
        <View style={styles.card}>
          <Text style={styles.subTitle}>呼吸プリセット</Text>
          <View style={styles.row}>
            {breathPresets.map((preset) => (
              <Pressable
                key={preset.label}
                style={[
                  styles.chip,
                  values.breath.type === preset.pattern.type &&
                    values.breath.inhaleSec === preset.pattern.inhaleSec &&
                    ('holdSec' in preset.pattern
                      ? (values.breath as any).holdSec === (preset.pattern as any).holdSec
                      : values.breath.type === 'two-phase') &&
                    values.breath.exhaleSec === preset.pattern.exhaleSec &&
                    values.breath.cycles === preset.pattern.cycles &&
                    styles.chipActive,
                ]}
                onPress={() => setBreath(preset.pattern)}
              >
                <Text style={[styles.chipLabel, values.breath === preset.pattern && styles.chipLabelActive]}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.subTitle}>フェーズ秒数</Text>
          <View style={styles.row}>
            <Text style={styles.label}>吸: {values.breath.inhaleSec}s</Text>
            <Pressable style={styles.button} onPress={() => changeBreathField('inhaleSec', -1)}>
              <Text style={styles.buttonLabel}>吸-</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => changeBreathField('inhaleSec', +1)}>
              <Text style={styles.buttonLabel}>吸+</Text>
            </Pressable>
          </View>
          {values.breath.type === 'three-phase' && (
            <View style={styles.row}>
              <Text style={styles.label}>止: {values.breath.holdSec}s</Text>
              <Pressable style={styles.button} onPress={() => changeBreathField('holdSec', -1)}>
                <Text style={styles.buttonLabel}>止-</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => changeBreathField('holdSec', +1)}>
                <Text style={styles.buttonLabel}>止+</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>吐: {values.breath.exhaleSec}s</Text>
            <Pressable style={styles.button} onPress={() => changeBreathField('exhaleSec', -1)}>
              <Text style={styles.buttonLabel}>吐-</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => changeBreathField('exhaleSec', +1)}>
              <Text style={styles.buttonLabel}>吐+</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>サイクル: {values.breath.cycles === null ? '∞' : `${values.breath.cycles}回`}</Text>
            <Pressable style={styles.button} onPress={() => changeCycles(-1)}>
              <Text style={styles.buttonLabel}>-回</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => changeCycles(+1)}>
              <Text style={styles.buttonLabel}>+回</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => changeCycles('inf')}>
              <Text style={styles.buttonLabel}>∞にする</Text>
            </Pressable>
          </View>

          <Text style={styles.summary}>
            呼吸プリセット: {values.breath.type === 'three-phase' ? `吸${values.breath.inhaleSec}-止${values.breath.holdSec}-吐${values.breath.exhaleSec}` : `吸${values.breath.inhaleSec}-吐${values.breath.exhaleSec}`} ({values.breath.cycles ? `${values.breath.cycles}回` : '∞'})
          </Text>
        </View>
      )}

      {/* 全設定を一括保存する共通ボタン */}
      <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.saveLabel}>{saving ? '保存中...' : '保存'}</Text>
      </Pressable>

      <RecordModal
        visible={recordVisible}
        draft={recordDraft}
        onClose={() => setRecordVisible(false)}
        onSave={async () => {
          if (!recordDraft) return;
          await useCase.complete({
            guideType: recordDraft.guideType,
            bpm: recordDraft.bpm,
            preHr: recordDraft.preHr ? Number(recordDraft.preHr) : undefined,
            postHr: recordDraft.postHr ? Number(recordDraft.postHr) : undefined,
            improvement: recordDraft.improvement ? Number(recordDraft.improvement) : undefined,
            breathConfig: recordDraft.breathSummary,
          });
          setRecordVisible(false);
        }}
        onChange={setRecordDraft}
        onGuideTypeChange={handleRecordGuideTypeChange}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: '#f4f6fb', borderRadius: 12, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  label: { fontSize: 14, color: '#222' },
  button: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#e8f1ff', borderWidth: 1, borderColor: '#2563eb' },
  buttonLabel: { color: '#1746b4', fontWeight: '700', fontSize: 12 },
  subTitle: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#999', backgroundColor: '#fff' },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#e8f1ff' },
  chipLabel: { fontSize: 14, color: '#333' },
  chipLabelActive: { color: '#1746b4', fontWeight: '700' },
  summary: { marginTop: 6, fontSize: 13, color: '#222' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  modeChipActive: { borderColor: '#2563eb', backgroundColor: '#e8f1ff' },
  modeLabel: { fontSize: 14, color: '#111' },
  modeLabelActive: { color: '#1746b4', fontWeight: '700' },
  saveButton: { marginTop: 12, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveLabel: { color: '#fff', fontWeight: '700' },
  previewButton: { marginTop: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: '#e8f1ff', alignItems: 'center', borderWidth: 1, borderColor: '#2563eb' },
  previewActive: { backgroundColor: '#d6e7ff' },
  previewLabel: { color: '#1746b4', fontWeight: '700' },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center' },
  actionButtonDisabled: { opacity: 0.6 },
  recordRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  recordButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#94a3b8', backgroundColor: '#fff' },
  recordLabel: { color: '#1f2937', fontWeight: '700' },
  // RecordModal側で共通スタイルを持つため、セッション側ではモーダルのスタイルを持たない
});
