import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../settings';
import { SettingsValues } from '../../src/settings/types';

const saved: SettingsValues = {
  bpm: 60,
  durationSec: 180,
  pattern: 'pulse',
  intensity: 'medium',
  useBreath: true,
  breathPreset: '4-6-4',
};

const mockRepo = () => ({
  get: jest.fn().mockResolvedValue(saved),
  save: jest.fn().mockResolvedValue(undefined),
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: 'Medium', Heavy: 'Heavy' },
}));

describe('SettingsScreen', () => {
  it('保存済み設定を表示する', async () => {
    const repo = mockRepo();
    const { getByText } = render(<SettingsScreen repository={repo} />);

    await waitFor(() => expect(repo.get).toHaveBeenCalled());
    expect(getByText('現在のBPM: 60')).toBeTruthy();
    expect(getByText('現在の時間: 180秒')).toBeTruthy();
    expect(getByText('現在のパターン: パルス')).toBeTruthy();
    expect(getByText('現在の強度: 中')).toBeTruthy();
    expect(getByText('呼吸ガイド: ON')).toBeTruthy();
    expect(getByText('呼吸プリセット: 4-6-4')).toBeTruthy();
  });

  it('設定を変更して保存できる', async () => {
    const repo = mockRepo();
    const { getByText } = render(<SettingsScreen repository={repo} />);

    await waitFor(() => expect(repo.get).toHaveBeenCalled());

    fireEvent.press(getByText('+BPM'));
    fireEvent.press(getByText('+時間'));
    fireEvent.press(getByText('ウェーブ'));
    fireEvent.press(getByText('強')); // intensity strong
    fireEvent.press(getByText('呼吸ON')); // toggle off
    fireEvent.press(getByText('5-5-5'));
    fireEvent.press(getByText('保存'));

    await waitFor(() =>
      expect(repo.save).toHaveBeenCalledWith({
        bpm: 61,
        durationSec: 210,
        pattern: 'wave',
        intensity: 'strong',
        useBreath: false,
        breathPreset: '5-5-5',
      })
    );
  });

  it('プレビューでパターンに応じた複数振動が再生される', async () => {
    const repo = mockRepo();
    const { getByText } = render(<SettingsScreen repository={repo} />);

    await waitFor(() => expect(repo.get).toHaveBeenCalled());

    fireEvent.press(getByText('ウェーブ'));
    fireEvent.press(getByText('プレビュー'));

    const { impactAsync } = require('expo-haptics');
    await waitFor(() => expect(impactAsync).toHaveBeenCalledTimes(4));
  });
});
