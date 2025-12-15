import { SettingsRepository, SettingsValues, defaultSettings } from './types';

const memoryStore: { value: SettingsValues | null } = { value: null };

export class SqliteSettingsRepository implements SettingsRepository {
  async get(): Promise<SettingsValues> {
    if (!memoryStore.value) memoryStore.value = defaultSettings;
    return memoryStore.value;
  }

  async save(values: SettingsValues): Promise<void> {
    memoryStore.value = values;
  }
}
