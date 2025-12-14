import { SettingsRepository, SettingsValues, defaultSettings } from './types';

const memoryStore: { value: SettingsValues } = { value: defaultSettings };

export class SqliteSettingsRepository implements SettingsRepository {
  async get(): Promise<SettingsValues> {
    return memoryStore.value;
  }

  async save(values: SettingsValues): Promise<void> {
    memoryStore.value = values;
  }
}
