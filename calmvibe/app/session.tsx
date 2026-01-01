import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisualGuide } from '../components/visual-guide';
import { SettingsRepository, BreathPattern } from '../src/settings/types';
import { SessionUseCase } from '../src/session/useCase';
import RecordModal from '../components/record-modal';
import { SessionViewModel, getSessionViewModel } from '../src/session/sessionViewModel';

export type SessionScreenProps = {
  settingsRepo?: SettingsRepository;
  useCase?: SessionUseCase;
  viewModel?: SessionViewModel;
};

const breathPresets: { label: string; pattern: BreathPattern }[] = [
  { label: '4-4 (5回)', pattern: { type: 'two-phase', inhaleSec: 4, exhaleSec: 4, cycles: 5 } },
  { label: '4-6-4 (5回)', pattern: { type: 'three-phase', inhaleSec: 4, holdSec: 6, exhaleSec: 4, cycles: 5 } },
];

const basePadding = 20;

export default function SessionScreen({ settingsRepo, useCase: injectedUseCase, viewModel: injectedViewModel }: SessionScreenProps) {
  const viewModel = useMemo(() => {
    if (injectedViewModel) return injectedViewModel;
    if (injectedUseCase || settingsRepo) {
      return new SessionViewModel({ useCase: injectedUseCase, settingsRepo });
    }
    return getSessionViewModel();
  }, [injectedViewModel, injectedUseCase, settingsRepo]);
  const state = useSessionViewModel(viewModel);
  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // SafeAreaViewだとScrollViewの余白が崩れやすいため、上部だけ手動で足す
  const insets = useSafeAreaInsets();
  const containerStyle = [styles.container, { paddingTop: basePadding + insets.top }];

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
    void viewModel.load();
  }, [viewModel]);

  if (state.loading) {
    return (
      <View style={[...containerStyle, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.body}>読み込み中...</Text>
      </View>
    );
  }

  if (!state.values) return null;

  return (
    <ScrollView contentContainerStyle={containerStyle}>
      <Text style={styles.title}>セッション開始</Text>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, state.selectedMode === 'VIBRATION' && styles.modeChipActive]}
          onPress={() => {
            if (state.running !== 'none' && state.running !== 'vibration') return;
            viewModel.setSelectedMode('VIBRATION');
          }}
          disabled={state.running !== 'none' && state.running !== 'vibration'}
        >
          <Text style={[styles.modeLabel, state.selectedMode === 'VIBRATION' && styles.modeLabelActive]}>心拍ガイド</Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, state.selectedMode === 'BREATH' && styles.modeChipActive]}
          onPress={() => {
            if (state.running !== 'none' && state.running !== 'breath') return;
            viewModel.setSelectedMode('BREATH');
          }}
          disabled={state.running !== 'none' && state.running !== 'breath'}
        >
          <Text style={[styles.modeLabel, state.selectedMode === 'BREATH' && styles.modeLabelActive]}>呼吸ガイド</Text>
        </Pressable>
      </View>
      <VisualGuide
        phase={state.phase}
        tick={state.guideTick}
        paused={state.running === 'none'}
        mode={state.selectedMode}
        phaseDurations={
          state.running === 'breath'
            ? {
                INHALE: state.values.breath.inhaleSec * 1000,
                HOLD: state.values.breath.type === 'three-phase' ? state.values.breath.holdSec * 1000 : undefined,
                EXHALE: state.values.breath.exhaleSec * 1000,
              }
            : undefined
        }
        testID="visual-guide"
        accessibilityLabel={state.running === 'none' ? '待機中' : state.phase}
      />
      <View style={styles.card}>
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.actionButton,
              state.running !== 'none' && styles.actionButtonDisabled,
              state.running !== 'none' && styles.previewActive,
            ]}
            onPress={async () => {
              await viewModel.start();
            }}
            disabled={state.running !== 'none'}
          >
            <Text style={styles.saveLabel}>開始</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, state.running === 'none' && styles.actionButtonDisabled]}
            onPress={async () => {
              await viewModel.stop();
            }}
            disabled={state.running === 'none'}
          >
            <Text style={styles.saveLabel}>停止</Text>
          </Pressable>
        </View>
        <View style={styles.recordRow}>
          <Pressable
            style={styles.recordButton}
            onPress={() => {
              viewModel.openRecord();
            }}
          >
            <Text style={styles.recordLabel}>記録する</Text>
          </Pressable>
        </View>
        <Text style={styles.summary}>
          状態: {state.running === 'none' ? '停止中' : state.running === 'vibration' ? '心拍ガイド実行中' : '呼吸ガイド実行中'}
        </Text>
        {state.hapticsNotice && <Text style={styles.errorText}>{state.hapticsNotice}</Text>}
      </View>

      <Text style={styles.title}>設定</Text>

      {state.selectedMode === 'VIBRATION' && (
        <View style={styles.card}>
          <Text style={styles.subTitle}>心拍ガイド設定</Text>
          <View style={styles.row}>
            <Text style={styles.label}>BPM: {state.values.bpm}</Text>
            <Pressable
              style={styles.button}
              onPress={() => viewModel.changeBpm(-1)}
              onPressIn={() => startRepeat(() => viewModel.changeBpm(-1))}
              onPressOut={stopRepeat}
            >
              <Text style={styles.buttonLabel}>-BPM</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={() => viewModel.changeBpm(+1)}
              onPressIn={() => startRepeat(() => viewModel.changeBpm(+1))}
              onPressOut={stopRepeat}
            >
              <Text style={styles.buttonLabel}>+BPM</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>時間: {state.values.durationSec === null ? '∞' : `${state.values.durationSec}秒`}</Text>
            <Pressable
              style={styles.button}
              onPress={() => viewModel.changeDuration(-30)}
              onPressIn={() => startRepeat(() => viewModel.changeDuration(-30))}
              onPressOut={stopRepeat}
            >
              <Text style={styles.buttonLabel}>-30s</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={() => viewModel.changeDuration(+30)}
              onPressIn={() => startRepeat(() => viewModel.changeDuration(+30))}
              onPressOut={stopRepeat}
            >
              <Text style={styles.buttonLabel}>+30s</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => viewModel.toggleDurationInfinite()}>
              <Text style={styles.buttonLabel}>∞にする</Text>
            </Pressable>
          </View>
        </View>
      )}

      {state.selectedMode === 'BREATH' && (
        <View style={styles.card}>
          <Text style={styles.subTitle}>呼吸ガイド設定</Text>
          <View style={styles.row}>
            <Text style={styles.label}>プリセット</Text>
            {breathPresets.map((preset) => (
              <Pressable
                key={preset.label}
                style={[
                  styles.chip,
                  state.values.breath.type === preset.pattern.type &&
                    state.values.breath.inhaleSec === preset.pattern.inhaleSec &&
                    state.values.breath.exhaleSec === preset.pattern.exhaleSec &&
                    state.values.breath.cycles === preset.pattern.cycles &&
                    (preset.pattern.type === 'two-phase' ||
                      (state.values.breath.type === 'three-phase' &&
                        state.values.breath.holdSec === (preset.pattern as any).holdSec))
                    ? styles.chipActive
                    : null,
                ]}
                onPress={() => viewModel.setBreath(preset.pattern)}
              >
                <Text style={[styles.chipLabel, styles.chipLabelActive]}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.subTitle}>フェーズ秒数</Text>
          <View style={styles.row}>
            <Text style={styles.label}>吸: {state.values.breath.inhaleSec}s</Text>
            <Pressable style={styles.button} onPress={() => viewModel.changeBreathField('inhaleSec', -1)}>
              <Text style={styles.buttonLabel}>吸-</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => viewModel.changeBreathField('inhaleSec', +1)}>
              <Text style={styles.buttonLabel}>吸+</Text>
            </Pressable>
          </View>
          {state.values.breath.type === 'three-phase' && (
            <View style={styles.row}>
              <Text style={styles.label}>止: {state.values.breath.holdSec}s</Text>
              <Pressable style={styles.button} onPress={() => viewModel.changeBreathField('holdSec', -1)}>
                <Text style={styles.buttonLabel}>止-</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => viewModel.changeBreathField('holdSec', +1)}>
                <Text style={styles.buttonLabel}>止+</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>吐: {state.values.breath.exhaleSec}s</Text>
            <Pressable style={styles.button} onPress={() => viewModel.changeBreathField('exhaleSec', -1)}>
              <Text style={styles.buttonLabel}>吐-</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => viewModel.changeBreathField('exhaleSec', +1)}>
              <Text style={styles.buttonLabel}>吐+</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>サイクル: {state.values.breath.cycles === null ? '∞' : `${state.values.breath.cycles}回`}</Text>
            <Pressable style={styles.button} onPress={() => viewModel.changeCycles(-1)}>
              <Text style={styles.buttonLabel}>-回</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => viewModel.changeCycles(+1)}>
              <Text style={styles.buttonLabel}>+回</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => viewModel.changeCycles('inf')}>
              <Text style={styles.buttonLabel}>∞にする</Text>
            </Pressable>
          </View>

          <Text style={styles.summary}>
            呼吸プリセット: {state.values.breath.type === 'three-phase' ? `吸${state.values.breath.inhaleSec}-止${state.values.breath.holdSec}-吐${state.values.breath.exhaleSec}` : `吸${state.values.breath.inhaleSec}-吐${state.values.breath.exhaleSec}`} ({state.values.breath.cycles ? `${state.values.breath.cycles}回` : '∞'})
          </Text>
        </View>
      )}

      {/* 全設定を一括保存する共通ボタン */}
      <Pressable
        style={[styles.saveButton, state.saving && styles.saveButtonDisabled]}
        onPress={async () => {
          const res = await viewModel.saveSettings();
          if (!res.ok && res.error === 'save_failed') {
            Alert.alert('保存に失敗しました', 'もう一度お試しください');
          }
        }}
        disabled={state.saving}
      >
        <Text style={styles.saveLabel}>{state.saving ? '保存中...' : '保存'}</Text>
      </Pressable>
      {state.settingsError && <Text style={styles.errorText}>{state.settingsError}</Text>}

      <RecordModal
        visible={state.recordVisible}
        draft={state.recordDraft}
        onClose={() => viewModel.closeRecord()}
        onSave={async () => {
          const res = await viewModel.saveRecord();
          if (!res.ok) {
            Alert.alert('保存に失敗しました', 'もう一度お試しください');
          }
        }}
        onChange={(next) => viewModel.updateRecordDraft(next)}
        onGuideTypeChange={(guideType, draft) => {
          viewModel.updateGuideType(guideType);
          const current = viewModel.getState().recordDraft;
          return current ?? draft;
        }}
      />
    </ScrollView>
  );
}

const useSessionViewModel = (viewModel: SessionViewModel) => {
  const [state, setState] = useState(viewModel.getState());
  useEffect(() => {
    setState(viewModel.getState());
    const unsubscribe = viewModel.subscribe(() => {
      setState(viewModel.getState());
    });
    return unsubscribe;
  }, [viewModel]);
  return state;
};

const styles = StyleSheet.create({
  container: { padding: basePadding, gap: 12 },
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
  errorText: { marginTop: 6, color: '#b91c1c', fontSize: 13 },
  body: { fontSize: 16, color: '#555' },
});
