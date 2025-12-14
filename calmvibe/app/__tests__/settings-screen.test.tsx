import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../settings';
import { SettingsValues } from '../../src/settings/types';

const defaultValues: SettingsValues = {
  tempoPreset: '4-6-4',
  intensity: 'medium',
  pattern: 'pulse',
};

const mockRepo = () => ({
  getSettings: jest.fn().mockResolvedValue(defaultValues),
  saveSettings: jest.fn().mockResolvedValue(undefined),
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: 'Medium' },
}));

describe('SettingsScreen', () => {
  it('ロード時に保存済み設定を表示する', async () => {
    const repo = mockRepo();
    const { getByText } = render(<SettingsScreen repository={repo} />);

    await waitFor(() => expect(repo.getSettings).toHaveBeenCalled());
    expect(getByText('現在のテンポ: 4-6-4')).toBeTruthy();
    expect(getByText('バイブ強度: 中')).toBeTruthy();
    expect(getByText('パターン: パルス')).toBeTruthy();
  });

  it('保存ボタンで設定を永続化する', async () => {
    const repo = mockRepo();
    const { getByText } = render(<SettingsScreen repository={repo} />);

    await waitFor(() => expect(repo.getSettings).toHaveBeenCalled());

    fireEvent.press(getByText('5-5-5'));
    fireEvent.press(getByText('強'));
    fireEvent.press(getByText('ウェーブ'));
    fireEvent.press(getByText('保存'));

    await waitFor(() =>
      expect(repo.saveSettings).toHaveBeenCalledWith({
        tempoPreset: '5-5-5',
        intensity: 'strong',
        pattern: 'wave',
      })
    );
  });

  it('プレビューで振動がトリガーされる', async () => {
    const repo = mockRepo();
    const { getByText } = render(<SettingsScreen repository={repo} />);

    await waitFor(() => expect(repo.getSettings).toHaveBeenCalled());

    const { impactAsync } = require('expo-haptics');
    fireEvent.press(getByText('プレビュー'));

    await waitFor(() => expect(impactAsync).toHaveBeenCalled());
  });
});
