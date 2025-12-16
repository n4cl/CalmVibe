import * as SQLite from 'expo-sqlite';
import { SessionRecord, SessionRepository } from './types';

const DB_NAME = 'calmvibe.db';

export class SqliteSessionRepository implements SessionRepository {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync(DB_NAME);
    this.migrate();
  }

  private migrate() {
    this.db.execSync(
      `CREATE TABLE IF NOT EXISTS session_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startedAt TEXT NOT NULL,
        endedAt TEXT NOT NULL,
        guideType TEXT NOT NULL,
        bpm INTEGER NULL,
        preHr INTEGER NULL,
        postHr INTEGER NULL,
        comfort INTEGER NULL,
        improvement INTEGER NULL,
        breathConfig TEXT NULL,
        notes TEXT NULL
      );`
    );
    this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_session_records_startedAt_desc ON session_records(startedAt DESC);`);
  }

  async save(record: SessionRecord): Promise<void> {
    this.db.runSync(
      `INSERT INTO session_records (startedAt, endedAt, guideType, bpm, preHr, postHr, comfort, improvement, breathConfig, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.startedAt,
        record.endedAt,
        record.guideType,
        record.bpm ?? null,
        record.preHr ?? null,
        record.postHr ?? null,
        record.comfort ?? null,
        record.improvement ?? null,
        record.breathConfig ? JSON.stringify(record.breathConfig) : null,
        null,
      ]
    );
  }

  async list(): Promise<SessionRecord[]> {
    const rows = this.db.getAllSync(
      `SELECT id, startedAt, endedAt, guideType, bpm, preHr, postHr, comfort, improvement, breathConfig
       FROM session_records
       ORDER BY startedAt DESC`
    ) as any[];
    return rows.map((r) => ({
      id: String(r.id),
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      guideType: r.guideType,
      bpm: r.bpm ?? undefined,
      preHr: r.preHr ?? undefined,
      postHr: r.postHr ?? undefined,
      comfort: r.comfort ?? undefined,
      improvement: r.improvement ?? undefined,
      breathConfig: r.breathConfig ? JSON.parse(r.breathConfig) : undefined,
    }));
  }

  async get(id: string): Promise<SessionRecord | null> {
    const row = this.db.getFirstSync(
      `SELECT id, startedAt, endedAt, guideType, bpm, preHr, postHr, comfort, improvement, breathConfig
       FROM session_records WHERE id = ?`,
      [id]
    ) as any;
    if (!row) return null;
    return {
      id: String(row.id),
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      guideType: row.guideType,
      bpm: row.bpm ?? undefined,
      preHr: row.preHr ?? undefined,
      postHr: row.postHr ?? undefined,
      comfort: row.comfort ?? undefined,
      improvement: row.improvement ?? undefined,
      breathConfig: row.breathConfig ? JSON.parse(row.breathConfig) : undefined,
    };
  }
}
