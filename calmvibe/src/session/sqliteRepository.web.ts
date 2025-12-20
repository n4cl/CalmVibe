import { SessionRecord, SessionRepository } from './types';

/**
 * Web用のメモリ実装。永続化は行わない。
 */
export class SqliteSessionRepository implements SessionRepository {
  private store: SessionRecord[] = [];

  async save(record: SessionRecord): Promise<void> {
    // idを内部で付ける
    const nextId = String(this.store.length + 1);
    this.store.push({ ...record, id: nextId });
  }

  async list(): Promise<SessionRecord[]> {
    return [...this.store].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
  }

  async get(id: string): Promise<SessionRecord | null> {
    return this.store.find((r) => r.id === id) ?? null;
  }
}
