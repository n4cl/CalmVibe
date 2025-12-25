import * as SQLite from 'expo-sqlite';

export const dbSchemaVersion = 1;

type CompatibleDb = {
  getFirstSync: (sql: string) => { user_version: number } | null;
  execSync: (sql: string) => void;
};

type CompatibilityInput = {
  db?: CompatibleDb;
};

let checked = false;

export const resetDatabaseCompatibilityCache = () => {
  checked = false;
};

const openDatabase = (): CompatibleDb | null => {
  if (typeof (SQLite as any).openDatabaseSync !== 'function') return null;
  return (SQLite as any).openDatabaseSync('calmvibe.db');
};

const readUserVersion = (db: CompatibleDb) => {
  const row = db.getFirstSync('PRAGMA user_version;');
  return row?.user_version ?? 0;
};

const resetTables = (db: CompatibleDb) => {
  db.execSync('DROP TABLE IF EXISTS settings;');
  db.execSync('DROP TABLE IF EXISTS session_records;');
};

const updateUserVersion = (db: CompatibleDb) => {
  db.execSync(`PRAGMA user_version = ${dbSchemaVersion};`);
};

export const ensureDatabaseCompatibility = async (input: CompatibilityInput = {}): Promise<void> => {
  if (checked) return;
  checked = true;

  const db = input.db ?? openDatabase();
  if (!db) return;

  const currentVersion = readUserVersion(db);
  if (currentVersion === dbSchemaVersion) return;

  resetTables(db);
  updateUserVersion(db);
};
