import { SettingsRepository, SettingsValues, defaultSettings } from './types';

const memoryStore: { value: SettingsValues } = { value: defaultSettings };

export class SqliteSettingsRepository implements SettingsRepository {
  async getSettings(): Promise<SettingsValues> {
    return memoryStore.value;
  }

  async saveSettings(values: SettingsValues): Promise<void> {
    memoryStore.value = values;
  }
}
