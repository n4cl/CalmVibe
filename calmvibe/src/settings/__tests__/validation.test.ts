import { defaultSettings, SettingsValues } from '../types';
import { SqliteSettingsRepository } from '../sqliteRepository';

jest.mock('expo-sqlite', () => ({
  // openDatabaseを未定義にしてメモリフォールバック経路を通す
}), { virtual: true });

const repo = () => new SqliteSettingsRepository();

const validBreath: SettingsValues['breath'] = {
  type: 'two-phase',
  inhaleSec: 4,
  exhaleSec: 4,
  cycles: null,
};

describe('SettingsRepository validation (memory)', () => {
  it('不正なbpmは保存されずデフォルトを返す', async () => {
    const r = repo();
    await r.save({ ...defaultSettings, bpm: 200 });
    const loaded = await r.get();
    expect(loaded.bpm).toBe(defaultSettings.bpm);
  });

  it('不正なdurationSecは保存されずデフォルトを返す', async () => {
    const r = repo();
    await r.save({ ...defaultSettings, durationSec: 10 });
    const loaded = await r.get();
    expect(loaded.durationSec).toBe(defaultSettings.durationSec);
  });

  it('null(∞)のdurationSecは許容される', async () => {
    const r = repo();
    await r.save({ ...defaultSettings, durationSec: null });
    const loaded = await r.get();
    expect(loaded.durationSec).toBeNull();
  });

  it('呼吸パターンの秒数が0以下ならデフォルトで上書きされる', async () => {
    const r = repo();
    await r.save({
      ...defaultSettings,
      breath: { type: 'two-phase', inhaleSec: 0, exhaleSec: -1, cycles: 1 },
    });
    const loaded = await r.get();
    expect(loaded.breath).toEqual(defaultSettings.breath);
  });

  it('正常値はそのまま保存・取得できる', async () => {
    const r = repo();
    const values: SettingsValues = {
      bpm: 72,
      durationSec: 240,
      intensity: 'strong',
      breath: validBreath,
    };
    await r.save(values);
    const loaded = await r.get();
    expect(loaded).toEqual(values);
  });

  it('上限120のbpmは許容される', async () => {
    const r = repo();
    await r.save({ ...defaultSettings, bpm: 120 });
    const loaded = await r.get();
    expect(loaded.bpm).toBe(120);
  });
});
