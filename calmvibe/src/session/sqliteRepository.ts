import * as SQLite from 'expo-sqlite';
import { SessionListCursor, SessionRecord, SessionRepository, SessionPageResult, SessionRecordUpdate } from './types';

const DB_NAME = 'calmvibe.db';

export class SqliteSessionRepository implements SessionRepository {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync(DB_NAME);
    this.migrate();
  }

  private migrate() {
    const columns = this.db.getAllSync(`PRAGMA table_info(session_records);`) as Array<{
      name: string;
      notnull: number;
    }>;
    if (columns.length === 0) {
      this.createTable();
      return;
    }
    const hasRecordedAt = columns.some((c) => c.name === 'recordedAt');
    const startedNotNull = columns.find((c) => c.name === 'startedAt')?.notnull === 1;
    const endedNotNull = columns.find((c) => c.name === 'endedAt')?.notnull === 1;
    if (!hasRecordedAt || startedNotNull || endedNotNull) {
      this.rebuildTable(hasRecordedAt);
    }
    this.db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_session_records_recordedAt_id_desc ON session_records(recordedAt DESC, id DESC);`
    );
  }

  private createTable() {
    this.db.execSync(
      `CREATE TABLE IF NOT EXISTS session_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recordedAt TEXT NOT NULL,
        startedAt TEXT NULL,
        endedAt TEXT NULL,
        guideType TEXT NOT NULL,
        bpm INTEGER NULL,
        preHr INTEGER NULL,
        postHr INTEGER NULL,
        improvement INTEGER NULL,
        breathConfig TEXT NULL,
        notes TEXT NULL
      );`
    );
    this.db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_session_records_recordedAt_id_desc ON session_records(recordedAt DESC, id DESC);`
    );
  }

  private rebuildTable(hasRecordedAt: boolean) {
    const rows = hasRecordedAt
      ? (this.db.getAllSync(
          `SELECT id, recordedAt, startedAt, endedAt, guideType, bpm, preHr, postHr, improvement, breathConfig, notes
           FROM session_records`
        ) as any[])
      : (this.db.getAllSync(
          `SELECT id, startedAt, endedAt, guideType, bpm, preHr, postHr, improvement, breathConfig, notes
           FROM session_records`
        ) as any[]);

    this.db.execSync(`DROP TABLE IF EXISTS session_records_v2;`);
    this.db.execSync(
      `CREATE TABLE session_records_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recordedAt TEXT NOT NULL,
        startedAt TEXT NULL,
        endedAt TEXT NULL,
        guideType TEXT NOT NULL,
        bpm INTEGER NULL,
        preHr INTEGER NULL,
        postHr INTEGER NULL,
        improvement INTEGER NULL,
        breathConfig TEXT NULL,
        notes TEXT NULL
      );`
    );

    const nowIso = new Date().toISOString();
    rows.forEach((row) => {
      const recordedAt = hasRecordedAt ? row.recordedAt ?? nowIso : row.startedAt ?? row.endedAt ?? nowIso;
      this.db.runSync(
        `INSERT INTO session_records_v2 (id, recordedAt, startedAt, endedAt, guideType, bpm, preHr, postHr, improvement, breathConfig, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          recordedAt,
          row.startedAt ?? null,
          row.endedAt ?? null,
          row.guideType,
          row.bpm ?? null,
          row.preHr ?? null,
          row.postHr ?? null,
          row.improvement ?? null,
          row.breathConfig ?? null,
          row.notes ?? null,
        ]
      );
    });

    this.db.execSync(`DROP TABLE session_records;`);
    this.db.execSync(`ALTER TABLE session_records_v2 RENAME TO session_records;`);
  }

  async save(record: SessionRecord): Promise<void> {
    this.db.runSync(
      `INSERT INTO session_records (recordedAt, startedAt, endedAt, guideType, bpm, preHr, postHr, improvement, breathConfig, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.recordedAt,
        record.startedAt,
        record.endedAt,
        record.guideType,
        record.bpm ?? null,
        record.preHr ?? null,
        record.postHr ?? null,
        record.improvement ?? null,
        record.breathConfig ? JSON.stringify(record.breathConfig) : null,
        null,
      ]
    );
  }

  async update(input: SessionRecordUpdate): Promise<void> {
    this.db.runSync(
      `UPDATE session_records
       SET guideType = ?, bpm = ?, preHr = ?, postHr = ?, improvement = ?, breathConfig = ?
       WHERE id = ?`,
      [
        input.guideType,
        input.bpm ?? null,
        input.preHr ?? null,
        input.postHr ?? null,
        input.improvement ?? null,
        input.breathConfig ? JSON.stringify(input.breathConfig) : null,
        input.id,
      ]
    );
  }

  async list(): Promise<SessionRecord[]> {
    const rows = this.db.getAllSync(
      `SELECT id, recordedAt, startedAt, endedAt, guideType, bpm, preHr, postHr, improvement, breathConfig
       FROM session_records
       ORDER BY recordedAt DESC, id DESC`
    ) as any[];
    return rows.map((r) => ({
      id: String(r.id),
      recordedAt: r.recordedAt,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      guideType: r.guideType,
      bpm: r.bpm ?? undefined,
      preHr: r.preHr ?? undefined,
      postHr: r.postHr ?? undefined,
      improvement: r.improvement ?? undefined,
      breathConfig: r.breathConfig ? JSON.parse(r.breathConfig) : undefined,
    }));
  }

  async listPage(input: {
    limit: number;
    cursor?: SessionListCursor | null;
  }): Promise<SessionPageResult> {
    const limit = Math.max(1, Math.floor(input.limit));
    const sqlLimit = limit + 1;
    const cursor = input.cursor ?? null;
    const rows = cursor
      ? (this.db.getAllSync(
          `SELECT id, recordedAt, startedAt, endedAt, guideType, bpm, preHr, postHr, improvement, breathConfig
           FROM session_records
           WHERE (recordedAt < ? OR (recordedAt = ? AND id < ?))
           ORDER BY recordedAt DESC, id DESC
           LIMIT ?`,
          [cursor.recordedAt, cursor.recordedAt, Number(cursor.id), sqlLimit]
        ) as any[])
      : (this.db.getAllSync(
          `SELECT id, recordedAt, startedAt, endedAt, guideType, bpm, preHr, postHr, improvement, breathConfig
           FROM session_records
           ORDER BY recordedAt DESC, id DESC
           LIMIT ?`,
          [sqlLimit]
        ) as any[]);

    const hasNext = rows.length > limit;
    const pageRows = hasNext ? rows.slice(0, limit) : rows;
    const records = pageRows.map((r) => ({
      id: String(r.id),
      recordedAt: r.recordedAt,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      guideType: r.guideType,
      bpm: r.bpm ?? undefined,
      preHr: r.preHr ?? undefined,
      postHr: r.postHr ?? undefined,
      improvement: r.improvement ?? undefined,
      breathConfig: r.breathConfig ? JSON.parse(r.breathConfig) : undefined,
    }));
    const last = records[records.length - 1];
    return {
      records,
      nextCursor: hasNext && last ? { recordedAt: last.recordedAt, id: last.id } : null,
      hasNext,
    };
  }

  async get(id: string): Promise<SessionRecord | null> {
    const row = this.db.getFirstSync(
      `SELECT id, recordedAt, startedAt, endedAt, guideType, bpm, preHr, postHr, improvement, breathConfig
       FROM session_records WHERE id = ?`,
      [id]
    ) as any;
    if (!row) return null;
    return {
      id: String(row.id),
      recordedAt: row.recordedAt,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      guideType: row.guideType,
      bpm: row.bpm ?? undefined,
      preHr: row.preHr ?? undefined,
      postHr: row.postHr ?? undefined,
      improvement: row.improvement ?? undefined,
      breathConfig: row.breathConfig ? JSON.parse(row.breathConfig) : undefined,
    };
  }
}
