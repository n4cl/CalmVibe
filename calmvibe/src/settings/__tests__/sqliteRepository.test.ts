import { SqliteSettingsRepository } from '../sqliteRepository';
import { SettingsValues, defaultSettings } from '../types';

jest.mock('expo-sqlite', () => ({
  // openDatabaseを未定義にしてメモリフォールバック経路を通す
}), { virtual: true });

describe('SqliteSettingsRepository (memory fallback)', () => {
  const repo = () => new SqliteSettingsRepository();

  it('何も保存されていなければデフォルト設定を返す', async () => {
    const loaded = await repo().get();
    expect(loaded).toEqual(defaultSettings);
  });

  it('保存した設定をそのまま取得できる', async () => {
    const r = repo();
    const values: SettingsValues = {
      bpm: 72,
      durationSec: null,
      intensity: 'strong',
      breath: { type: 'three-phase', inhaleSec: 5, holdSec: 5, exhaleSec: 5, cycles: 10 },
    };
    await r.save(values);
    const loaded = await r.get();
    expect(loaded).toEqual(values);
  });
});
