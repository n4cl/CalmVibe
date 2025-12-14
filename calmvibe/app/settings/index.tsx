import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SqliteSettingsRepository } from '../../src/settings/sqliteRepository';
import {
  SettingsRepository,
  SettingsValues,
  VibrationIntensity,
  BreathPreset,
  defaultSettings,
} from '../../src/settings/types';
import { useSettingsViewModel } from './useSettingsViewModel';
import { singleBeatPattern } from '../session/utils';

export type SettingsScreenProps = {
  repository?: SettingsRepository;
};

const intensityOptions: { label: string; value: VibrationIntensity }[] = [
  { label: '弱', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '強', value: 'strong' },
];

const breathOptions: BreathPreset[] = ['4-6-4', '5-5-5', '4-4-4'];

const labelForIntensity = (i: VibrationIntensity) => intensityOptions.find((o) => o.value === i)?.label ?? '中';

export default function SettingsScreen({ repository }: SettingsScreenProps) {
  const repo = useMemo<SettingsRepository>(() => repository ?? new SqliteSettingsRepository(), [repository]);
  const vm = useSettingsViewModel(repo);
  const scale = useRef(new Animated.Value(1)).current;
  const [previewing, setPreviewing] = useState(false);

  const changeBpm = (delta: number) => {
    const next = Math.min(90, Math.max(40, vm.values.bpm + delta));
    vm.setBpm(next);
  };

  const changeDuration = (delta: number) => {
    const next = Math.min(300, Math.max(60, vm.values.durationSec + delta));
    vm.setDuration(next);
  };

  const runPreview = async () => {
    setPreviewing(true);
    const pattern = singleBeatPattern;
    pattern.forEach((delay) => {
      setTimeout(() => {
        Haptics.impactAsync(
          vm.values.intensity === 'strong'
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

  const onSave = async () => {
    await vm.save();
  };

  const current: SettingsValues = vm.values ?? defaultSettings;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>設定</Text>

      <Text style={styles.sectionTitle}>リズム設定</Text>
      <View style={styles.row}> 
        <Text style={styles.label}>BPM: {current.bpm}</Text>
        <Pressable onPress={() => changeBpm(+1)} style={styles.smallBtn}><Text style={styles.smallLabel}>+BPM</Text></Pressable>
        <Pressable onPress={() => changeBpm(-1)} style={styles.smallBtn}><Text style={styles.smallLabel}>-BPM</Text></Pressable>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>時間: {current.durationSec}秒</Text>
        <Pressable onPress={() => changeDuration(+30)} style={styles.smallBtn}><Text style={styles.smallLabel}>+時間</Text></Pressable>
        <Pressable onPress={() => changeDuration(-30)} style={styles.smallBtn}><Text style={styles.smallLabel}>-時間</Text></Pressable>
      </View>

      <Text style={styles.sectionTitle}>バイブ強度（1拍1振動）</Text>
      <View style={styles.optionRow}>
        {intensityOptions.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={current.intensity === opt.value}
            onPress={() => vm.setIntensity(opt.value)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>呼吸ガイド</Text>
      <View style={styles.optionRow}>
        <ChoiceButton
          label={current.useBreath ? '呼吸ON' : '呼吸OFF'}
          selected={current.useBreath}
          onPress={() => vm.setUseBreath(!current.useBreath)}
        />
        {breathOptions.map((preset) => (
          <ChoiceButton
            key={preset}
            label={preset}
            selected={current.breathPreset === preset}
            onPress={() => vm.setBreathPreset(preset)}
          />
        ))}
      </View>

      <View style={styles.previewContainer}>
        <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
        <Text style={styles.previewText}>{previewing ? 'プレビュー再生中' : '1拍1振動で体感できます'}</Text>
        <View style={styles.buttonRow}>
          <ActionButton label="プレビュー" onPress={runPreview} />
          <ActionButton label={vm.saving ? '保存中...' : '保存'} onPress={onSave} disabled={vm.saving} />
        </View>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>現在のBPM: {current.bpm}</Text>
        <Text style={styles.summaryText}>現在の時間: {current.durationSec}秒</Text>
        <Text style={styles.summaryText}>現在の強度: {labelForIntensity(current.intensity)}</Text>
        <Text style={styles.summaryText}>呼吸ガイド: {current.useBreath ? 'ON' : 'OFF'}</Text>
        <Text style={styles.summaryText}>呼吸プリセット: {current.breathPreset}</Text>
      </View>
    </ScrollView>
  );
}

const ChoiceButton = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]} accessibilityState={{ selected }}>
    <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
  </Pressable>
);

const ActionButton = ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
  <Pressable onPress={onPress} disabled={disabled} style={[styles.actionButton, disabled && styles.actionButtonDisabled]}>
    <Text style={styles.actionLabel}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, color: '#333' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginVertical: 4 },
  choice: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  choiceSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#e0ecff',
  },
  choiceLabel: { fontSize: 14, color: '#333' },
  choiceLabelSelected: { color: '#1746b4', fontWeight: '700' },
  previewContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f7fb',
    alignItems: 'center',
    gap: 12,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#cde4ff',
  },
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
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eef2f7',
  },
  summaryText: { fontSize: 14, color: '#222', marginVertical: 2 },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e8f1ff',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  smallLabel: { color: '#1746b4', fontWeight: '700', fontSize: 12 },
});
