import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SqliteSettingsRepository } from '../../src/settings/sqliteRepository';
import { SettingsRepository } from '../../src/settings/types';
import { NativeHapticsAdapter, SimpleGuidanceEngine } from '../../src/guidance';
import { GuidanceEngine, GuidanceMode } from '../../src/guidance/types';
import { useSessionViewModel } from './useSessionViewModel';
import { BreathVisualGuide } from './visualGuide';
import { useKeepAwake } from 'expo-keep-awake';
import { useSettingsViewModel } from '../../src/settings/useSettingsViewModel';
import { singleBeatPattern } from './utils';

export type SessionScreenProps = {
  guidanceEngine?: GuidanceEngine;
  settingsRepo?: SettingsRepository;
};

export default function SessionScreen({ guidanceEngine, settingsRepo }: SessionScreenProps) {
  const repo = useMemo<SettingsRepository>(
    () => settingsRepo ?? new SqliteSettingsRepository(),
    [settingsRepo]
  );
  const engine = useMemo<GuidanceEngine>(
    () => guidanceEngine ?? new SimpleGuidanceEngine(new NativeHapticsAdapter()),
    [guidanceEngine]
  );

  const vm = useSessionViewModel({ engine, repo });
  useKeepAwake(vm.running);
  const settingsVm = useSettingsViewModel(repo);
  const scale = useRef(new Animated.Value(1)).current;
  const [previewing, setPreviewing] = useState(false);

  const runPreview = async () => {
    setPreviewing(true);
    const pattern = singleBeatPattern;
    pattern.forEach((delay) => {
      setTimeout(() => {
        Haptics.impactAsync(
          settingsVm.values.intensity === 'strong'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Medium
        ).catch(() => {});
      }, delay);
    });
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.2, duration: 400, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => setPreviewing(false));
  };

  const modeButton = (mode: GuidanceMode, label: string) => (
    <Pressable
      key={mode}
      onPress={() => vm.setMode(mode)}
      style={[styles.chip, vm.mode === mode && styles.chipActive]}
      accessibilityState={{ selected: vm.mode === mode }}
    >
      <Text style={[styles.chipLabel, vm.mode === mode && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );

  const changeBpm = (delta: number) => {
    const next = Math.min(90, Math.max(40, settingsVm.values.bpm + delta));
    settingsVm.setBpm(next);
  };

  const changeDuration = (delta: number) => {
    const next = Math.min(300, Math.max(60, settingsVm.values.durationSec + delta));
    settingsVm.setDuration(next);
  };

  const intensityOptions: { label: string; value: 'low' | 'medium' | 'strong' }[] = [
    { label: '弱', value: 'low' },
    { label: '中', value: 'medium' },
    { label: '強', value: 'strong' },
  ];

  const breathOptions: Array<'4-6-4' | '5-5-5' | '4-4-4'> = ['4-6-4', '5-5-5', '4-4-4'];
  const labelForIntensity = (i: typeof intensityOptions[number]['value']) =>
    intensityOptions.find((o) => o.value === i)?.label ?? '中';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>セッション</Text>
      <Text style={styles.body}>ここから鎮静セッションを開始・終了します。</Text>

      <Text style={styles.sectionTitle}>設定（セッション内で完結）</Text>
      <View style={styles.settingsCard}>
        <View style={styles.row}>
          <Text style={styles.label}>BPM: {settingsVm.values.bpm}</Text>
          <Pressable onPress={() => changeBpm(+1)} style={styles.smallBtn}>
            <Text style={styles.smallLabel}>+BPM</Text>
          </Pressable>
          <Pressable onPress={() => changeBpm(-1)} style={styles.smallBtn}>
            <Text style={styles.smallLabel}>-BPM</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>時間: {settingsVm.values.durationSec}秒</Text>
          <Pressable onPress={() => changeDuration(+30)} style={styles.smallBtn}>
            <Text style={styles.smallLabel}>+時間</Text>
          </Pressable>
          <Pressable onPress={() => changeDuration(-30)} style={styles.smallBtn}>
            <Text style={styles.smallLabel}>-時間</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionSubTitle}>バイブ強度（1拍1振動）</Text>
        <View style={styles.chipRow}>
          {intensityOptions.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => settingsVm.setIntensity(opt.value)}
              style={[styles.chip, settingsVm.values.intensity === opt.value && styles.chipActive]}
              accessibilityState={{ selected: settingsVm.values.intensity === opt.value }}
            >
              <Text
                style={[
                  styles.chipLabel,
                  settingsVm.values.intensity === opt.value && styles.chipLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionSubTitle}>呼吸プリセット</Text>
        <View style={styles.chipRow}>
          {breathOptions.map((preset) => (
            <Pressable
              key={preset}
              onPress={() => settingsVm.setBreathPreset(preset)}
              style={[styles.chip, settingsVm.values.breathPreset === preset && styles.chipActive]}
              accessibilityState={{ selected: settingsVm.values.breathPreset === preset }}
            >
              <Text
                style={[
                  styles.chipLabel,
                  settingsVm.values.breathPreset === preset && styles.chipLabelActive,
                ]}
              >
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.previewContainer}>
          <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
          <Text style={styles.previewText}>
            {previewing ? 'プレビュー再生中' : '1拍1振動で体感できます'}
          </Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.actionButton} onPress={runPreview}>
              <Text style={styles.actionLabel}>プレビュー</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, settingsVm.saving && styles.actionButtonDisabled]}
              onPress={settingsVm.save}
              disabled={settingsVm.saving}
            >
              <Text style={styles.actionLabel}>{settingsVm.saving ? '保存中...' : '保存'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>現在のBPM: {settingsVm.values.bpm}</Text>
          <Text style={styles.summaryText}>現在の時間: {settingsVm.values.durationSec}秒</Text>
          <Text style={styles.summaryText}>現在の強度: {labelForIntensity(settingsVm.values.intensity)}</Text>
          <Text style={styles.summaryText}>呼吸プリセット: {settingsVm.values.breathPreset}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>ガイドモード</Text>
      <View style={styles.chipRow}>
        {modeButton('VIBRATION', '振動のみ')}
        {modeButton('BREATH', '呼吸のみ')}
        {modeButton('BOTH', '併用')}
      </View>

      <View style={styles.guideBox}>
        <BreathVisualGuide running={vm.running} cycle={vm.cycle} />
        <Text style={styles.status}>{vm.status}</Text>
        {vm.cycle > 0 && <Text style={styles.cycle}>サイクル {vm.cycle}</Text>}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={vm.start} disabled={vm.running}>
          <Text style={styles.primaryLabel}>開始</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, !vm.running && styles.secondaryDisabled]}
          onPress={vm.stop}
          disabled={!vm.running}
        >
          <Text style={styles.secondaryLabel}>停止</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 14, color: '#555' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  sectionSubTitle: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#999',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#e8f1ff' },
  chipLabel: { fontSize: 14, color: '#333' },
  chipLabelActive: { color: '#1746b4', fontWeight: '700' },
  settingsCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f2f5fb',
    gap: 8,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, color: '#333' },
  previewContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eef3ff',
    alignItems: 'center',
    gap: 10,
  },
  circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#cfe0ff' },
  previewText: { fontSize: 14, color: '#333' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionLabel: { color: '#fff', fontWeight: '700' },
  summaryBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e9edf5',
    gap: 4,
  },
  summaryText: { fontSize: 13, color: '#222' },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e8f1ff',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  smallLabel: { color: '#1746b4', fontWeight: '700', fontSize: 12 },
  guideBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f6f8fb',
    alignItems: 'center',
    gap: 6,
  },
  status: { fontSize: 14, color: '#333' },
  cycle: { fontSize: 14, color: '#111', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  primaryLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    width: 100,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryDisabled: { opacity: 0.5 },
  secondaryLabel: { color: '#333', fontWeight: '700', fontSize: 14 },
});
