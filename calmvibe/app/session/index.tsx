import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SettingsRepository, SettingsValues, VibrationIntensity } from '../../src/settings/types';
import { SqliteSettingsRepository } from '../../src/settings/sqliteRepository';

export type SessionScreenProps = {
  settingsRepo?: SettingsRepository;
};

const intensityOptions: { label: string; value: VibrationIntensity }[] = [
  { label: '弱', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '強', value: 'strong' },
];

export default function SessionScreen({ settingsRepo }: SessionScreenProps) {
  const repo = useMemo<SettingsRepository>(() => settingsRepo ?? new SqliteSettingsRepository(), [settingsRepo]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<SettingsValues | null>(null);

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

  const setIntensity = (i: VibrationIntensity) => {
    if (!values) return;
    setValues({ ...values, intensity: i });
  };

  const save = async () => {
    if (!values) return;
    setSaving(true);
    await repo.save(values);
    setSaving(false);
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
      <Text style={styles.title}>セッション設定（振動ガイド）</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>BPM: {values.bpm}</Text>
          <Pressable style={styles.button} onPress={() => changeBpm(+1)}>
            <Text style={styles.buttonLabel}>+BPM</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => changeBpm(-1)}>
            <Text style={styles.buttonLabel}>-BPM</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>
            時間: {values.durationSec === null ? '∞' : `${values.durationSec}秒`}
          </Text>
          {values.durationSec !== null && (
            <>
              <Pressable style={styles.button} onPress={() => changeDuration(+30)}>
                <Text style={styles.buttonLabel}>+時間</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => changeDuration(-30)}>
                <Text style={styles.buttonLabel}>-時間</Text>
              </Pressable>
            </>
          )}
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
});
