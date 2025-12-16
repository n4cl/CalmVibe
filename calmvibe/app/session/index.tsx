import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { VisualGuide, GuidePhase } from './visualGuide';
import { SettingsRepository, SettingsValues, VibrationIntensity, BreathPattern } from '../../src/settings/types';
import { SqliteSettingsRepository } from '../../src/settings/sqliteRepository';

export type SessionScreenProps = {
  settingsRepo?: SettingsRepository;
};

const intensityOptions: { label: string; value: VibrationIntensity }[] = [
  { label: '弱', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '強', value: 'strong' },
];

const breathPresets: { label: string; pattern: BreathPattern }[] = [
  { label: '4-6-4 (5回)', pattern: { type: 'three-phase', inhaleSec: 4, holdSec: 6, exhaleSec: 4, cycles: 5 } },
  { label: '4-4 (5回)', pattern: { type: 'two-phase', inhaleSec: 4, exhaleSec: 4, cycles: 5 } },
];

export default function SessionScreen({ settingsRepo }: SessionScreenProps) {
  const repo = useMemo<SettingsRepository>(() => settingsRepo ?? new SqliteSettingsRepository(), [settingsRepo]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<SettingsValues | null>(null);
  const [running, setRunning] = useState<'none' | 'vibration' | 'breath'>('none');
  const [phase, setPhase] = useState<GuidePhase>('PULSE');
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const runningRef = React.useRef<'none' | 'vibration' | 'breath'>('none');

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
      clearTimer();
    };
  }, [repo]);

  const changeBpm = (delta: number) => {
    if (!values) return;
    const next = Math.min(90, Math.max(40, values.bpm + delta));
    setValues({ ...values, bpm: next });
  };

  const changeDuration = (delta: number) => {
    if (!values) return;
    if (values.durationSec === null) return; // 無制限時はスキップ
    const next = Math.min(300, Math.max(60, values.durationSec + delta));
    setValues({ ...values, durationSec: next });
  };

  const toggleDurationInfinite = () => {
    if (!values) return;
    setValues({ ...values, durationSec: values.durationSec === null ? 180 : null });
  };

  const setIntensity = (i: VibrationIntensity) => {
    if (!values) return;
    setValues({ ...values, intensity: i });
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

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = async () => {
    clearTimer();
    setRunning('none');
    runningRef.current = 'none';
  };

  const startVibration = async () => {
    if (!values) return;
    await stop();
    setRunning('vibration');
    runningRef.current = 'vibration';
    setPhase('PULSE');
    const style = values.intensity === 'strong' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium;
    const intervalMs = Math.max(200, Math.round(60000 / values.bpm));
    const tick = async () => {
      if (runningRef.current !== 'vibration') return;
      setPhase('PULSE');
      await Haptics.impactAsync(style).catch(() => {});
      timerRef.current = setTimeout(tick, intervalMs);
    };
    timerRef.current = setTimeout(tick, 10);
  };

  const startBreath = async () => {
    if (!values) return;
    await stop();
    setRunning('breath');
    runningRef.current = 'breath';
    const phases: GuidePhase[] = values.breath.type === 'three-phase' ? ['INHALE', 'HOLD', 'EXHALE'] : ['INHALE', 'EXHALE'];
    let idx = 1;
    setPhase(phases[0]);
    const tick = async () => {
      if (runningRef.current !== 'breath') return;
      const current = phases[idx % phases.length];
      setPhase(current);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      idx += 1;
      timerRef.current = setTimeout(tick, 400);
    };
    timerRef.current = setTimeout(tick, 400);
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
      {running !== 'none' && <VisualGuide phase={phase} testID="visual-guide" accessibilityLabel={phase} />}
      <View style={styles.card}>
        <View style={styles.row}>
          <Pressable style={[styles.saveButton, running === 'vibration' && styles.previewActive]} onPress={startVibration}>
            <Text style={styles.saveLabel}>開始（振動）</Text>
          </Pressable>
          <Pressable style={[styles.saveButton, running === 'breath' && styles.previewActive]} onPress={startBreath}>
            <Text style={styles.saveLabel}>開始（呼吸）</Text>
          </Pressable>
          <Pressable style={[styles.saveButton, running === 'none' && styles.saveButtonDisabled]} onPress={stop} disabled={running === 'none'}>
            <Text style={styles.saveLabel}>停止</Text>
          </Pressable>
        </View>
        <Text style={styles.summary}>
          状態: {running === 'none' ? '停止中' : running === 'vibration' ? '振動ガイド実行中' : '呼吸ガイド実行中'}
        </Text>
      </View>

      <Text style={styles.title}>セッション設定（振動ガイド）</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>BPM: {values.bpm}</Text>
          <Pressable style={styles.button} onPress={() => changeBpm(-1)}>
            <Text style={styles.buttonLabel}>-BPM</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => changeBpm(+1)}>
            <Text style={styles.buttonLabel}>+BPM</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>
            時間: {values.durationSec === null ? '∞' : `${values.durationSec}秒`}
          </Text>
          {values.durationSec !== null && (
            <>
              <Pressable style={styles.button} onPress={() => changeDuration(-30)}>
                <Text style={styles.buttonLabel}>-時間</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => changeDuration(+30)}>
                <Text style={styles.buttonLabel}>+時間</Text>
              </Pressable>
            </>
          )}
          <Pressable style={styles.button} onPress={toggleDurationInfinite}>
            <Text style={styles.buttonLabel}>{values.durationSec === null ? '時間ON' : '∞にする'}</Text>
          </Pressable>
        </View>

        <Text style={styles.subTitle}>バイブ強度</Text>
        <View style={styles.row}>
          {intensityOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, values.intensity === opt.value && styles.chipActive]}
              onPress={() => setIntensity(opt.value)}
            >
              <Text style={[styles.chipLabel, values.intensity === opt.value && styles.chipLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.summary}>強度: {intensityOptions.find((o) => o.value === values.intensity)?.label ?? '中'}</Text>

        <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveLabel}>{saving ? '保存中...' : '保存'}</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>呼吸設定（独立保存）</Text>
      <View style={styles.card}>
        <Text style={styles.subTitle}>プリセット</Text>
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

        <Text style={styles.subTitle}>バイブ強度（呼吸ガイド）</Text>
        <View style={styles.row}>
          {intensityOptions.map((opt) => (
            <Pressable
              key={`breath-${opt.value}`}
              style={[styles.chip, values.intensity === opt.value && styles.chipActive]}
              onPress={() => setIntensity(opt.value)}
            >
              <Text style={[styles.chipLabel, values.intensity === opt.value && styles.chipLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.summary}>
          呼吸プリセット: {values.breath.type === 'three-phase' ? `吸${values.breath.inhaleSec}-止${values.breath.holdSec}-吐${values.breath.exhaleSec}` : `吸${values.breath.inhaleSec}-吐${values.breath.exhaleSec}`} ({values.breath.cycles ? `${values.breath.cycles}回` : '∞'})
        </Text>

        <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveLabel}>{saving ? '保存中...' : '保存'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: '#f4f6fb', borderRadius: 12, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, color: '#222' },
  button: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#e8f1ff', borderWidth: 1, borderColor: '#2563eb' },
  buttonLabel: { color: '#1746b4', fontWeight: '700', fontSize: 12 },
  subTitle: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#999', backgroundColor: '#fff' },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#e8f1ff' },
  chipLabel: { fontSize: 14, color: '#333' },
  chipLabelActive: { color: '#1746b4', fontWeight: '700' },
  summary: { marginTop: 6, fontSize: 13, color: '#222' },
  saveButton: { marginTop: 12, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveLabel: { color: '#fff', fontWeight: '700' },
  previewButton: { marginTop: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: '#e8f1ff', alignItems: 'center', borderWidth: 1, borderColor: '#2563eb' },
  previewActive: { backgroundColor: '#d6e7ff' },
  previewLabel: { color: '#1746b4', fontWeight: '700' },
});
