import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { RecordDraft, SessionListCursor, SessionRecord, SessionRecordUpdate, SessionRepository } from '../src/session/types';
import { SqliteSessionRepository } from '../src/session/sqliteRepository';
import RecordModal from '../components/record-modal';

type Props = {
  repo?: SessionRepository;
};

const PAGE_SIZE = 20;

export default function LogsScreen({ repo: injectedRepo }: Props) {
  const repo = useMemo<SessionRepository>(() => injectedRepo ?? new SqliteSessionRepository(), [injectedRepo]);
  const mountedRef = useRef(true);
  const hasFetchedRef = useRef(false);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<SessionRecord[]>([]);
  const [selected, setSelected] = useState<SessionRecord | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<SessionListCursor | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editDraft, setEditDraft] = useState<RecordDraft | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<SessionRecord | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isFocused || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    (async () => {
      setLoading(true);
      setLoadingMore(false);
      setCursor(null);
      setHasNext(false);
      const page = await repo.listPage({ limit: PAGE_SIZE, cursor: null });
      if (!mountedRef.current) return;
      setData(page.records);
      setCursor(page.nextCursor ?? null);
      setHasNext(page.hasNext);
      setLoading(false);
    })();
  }, [isFocused, repo]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasNext) return;
    setLoadingMore(true);
    const page = await repo.listPage({ limit: PAGE_SIZE, cursor });
    if (!mountedRef.current) return;
    setData((prev) => mergeRecords(prev, page.records));
    setCursor(page.nextCursor ?? null);
    setHasNext(page.hasNext);
    setLoadingMore(false);
  }, [cursor, hasNext, loading, loadingMore, repo]);

  const refreshLatest = useCallback(async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    const page = await repo.listPage({ limit: PAGE_SIZE, cursor: null });
    if (!mountedRef.current) return;
    setData((prev) => mergeLatestRecords(prev, page.records));
    setRefreshing(false);
  }, [loading, refreshing, repo]);

  const openEdit = (record: SessionRecord) => {
    setEditSource(record);
    setEditTargetId(record.id);
    setEditDraft({
      guideType: record.guideType,
      bpm: record.bpm,
      preHr: record.preHr !== undefined ? String(record.preHr) : '',
      postHr: record.postHr !== undefined ? String(record.postHr) : '',
      improvement: record.improvement !== undefined ? String(record.improvement) : '',
      breathSummary: typeof record.breathConfig === 'string' ? record.breathConfig : undefined,
    });
    setEditVisible(true);
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
    setSelected(null);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyEdit = async () => {
    if (!editDraft || !editTargetId) return;
    const update = buildUpdate(editDraft, editTargetId, editSource);
    const saved = await retryOnce(() => repo.update(update));
    if (!mountedRef.current) return;
    if (!saved) {
      Alert.alert('保存に失敗しました', 'もう一度お試しください');
      return;
    }
    setData((prev) =>
      prev.map((record) => {
        if (record.id !== editTargetId) return record;
        return applyUpdateToRecord(record, update);
      })
    );
    setEditVisible(false);
    setEditTargetId(null);
    setEditSource(null);
  };

  const requestDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    Alert.alert('選択した履歴を削除しますか？', `${count}件を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          void confirmDelete(Array.from(selectedIds));
        },
      },
    ]);
  };

  const confirmDelete = async (ids: string[]) => {
    try {
      await repo.deleteMany(ids);
    } catch {
      Alert.alert('削除に失敗しました', 'もう一度お試しください');
      return;
    }
    if (!mountedRef.current) return;
    const idSet = new Set(ids);
    setData((prev) => prev.filter((record) => !idSet.has(record.id)));
    setSelectedIds(new Set());
    setSelectionMode(false);
    setSelected(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.body}>読み込み中...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>履歴</Text>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="logs-select-toggle" onPress={selectionMode ? exitSelectionMode : enterSelectionMode}>
              <Text style={styles.selectToggleLabel}>{selectionMode ? 'キャンセル' : '選択'}</Text>
            </Pressable>
            {selectionMode && (
              <Pressable
                accessibilityLabel="logs-delete"
                onPress={requestDelete}
                disabled={selectedIds.size === 0}
              >
                <Text style={[styles.deleteLabel, selectedIds.size === 0 && styles.deleteLabelDisabled]}>削除</Text>
              </Pressable>
            )}
          </View>
        </View>
        <Text style={styles.body}>履歴がありません</Text>
        <FlatList
          testID="logs-list"
          data={[]}
          renderItem={null as never}
          refreshing={refreshing}
          onRefresh={refreshLatest}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>履歴</Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="logs-select-toggle" onPress={selectionMode ? exitSelectionMode : enterSelectionMode}>
            <Text style={styles.selectToggleLabel}>{selectionMode ? 'キャンセル' : '選択'}</Text>
          </Pressable>
          {selectionMode && (
            <Pressable
              accessibilityLabel="logs-delete"
              onPress={requestDelete}
              disabled={selectedIds.size === 0}
            >
              <Text style={[styles.deleteLabel, selectedIds.size === 0 && styles.deleteLabelDisabled]}>削除</Text>
            </Pressable>
          )}
        </View>
      </View>
      <FlatList
        testID="logs-list"
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={selectionMode ? `log-select-${item.id}` : `log-item-${item.id}`}
            onPress={() => {
              if (selectionMode) {
                toggleSelection(item.id);
                return;
              }
              setSelected(item);
            }}
          >
            <LogCard record={item} selected={selectionMode && selectedIds.has(item.id)} selectionMode={selectionMode} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={refreshLatest}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
      {selected && (
        <View style={styles.modalBackdrop} testID="log-detail-modal">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>履歴詳細</Text>
            <Text style={styles.meta}>ガイド: {guideLabel(selected.guideType)}</Text>
            <Text style={styles.meta}>記録時刻: {formatDate(selected.recordedAt)}</Text>
            <Text style={styles.meta}>開始時刻: {formatDate(selected.startedAt)}</Text>
            <Text style={styles.meta}>終了時刻: {formatDate(selected.endedAt)}</Text>
            <Text style={styles.meta}>BPM: {selected.bpm ?? '-'}</Text>
            <Text style={styles.meta}>開始心拍: {selected.preHr ?? '-'}</Text>
            <Text style={styles.meta}>終了心拍: {selected.postHr ?? '-'}</Text>
            <Text style={styles.meta}>改善: {selected.improvement ?? '-'}</Text>
            <View style={styles.detailActions}>
              <Pressable
                accessibilityLabel="log-edit"
                style={[styles.modalButton, styles.modalEdit]}
                onPress={() => {
                  openEdit(selected);
                  setSelected(null);
                }}
              >
                <Text style={styles.modalButtonLabel}>編集する</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalClose]} onPress={() => setSelected(null)}>
                <Text style={styles.modalButtonLabel}>閉じる</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      <RecordModal
        visible={editVisible}
        draft={editDraft}
        title="履歴編集"
        onClose={() => setEditVisible(false)}
        onSave={applyEdit}
        onChange={setEditDraft}
        onGuideTypeChange={(guideType, draft) => {
          if (!editSource) return { ...draft, guideType };
          if (guideType === 'VIBRATION') {
            return {
              ...draft,
              guideType,
              bpm: editSource.bpm,
              breathSummary: undefined,
            };
          }
          return {
            ...draft,
            guideType,
            bpm: undefined,
            breathSummary: typeof editSource.breathConfig === 'string' ? editSource.breathConfig : undefined,
          };
        }}
      />
    </View>
  );
}

const guideLabel = (guide: SessionRecord['guideType']) => (guide === 'VIBRATION' ? '心拍ガイド' : '呼吸ガイド');

const formatDate = (iso?: string | null) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  } catch {
    return iso;
  }
};

function LogCard({ record, selected, selectionMode }: { record: SessionRecord; selected: boolean; selectionMode: boolean }) {
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      {selectionMode && selected && (
        <View style={styles.checkBadge} accessibilityLabel={`log-check-${record.id}`}>
          <Text style={styles.checkBadgeText}>✓</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.guide}>{guideLabel(record.guideType)}</Text>
        <Text style={styles.date}>{formatDate(record.recordedAt)}</Text>
      </View>
      <Text style={styles.meta}>
        開始心拍: {record.preHr ?? '-'} / 終了心拍: {record.postHr ?? '-'}
      </Text>
      <Text style={styles.meta}>BPM: {record.bpm ?? '-'}</Text>
      <Text style={styles.meta}>改善: {record.improvement ?? '-'}</Text>
    </View>
  );
}

const mergeRecords = (prev: SessionRecord[], next: SessionRecord[]) => {
  if (next.length === 0) return prev;
  const map = new Map(prev.map((record) => [record.id, record]));
  next.forEach((record) => {
    if (!map.has(record.id)) {
      map.set(record.id, record);
    }
  });
  return Array.from(map.values());
};

const mergeLatestRecords = (prev: SessionRecord[], latest: SessionRecord[]) => {
  if (latest.length === 0) return prev;
  const seen = new Set<string>();
  const merged: SessionRecord[] = [];
  latest.forEach((record) => {
    merged.push(record);
    seen.add(record.id);
  });
  prev.forEach((record) => {
    if (!seen.has(record.id)) {
      merged.push(record);
    }
  });
  return merged;
};

const buildUpdate = (
  draft: RecordDraft,
  id: string,
  source: SessionRecord | null
): SessionRecordUpdate => {
  const guideType = draft.guideType;
  const breathConfig =
    guideType === 'BREATH'
      ? draft.breathSummary ?? source?.breathConfig
      : undefined;
  return {
    id,
    guideType,
    bpm: guideType === 'VIBRATION' ? draft.bpm ?? source?.bpm : undefined,
    preHr: draft.preHr ? Number(draft.preHr) : undefined,
    postHr: draft.postHr ? Number(draft.postHr) : undefined,
    improvement: draft.improvement ? Number(draft.improvement) : undefined,
    breathConfig,
  };
};

const applyUpdateToRecord = (record: SessionRecord, update: SessionRecordUpdate): SessionRecord => ({
  ...record,
  guideType: update.guideType,
  bpm: update.bpm,
  preHr: update.preHr,
  postHr: update.postHr,
  improvement: update.improvement,
  breathConfig: update.breathConfig,
});

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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, width: '100%' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, color: '#555' },
  selectToggleLabel: { fontSize: 14, fontWeight: '700', color: '#2563eb', paddingVertical: 6, paddingHorizontal: 8 },
  deleteLabel: { fontSize: 14, fontWeight: '700', color: '#dc2626', paddingVertical: 6, paddingHorizontal: 8 },
  deleteLabelDisabled: { color: '#fca5a5' },
  separator: { height: 12 },
  card: {
    backgroundColor: '#f5f7fb',
    borderRadius: 12,
    padding: 12,
    paddingLeft: 40,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  cardSelected: { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' },
  checkBadge: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guide: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  date: { fontSize: 12, color: '#4b5563' },
  meta: { fontSize: 13, color: '#1f2937' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignSelf: 'flex-end' },
  modalClose: { backgroundColor: '#e5e7eb' },
  modalEdit: { backgroundColor: '#2563eb' },
  modalButtonLabel: { color: '#111', fontWeight: '700' },
  footer: { paddingVertical: 16 },
  detailActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
