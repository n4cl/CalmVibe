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
      breathPreset: '5-5-5',
    };
    await repo.save(values);

    const loaded = await repo.get();
    expect(loaded).toEqual(values);
  });
});
