import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react-native';
import SessionScreen from '../session';
import { SettingsRepository, SettingsValues, defaultSettings } from '../../src/settings/types';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Heavy: 'Heavy', Medium: 'Medium' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

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
    const { getAllByText, findByText, unmount } = render(<SessionScreen settingsRepo={repo} />);

    await findByText('BPM: 60');

    fireEvent.press(getAllByText('+BPM')[0]);
    fireEvent.press(getAllByText('保存')[0]);

    // 再マウントして保存値が読み込まれることを確認
    unmount();
    const { findByText: findByText2 } = render(<SessionScreen settingsRepo={repo} />);
    await findByText2('BPM: 61');
  });
});

describe('SessionScreen breath settings', () => {
  it('デフォルトの呼吸プリセットを表示する', async () => {
    const repo = createRepo();
    const { findByText } = render(<SessionScreen settingsRepo={repo} />);

    await findByText('呼吸プリセット: 吸4-止6-吐4 (5回)');
  });

  it('プリセットボタンで呼吸パターンが更新され保存できる', async () => {
    const repo = createRepo();
    const { getByText, getAllByText, findByText } = render(<SessionScreen settingsRepo={repo} />);

    await findByText('呼吸設定（独立保存）');

    fireEvent.press(getByText('4-4 (5回)'));
    await findByText('呼吸プリセット: 吸4-吐4 (5回)');

    fireEvent.press(getByText('吸+'));
    fireEvent.press(getAllByText('保存')[1]);

    // 再描画しても変更が保持されること
    const { findByText: findByText2 } = render(<SessionScreen settingsRepo={repo} />);
    await findByText2('呼吸プリセット: 吸5-吐4 (5回)');
  });

  it('呼吸カードから強度を変更して保存すると次回も反映される', async () => {
    const repo = createRepo();
    const { getAllByText, findByText, unmount } = render(<SessionScreen settingsRepo={repo} />);

    await findByText('呼吸設定（独立保存）');
    fireEvent.press(getAllByText('強')[1]);
    fireEvent.press(getAllByText('保存')[1]);

    unmount();
    const { findByText: findByText2 } = render(<SessionScreen settingsRepo={repo} />);
    await findByText2('強度: 強');
  });
});

describe('SessionScreen guide start/stop (no preview)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('振動開始でビジュアルガイドが表示され停止で消える', async () => {
    const repo = createRepo();
    const { getByText, queryByTestId, findByText } = render(<SessionScreen settingsRepo={repo} />);

    await findByText('セッション開始');
    expect(queryByTestId('visual-guide')).toBeNull();

    fireEvent.press(getByText('開始（振動）'));
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    expect(queryByTestId('visual-guide')?.props.accessibilityLabel).toBe('PULSE');

    fireEvent.press(getByText('停止'));
    expect(queryByTestId('visual-guide')).toBeNull();
  });

  it('呼吸開始で吸→止→吐の順にフェーズが進む', async () => {
    const repo = createRepo();
    const { getByText, queryByTestId, findByText } = render(<SessionScreen settingsRepo={repo} />);

    await findByText('セッション開始');

    fireEvent.press(getByText('開始（呼吸）'));
    await act(async () => jest.advanceTimersByTime(10));
    expect(queryByTestId('visual-guide')?.props.accessibilityLabel).toBe('INHALE');

    await act(async () => jest.advanceTimersByTime(400));
    expect(queryByTestId('visual-guide')?.props.accessibilityLabel).toBe('HOLD');

    await act(async () => jest.advanceTimersByTime(400));
    expect(queryByTestId('visual-guide')?.props.accessibilityLabel).toBe('EXHALE');

    fireEvent.press(getByText('停止'));
    expect(queryByTestId('visual-guide')).toBeNull();
  });
});
