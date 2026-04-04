import { SessionListCursor, SessionPageResult, SessionRecord, SessionRepository, SessionRecordUpdate } from './types';

// Webではリポジトリ生成単位で分断されないようモジュールスコープで共有する。
let sharedStore: SessionRecord[] = [];
let sharedNextId = 1;

/**
 * テストの独立性を保つためのリセット関数。
 */
export const resetSessionRepositoryStoreForTests = () => {
  sharedStore = [];
  sharedNextId = 1;
};

/**
 * Web用のメモリ実装。永続化は行わない。
 */
export class SqliteSessionRepository implements SessionRepository {
  async save(record: SessionRecord): Promise<void> {
    // idを内部で付ける
    const nextId = String(sharedNextId++);
    sharedStore.push({ ...record, id: nextId });
  }

  async update(input: SessionRecordUpdate): Promise<void> {
    const index = sharedStore.findIndex((record) => record.id === input.id);
    if (index === -1) return;
    const current = sharedStore[index];
    sharedStore[index] = {
      ...current,
      guideType: input.guideType,
      bpm: input.bpm,
      preHr: input.preHr,
      postHr: input.postHr,
      improvement: input.improvement,
      breathConfig: input.breathConfig,
    };
  }

  async list(): Promise<SessionRecord[]> {
    return [...sharedStore].sort(compareRecordsDesc);
  }

  async listPage(input: {
    limit: number;
    cursor?: SessionListCursor | null;
  }): Promise<SessionPageResult> {
    const limit = Math.max(1, Math.floor(input.limit));
    const cursor = input.cursor ?? null;
    const sorted = [...sharedStore].sort(compareRecordsDesc);
    const filtered = cursor
      ? sorted.filter((record) => {
          if (record.recordedAt < cursor.recordedAt) return true;
          if (record.recordedAt > cursor.recordedAt) return false;
          return Number(record.id) < Number(cursor.id);
        })
      : sorted;
    const page = filtered.slice(0, limit + 1);
    const hasNext = page.length > limit;
    const records = hasNext ? page.slice(0, limit) : page;
    const last = records[records.length - 1];
    return {
      records,
      nextCursor: hasNext && last ? { recordedAt: last.recordedAt, id: last.id } : null,
      hasNext,
    };
  }

  async get(id: string): Promise<SessionRecord | null> {
    return sharedStore.find((r) => r.id === id) ?? null;
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const targetIds = new Set(ids);
    sharedStore = sharedStore.filter((record) => !targetIds.has(record.id));
  }
}

const compareRecordsDesc = (a: SessionRecord, b: SessionRecord) => {
  if (a.recordedAt === b.recordedAt) {
    return Number(b.id) - Number(a.id);
  }
  return a.recordedAt < b.recordedAt ? 1 : -1;
};
