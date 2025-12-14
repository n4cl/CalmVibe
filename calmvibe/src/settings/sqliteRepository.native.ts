import * as SQLite from 'expo-sqlite';
import { SettingsRepository, SettingsValues, defaultSettings } from './types';

const DB_NAME = 'calmvibe.db';

// テスト環境やSQLite非対応環境ではメモリにフォールバックする
const memoryStore: { value: SettingsValues | null } = { value: null };

type DB = any;

const ensureTable = (db: DB) => {
  db.transaction((tx: any) => {
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY NOT NULL, tempoPreset TEXT, intensity TEXT, pattern TEXT, updatedAt TEXT)'
    );
  });
};

const queryAll = (db: DB): Promise<SettingsValues | undefined> =>
  new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT tempoPreset, intensity, pattern FROM settings WHERE id = 1 LIMIT 1',
        [],
        (_: any, result: any) => {
          const row = result.rows.item(0);
          if (!row) {
            resolve(undefined);
            return;
          }
          resolve({
            tempoPreset: row.tempoPreset,
            intensity: row.intensity,
            pattern: row.pattern,
          } as SettingsValues);
        },
        (_: any, error: any) => {
          reject(error);
          return true;
        }
      );
    });
  });

const upsert = (db: DB, values: SettingsValues): Promise<void> =>
  new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'INSERT INTO settings (id, tempoPreset, intensity, pattern, updatedAt) VALUES (1, ?, ?, ?, datetime("now")) ON CONFLICT(id) DO UPDATE SET tempoPreset=excluded.tempoPreset, intensity=excluded.intensity, pattern=excluded.pattern, updatedAt=datetime("now")',
        [values.tempoPreset, values.intensity, values.pattern],
        () => resolve(),
        (_: any, error: any) => {
          reject(error);
          return true;
        }
      );
    });
  });

export class SqliteSettingsRepository implements SettingsRepository {
  private db: DB | null = null;
  private useMemory = false;

  constructor() {
    if (typeof (SQLite as any).openDatabase === 'function') {
      this.db = (SQLite as any).openDatabase(DB_NAME);
      ensureTable(this.db);
    } else {
      this.useMemory = true;
    }
  }

  async getSettings(): Promise<SettingsValues> {
    if (this.useMemory || !this.db) {
      if (!memoryStore.value) memoryStore.value = defaultSettings;
      return memoryStore.value;
    }
    try {
      const existing = await queryAll(this.db);
      if (existing) return existing;
      await upsert(this.db, defaultSettings);
      return defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  }

  async saveSettings(values: SettingsValues): Promise<void> {
    if (this.useMemory || !this.db) {
      memoryStore.value = values;
      return;
    }
    await upsert(this.db, values);
  }
}
