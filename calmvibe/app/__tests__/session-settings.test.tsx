import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import SessionScreen from '../session';
import { SettingsRepository, SettingsValues, defaultSettings } from '../../src/settings/types';

afterEach(() => {
  cleanup();
});

type RepoFactory = () => SettingsRepository & { _store: SettingsValues | null };

const createRepo: RepoFactory = () => {
  const repoStore: { value: SettingsValues | null } = { value: null };
  return {
    _store: null as any,
    async get() {
      if (!repoStore.value) repoStore.value = defaultSettings;
      return repoStore.value;
    },
    async save(values: SettingsValues) {
      repoStore.value = values;
    },
  } as any;
};

describe('SessionScreen settings (vibration only)', () => {
  it('デフォルト設定を表示する', async () => {
    const repo = createRepo();
    const { findByText } = render(<SessionScreen settingsRepo={repo} />);

    await findByText('BPM: 60');
    await findByText('時間: 180秒');
    await findByText('強度: 中');
  });

  it('BPMを変更して保存すると再描画後も値が保持される', async () => {
    const repo = createRepo();
    const { getByText, findByText, unmount } = render(<SessionScreen settingsRepo={repo} />);

    await findByText('BPM: 60');

    fireEvent.press(getByText('+BPM'));
    fireEvent.press(getByText('保存'));

    // 再マウントして保存値が読み込まれることを確認
    unmount();
    const { findByText: findByText2 } = render(<SessionScreen settingsRepo={repo} />);
    await findByText2('BPM: 61');
  });
});
