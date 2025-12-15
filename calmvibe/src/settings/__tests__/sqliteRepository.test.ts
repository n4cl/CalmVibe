import { SqliteSettingsRepository } from '../sqliteRepository';
import { defaultSettings, SettingsValues } from '../types';

describe('SqliteSettingsRepository (memory fallback)', () => {
  const freshRepo = () => new SqliteSettingsRepository();

  it('既定値を返す', async () => {
    const repo = freshRepo();
    const loaded = await repo.get();
    expect(loaded).toEqual(defaultSettings);
  });

  it('保存した設定を取得できる', async () => {
    const repo = freshRepo();
    const values: SettingsValues = {
      bpm: 72,
      durationSec: 240,
      intensity: 'strong',
      breath: { type: 'three-phase', inhaleSec: 5, holdSec: 5, exhaleSec: 5, cycles: 10 },
    };
    await repo.save(values);

    const loaded = await repo.get();
    expect(loaded).toEqual(values);
  });
});
