import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SqliteSettingsRepository } from '../../src/settings/sqliteRepository';
import { SettingsRepository } from '../../src/settings/types';
import { NativeHapticsAdapter, SimpleGuidanceEngine } from '../../src/guidance';
import { GuidanceEngine, GuidanceMode } from '../../src/guidance/types';
import { useSessionViewModel } from './useSessionViewModel';
import { BreathVisualGuide } from './visualGuide';
import { useKeepAwake } from 'expo-keep-awake';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>セッション</Text>
      <Text style={styles.body}>ここから鎮静セッションを開始・終了します。</Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 14, color: '#555' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
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
