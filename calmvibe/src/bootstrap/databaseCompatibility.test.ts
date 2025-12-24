import { ensureDatabaseCompatibility, dbSchemaVersion, resetDatabaseCompatibilityCache } from './databaseCompatibility';

describe('databaseCompatibility', () => {
  beforeEach(() => {
    resetDatabaseCompatibilityCache();
  });

  test('user_version が一致している場合は初期化しない', async () => {
    const db = createMockDb({ userVersion: dbSchemaVersion });
    await ensureDatabaseCompatibility({ db });
    expect(db.execSync).not.toHaveBeenCalledWith('DROP TABLE IF EXISTS settings;');
    expect(db.execSync).not.toHaveBeenCalledWith('DROP TABLE IF EXISTS session_records;');
  });

  test('user_version が不一致の場合はDBを初期化してバージョンを更新する', async () => {
    const db = createMockDb({ userVersion: dbSchemaVersion - 1 });
    await ensureDatabaseCompatibility({ db });
    expect(db.execSync).toHaveBeenCalledWith('DROP TABLE IF EXISTS settings;');
    expect(db.execSync).toHaveBeenCalledWith('DROP TABLE IF EXISTS session_records;');
    expect(db.execSync).toHaveBeenCalledWith(`PRAGMA user_version = ${dbSchemaVersion};`);
  });

  test('同一実行中に二重で初期化されない', async () => {
    const db = createMockDb({ userVersion: dbSchemaVersion - 1 });
    await ensureDatabaseCompatibility({ db });
    await ensureDatabaseCompatibility({ db });
    const dropCalls = db.execSync.mock.calls.filter((call) =>
      call[0] === 'DROP TABLE IF EXISTS settings;' || call[0] === 'DROP TABLE IF EXISTS session_records;'
    );
    expect(dropCalls.length).toBe(2);
  });
});

type Db = {
  getFirstSync: jest.Mock;
  execSync: jest.Mock;
};

type DbOptions = { userVersion: number };

const createMockDb = ({ userVersion }: DbOptions): Db => ({
  getFirstSync: jest.fn().mockReturnValue({ user_version: userVersion }),
  execSync: jest.fn(),
});
