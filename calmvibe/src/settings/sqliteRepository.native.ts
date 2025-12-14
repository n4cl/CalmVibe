import * as SQLite from 'expo-sqlite';
import { SettingsRepository, SettingsValues, defaultSettings } from './types';

const DB_NAME = 'calmvibe.db';
const memoryStore: { value: SettingsValues | null } = { value: null };
type DB = any;

const ensureTable = (db: DB) => {
  db.transaction((tx: any) => {
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY NOT NULL, bpm INT, durationSec INT, intensity TEXT, breathPreset TEXT, updatedAt TEXT)'
    );

    // 移行: 旧スキーマ(useBreath列あり)から新スキーマへコピー
    tx.executeSql(
      'PRAGMA table_info(settings)',
      [],
      (_: any, result: any) => {
        const hasUseBreath = result.rows._array?.some((c: any) => c.name === 'useBreath');
        if (!hasUseBreath) return;

        tx.executeSql('ALTER TABLE settings RENAME TO settings_old');
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY NOT NULL, bpm INT, durationSec INT, intensity TEXT, breathPreset TEXT, updatedAt TEXT)'
        );
        tx.executeSql(
          'INSERT INTO settings (id, bpm, durationSec, intensity, breathPreset, updatedAt) SELECT id, bpm, durationSec, intensity, breathPreset, updatedAt FROM settings_old'
        );
        tx.executeSql('DROP TABLE IF EXISTS settings_old');
      },
      () => false
    );
  });
};

const queryAll = (db: DB): Promise<SettingsValues | undefined> =>
  new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT bpm, durationSec, intensity, breathPreset FROM settings WHERE id = 1 LIMIT 1',
        [],
        (_: any, result: any) => {
          const row = result.rows.item(0);
          if (!row) {
            resolve(undefined);
            return;
          }
          resolve({
            bpm: row.bpm,
            durationSec: row.durationSec,
            intensity: row.intensity,
            breathPreset: row.breathPreset,
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
        'INSERT INTO settings (id, bpm, durationSec, intensity, breathPreset, updatedAt) VALUES (1, ?, ?, ?, ?, datetime("now")) ON CONFLICT(id) DO UPDATE SET bpm=excluded.bpm, durationSec=excluded.durationSec, intensity=excluded.intensity, breathPreset=excluded.breathPreset, updatedAt=datetime("now")',
        [values.bpm, values.durationSec, values.intensity, values.breathPreset],
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

  async get(): Promise<SettingsValues> {
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

  async save(values: SettingsValues): Promise<void> {
    if (this.useMemory || !this.db) {
      memoryStore.value = values;
      return;
    }
    await upsert(this.db, values);
  }
}
