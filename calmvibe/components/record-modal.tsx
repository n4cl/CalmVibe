import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RecordDraft } from '../src/session/types';

type Props = {
  visible: boolean;
  draft: RecordDraft | null;
  title?: string;
  onClose: () => void;
  onSave: () => void;
  onChange: (next: RecordDraft) => void;
  onGuideTypeChange?: (guideType: RecordDraft['guideType'], draft: RecordDraft) => RecordDraft;
};

export default function RecordModal({
  visible,
  draft,
  title = 'セッション記録',
  onClose,
  onSave,
  onChange,
  onGuideTypeChange,
}: Props) {
  if (!visible || !draft) return null;
  const error = validateRecordDraft(draft);
  const canSave = !error;

  const changeGuideType = (guideType: RecordDraft['guideType']) => {
    const next = onGuideTypeChange ? onGuideTypeChange(guideType, draft) : { ...draft, guideType };
    onChange(next);
  };

  return (
    <View style={styles.modalBackdrop} testID="record-modal">
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMeta}>ガイド: {draft.guideType === 'VIBRATION' ? '心拍ガイド' : '呼吸ガイド'}</Text>
        {draft.bpm !== undefined && <Text style={styles.modalMeta}>BPM: {draft.bpm}</Text>}
        {draft.breathSummary && <Text style={styles.modalMeta}>呼吸: {draft.breathSummary}</Text>}

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>ガイド種別</Text>
          <View style={styles.segmentRow}>
            <Pressable
              accessibilityLabel="guideType-vibration"
              style={[styles.segment, draft.guideType === 'VIBRATION' && styles.segmentActive]}
              onPress={() => changeGuideType('VIBRATION')}
            >
              <Text style={[styles.segmentLabel, draft.guideType === 'VIBRATION' && styles.segmentLabelActive]}>
                心拍
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="guideType-breath"
              style={[styles.segment, draft.guideType === 'BREATH' && styles.segmentActive]}
              onPress={() => changeGuideType('BREATH')}
            >
              <Text style={[styles.segmentLabel, draft.guideType === 'BREATH' && styles.segmentLabelActive]}>
                呼吸
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>開始心拍</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            accessibilityLabel="preHr-input"
            value={draft.preHr ?? ''}
            onChangeText={(t) => onChange({ ...draft, preHr: t })}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>終了心拍</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            accessibilityLabel="postHr-input"
            value={draft.postHr ?? ''}
            onChangeText={(t) => onChange({ ...draft, postHr: t })}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>改善</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((v) => {
              const active = Number(draft.improvement ?? 0) >= v;
              return (
                <Pressable
                  key={v}
                  accessibilityLabel={`改善${v}`}
                  onPress={() => onChange({ ...draft, improvement: String(v) })}
                >
                  <Text style={active ? styles.starActive : styles.star}>★</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.modalActions}>
          <Pressable accessibilityLabel="record-cancel" style={[styles.modalButton, styles.modalCancel]} onPress={onClose}>
            <Text style={styles.modalButtonLabel}>閉じる</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="record-save"
            style={[styles.modalButton, styles.modalSave, !canSave && styles.modalDisabled]}
            onPress={onSave}
            disabled={!canSave}
          >
            <Text style={styles.modalButtonLabel}>保存</Text>
          </Pressable>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

const HR_MIN = 30;
const HR_MAX = 220;
const BPM_MIN = 40;
const BPM_MAX = 120;

const validateRecordDraft = (draft: RecordDraft) => {
  if (draft.bpm !== undefined && (draft.bpm < BPM_MIN || draft.bpm > BPM_MAX)) {
    return `BPMは${BPM_MIN}〜${BPM_MAX}の範囲で入力してください`;
  }
  const preHrError = validateHr('開始心拍', draft.preHr);
  if (preHrError) return preHrError;
  const postHrError = validateHr('終了心拍', draft.postHr);
  if (postHrError) return postHrError;
  if (draft.improvement !== undefined && draft.improvement !== '') {
    const value = Number(draft.improvement);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return '改善は1〜5の範囲で入力してください';
    }
  }
  return null;
};

const validateHr = (label: string, value?: string) => {
  if (value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < HR_MIN || num > HR_MAX) {
    return `${label}は${HR_MIN}〜${HR_MAX}の範囲で入力してください`;
  }
  return null;
};

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalMeta: { fontSize: 14, color: '#374151' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputLabel: { width: 90, fontSize: 14, color: '#111' },
  input: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segment: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  segmentActive: { borderColor: '#2563eb', backgroundColor: '#e8f1ff' },
  segmentLabel: { fontSize: 12, color: '#1f2937' },
  segmentLabelActive: { fontSize: 12, color: '#1746b4', fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  modalCancel: { backgroundColor: '#e5e7eb' },
  modalSave: { backgroundColor: '#2563eb' },
  modalDisabled: { opacity: 0.6 },
  modalButtonLabel: { color: '#111', fontWeight: '700' },
  starsRow: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 24, color: '#cbd5e1' },
  starActive: { fontSize: 24, color: '#f59e0b' },
  errorText: { marginTop: 6, color: '#b91c1c', fontSize: 13 },
});
