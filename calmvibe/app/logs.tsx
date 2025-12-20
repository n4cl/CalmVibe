import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SessionRepository, SessionRecord } from '../src/session/types';
import { SqliteSessionRepository } from '../src/session/sqliteRepository';

type Props = {
  repo?: SessionRepository;
};

export default function LogsScreen({ repo: injectedRepo }: Props) {
  const repo = useMemo<SessionRepository>(() => injectedRepo ?? new SqliteSessionRepository(), [injectedRepo]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SessionRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await repo.list();
      if (mounted) {
        setData(list);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [repo]);

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
        <Text style={styles.title}>履歴</Text>
        <Text style={styles.body}>履歴がありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>履歴</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LogCard record={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 24 }}
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

function LogCard({ record }: { record: SessionRecord }) {
  return (
    <View style={styles.card}>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 16, color: '#555' },
  separator: { height: 12 },
  card: { backgroundColor: '#f5f7fb', borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guide: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  date: { fontSize: 12, color: '#4b5563' },
  meta: { fontSize: 13, color: '#1f2937' },
});
