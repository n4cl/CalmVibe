import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SqliteSettingsRepository } from '../../src/settings/sqliteRepository';
import {
  SettingsRepository,
  SettingsValues,
  TempoPreset,
  VibrationIntensity,
  VibrationPattern,
  defaultSettings,
} from '../../src/settings/types';
import { useSettingsViewModel } from './useSettingsViewModel';

export type SettingsScreenProps = {
  repository?: SettingsRepository;
};

const tempoOptions: { label: string; value: TempoPreset }[] = [
  { label: '4-6-4', value: '4-6-4' },
  { label: '5-5-5', value: '5-5-5' },
  { label: '4-4-4', value: '4-4-4' },
];

const intensityOptions: { label: string; value: VibrationIntensity }[] = [
  { label: '弱', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '強', value: 'strong' },
];

const patternOptions: { label: string; value: VibrationPattern; jp: string }[] = [
  { label: 'シンプル', value: 'short', jp: 'シンプル' },
  { label: 'パルス', value: 'pulse', jp: 'パルス' },
  { label: 'ウェーブ', value: 'wave', jp: 'ウェーブ' },
];

const labelForIntensity = (i: VibrationIntensity) => intensityOptions.find((o) => o.value === i)?.label ?? '中';
const labelForPattern = (p: VibrationPattern) => patternOptions.find((o) => o.value === p)?.jp ?? 'パルス';

export default function SettingsScreen({ repository }: SettingsScreenProps) {
  const repo = useMemo<SettingsRepository>(() => repository ?? new SqliteSettingsRepository(), [repository]);
  const vm = useSettingsViewModel(repo);
  const scale = useRef(new Animated.Value(1)).current;
  const [previewing, setPreviewing] = useState(false);

  const runPreview = async () => {
    setPreviewing(true);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 500, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => setPreviewing(false));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const onSave = async () => {
    await vm.save();
  };

  const current: SettingsValues = vm.values ?? defaultSettings;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>設定</Text>

      <Text style={styles.sectionTitle}>呼吸テンポプリセット</Text>
      <View style={styles.optionRow}>
        {tempoOptions.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={current.tempoPreset === opt.value}
            onPress={() => vm.setTempo(opt.value)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>バイブ強度</Text>
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

      <Text style={styles.sectionTitle}>バイブパターン</Text>
      <View style={styles.optionRow}>
        {patternOptions.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.jp}
            selected={current.pattern === opt.value}
            onPress={() => vm.setPattern(opt.value)}
          />
        ))}
      </View>

      <View style={styles.previewContainer}>
        <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
        <Text style={styles.previewText}>{previewing ? 'プレビュー再生中' : '円の拡大縮小で呼吸をガイドします'}</Text>
        <View style={styles.buttonRow}>
          <ActionButton label="プレビュー" onPress={runPreview} />
          <ActionButton label={vm.saving ? '保存中...' : '保存'} onPress={onSave} disabled={vm.saving} />
        </View>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>現在のテンポ: {current.tempoPreset}</Text>
        <Text style={styles.summaryText}>バイブ強度: {labelForIntensity(current.intensity)}</Text>
        <Text style={styles.summaryText}>パターン: {labelForPattern(current.pattern)}</Text>
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
});
