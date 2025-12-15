import * as SQLite from 'expo-sqlite';
import { SettingsRepository, SettingsValues, defaultSettings } from './types';

const DB_NAME = 'calmvibe.db';
const TABLE_SQL = `CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY NOT NULL,
  bpm INT,
  durationSec INT NULL,
  intensity TEXT,
  breathType TEXT,
  inhaleSec INT,
  holdSec INT NULL,
  exhaleSec INT,
  breathCycles INT NULL,
  updatedAt TEXT
)`;

const toRow = (values: SettingsValues) => {
  const bpm = clamp(values.bpm, 40, 90, defaultSettings.bpm);
  const durationSec =
    values.durationSec === null ? null : clamp(values.durationSec, 60, 300, defaultSettings.durationSec as number);
  const intensity = values.intensity;
  const breath = normalizeBreath(values.breath);

  const base = {
    bpm,
    durationSec,
    intensity,
    inhaleSec: breath.inhaleSec,
    exhaleSec: breath.exhaleSec,
    cycles: breath.cycles,
  };
  if (breath.type === 'three-phase') {
    return {
      ...base,
      breathType: 'three-phase',
      holdSec: breath.holdSec,
    };
  }
  return {
    ...base,
    breathType: 'two-phase',
    holdSec: null,
  };
};

const fromRow = (row: any): SettingsValues => {
  const breath = row.breathType === 'two-phase'
    ? { type: 'two-phase' as const, inhaleSec: row.inhaleSec, exhaleSec: row.exhaleSec, cycles: row.breathCycles ?? null }
    : { type: 'three-phase' as const, inhaleSec: row.inhaleSec, holdSec: row.holdSec ?? 0, exhaleSec: row.exhaleSec, cycles: row.breathCycles ?? null };
  return {
    bpm: row.bpm,
    durationSec: row.durationSec === null ? null : row.durationSec,
    intensity: row.intensity,
    breath,
  };
};

const memoryStore: { value: SettingsValues | null } = { value: null };

type DB = any;

const ensureTable = (db: DB) => {
  db.transaction((tx: any) => {
    tx.executeSql(TABLE_SQL);
  });
};

const queryOne = (db: DB): Promise<SettingsValues | undefined> =>
  new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT bpm, durationSec, intensity, breathType, inhaleSec, holdSec, exhaleSec, breathCycles FROM settings WHERE id = 1 LIMIT 1',
        [],
        (_: any, result: any) => {
          const row = result.rows.item(0);
          if (!row) return resolve(undefined);
          resolve(fromRow(row));
        },
        (_: any, err: any) => {
          reject(err);
          return true;
        }
      );
    });
  });

const upsert = (db: DB, values: SettingsValues): Promise<void> =>
  new Promise((resolve, reject) => {
    const row = toRow(values);
    db.transaction((tx: any) => {
      tx.executeSql(
        'INSERT INTO settings (id, bpm, durationSec, intensity, breathType, inhaleSec, holdSec, exhaleSec, breathCycles, updatedAt) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now")) ON CONFLICT(id) DO UPDATE SET bpm=excluded.bpm, durationSec=excluded.durationSec, intensity=excluded.intensity, breathType=excluded.breathType, inhaleSec=excluded.inhaleSec, holdSec=excluded.holdSec, exhaleSec=excluded.exhaleSec, breathCycles=excluded.breathCycles, updatedAt=datetime("now")',
        [
          row.bpm,
          row.durationSec,
          row.intensity,
          row.breathType,
          row.inhaleSec,
          row.holdSec,
          row.exhaleSec,
          row.cycles,
        ],
        () => resolve(),
        (_: any, err: any) => {
          reject(err);
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
      const row = await queryOne(this.db);
      if (row) return row;
      await upsert(this.db, defaultSettings);
      return defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  async save(values: SettingsValues): Promise<void> {
    const normalized: SettingsValues = {
      bpm: clamp(values.bpm, 40, 90, defaultSettings.bpm),
      durationSec:
        values.durationSec === null ? null : clamp(values.durationSec, 60, 300, defaultSettings.durationSec as number),
      intensity: values.intensity,
      breath: normalizeBreath(values.breath),
    };

    if (this.useMemory || !this.db) {
      memoryStore.value = normalized;
      return;
    }
    await upsert(this.db, normalized);
  }
}

const clamp = (val: number, min: number, max: number, fallback: number) => {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  if (val < min || val > max) return fallback;
  return val;
};

const normalizeBreath = (breath: SettingsValues['breath']) => {
  if (breath.type === 'two-phase') {
    if (breath.inhaleSec <= 0 || breath.exhaleSec <= 0) return defaultSettings.breath;
    return breath;
  }
  if (breath.inhaleSec <= 0 || breath.exhaleSec <= 0 || breath.holdSec <= 0) return defaultSettings.breath;
  return breath;
};
