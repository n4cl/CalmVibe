import { SqliteSessionRepository } from '../sqliteRepository';

type FakeDb = {
  execSync: jest.Mock;
  runSync: jest.Mock;
};

const createRepoWithStore = (initialIds: number[]) => {
  let store = initialIds.map((id) => ({ id }));
  const execSync = jest.fn();
  const runSync = jest.fn((sql: string, params?: number[]) => {
    if (sql.startsWith('DELETE FROM session_records')) {
      const ids = (params ?? []).map((value) => Number(value));
      store = store.filter((row) => !ids.includes(row.id));
    }
  });
  const repo = Object.create(SqliteSessionRepository.prototype) as SqliteSessionRepository;
  (repo as { db: FakeDb }).db = { execSync, runSync };
  return { repo, getStore: () => store, execSync, runSync };
};

describe('SqliteSessionRepository deleteMany', () => {
  it('指定したIDを削除し、トランザクションを開始/終了する', async () => {
    const { repo, getStore, execSync, runSync } = createRepoWithStore([1, 2, 3]);

    await repo.deleteMany(['1', '3']);

    expect(getStore().map((row) => row.id)).toEqual([2]);
    expect(execSync).toHaveBeenCalledWith('BEGIN;');
    expect(execSync).toHaveBeenCalledWith('COMMIT;');
    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM session_records'),
      [1, 3]
    );
  });

  it('空配列はno-opになる', async () => {
    const { repo, getStore, execSync, runSync } = createRepoWithStore([1]);

    await repo.deleteMany([]);

    expect(getStore().map((row) => row.id)).toEqual([1]);
    expect(execSync).not.toHaveBeenCalled();
    expect(runSync).not.toHaveBeenCalled();
  });

  it('存在しないIDは無視される', async () => {
    const { repo, getStore, execSync, runSync } = createRepoWithStore([1, 2]);

    await repo.deleteMany(['999']);

    expect(getStore().map((row) => row.id)).toEqual([1, 2]);
    expect(execSync).toHaveBeenCalledWith('BEGIN;');
    expect(execSync).toHaveBeenCalledWith('COMMIT;');
    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM session_records'),
      [999]
    );
  });
});
