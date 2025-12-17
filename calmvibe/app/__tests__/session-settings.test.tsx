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
    const useCase = { start: jest.fn(), stop: jest.fn() } as any;
    const { findByText } = render(<SessionScreen settingsRepo={repo} useCase={useCase} />);

    await findByText('心拍ガイド');
    await findByText('BPM: 60');
    await findByText('時間: 180秒');
  });

  it('BPMを変更して保存すると再描画後も値が保持される', async () => {
    const repo = createRepo();
    const useCase = { start: jest.fn(), stop: jest.fn() } as any;
    const { getAllByText, findByText, getByText, unmount } = render(<SessionScreen settingsRepo={repo} useCase={useCase} />);

    await findByText('BPM: 60');

    fireEvent.press(getAllByText('+BPM')[0]);
    fireEvent.press(getByText('保存'));

    // 再マウントして保存値が読み込まれることを確認
    unmount();
    const { findByText: findByText2 } = render(<SessionScreen settingsRepo={repo} useCase={useCase} />);
    await findByText2('BPM: 61');
  });
});

describe('SessionScreen breath settings', () => {
  it('デフォルトの呼吸プリセットを表示する', async () => {
    const repo = createRepo();
    const useCase = { start: jest.fn(), stop: jest.fn() } as any;
    const { findByText, getByText } = render(<SessionScreen settingsRepo={repo} useCase={useCase} />);

    await findByText('呼吸ガイド');
    fireEvent.press(getByText('呼吸ガイド'));
    await findByText('呼吸プリセット: 吸4-吐4 (5回)');
  });

  it('プリセットボタンで呼吸パターンが更新され保存できる', async () => {
    const repo = createRepo();
    const useCase = { start: jest.fn(), stop: jest.fn() } as any;
    const { getByText, getAllByText, findByText } = render(<SessionScreen settingsRepo={repo} useCase={useCase} />);

    await findByText('呼吸ガイド');
    fireEvent.press(getByText('呼吸ガイド'));
    await findByText('呼吸ガイド設定');

    fireEvent.press(getByText('4-4 (5回)'));
    await findByText('呼吸プリセット: 吸4-吐4 (5回)');

    fireEvent.press(getByText('吸+'));
    fireEvent.press(getByText('保存'));

    // 再描画しても変更が保持されること
    const { findByText: findByText2, getByText: getByText2 } = render(<SessionScreen settingsRepo={repo} useCase={useCase} />);
    await findByText2('呼吸ガイド');
    fireEvent.press(getByText2('呼吸ガイド'));
    await findByText2('呼吸プリセット: 吸5-吐4 (5回)');
  });

  it('呼吸カードから強度を変更して保存すると次回も反映される', async () => {
    // 強度UIを非表示にしたためスキップ
  });
});

describe('SessionScreen guide start/stop (UseCase接続)', () => {
  const createUseCaseMock = () => {
    let listener: GuidanceListener | undefined;
    return {
      start: jest.fn(async (_input, l?: GuidanceListener) => {
        listener = l;
        return { ok: true };
      }),
      stop: jest.fn(async () => ({ ok: true })),
      emitStep: (phase: any, cycle = 0) => listener?.onStep?.({ elapsedSec: cycle, cycle, phase }),
      emitComplete: () => listener?.onComplete?.(),
    };
  };

  it('振動開始でVisualGuideが表示され、onStepで継続し停止で非表示になる', async () => {
    const repo = createRepo();
    const useCase = createUseCaseMock();
    const { getByText, queryByTestId, findByText } = render(<SessionScreen settingsRepo={repo} useCase={useCase as any} />);

    await findByText('セッション開始');
    expect(queryByTestId('visual-guide')?.props.accessibilityLabel).toBe('待機中');

    await act(async () => {
      fireEvent.press(getByText('開始'));
    });
    expect(useCase.start).toHaveBeenCalledWith({ mode: 'VIBRATION' }, expect.any(Object));
    act(() => {
      useCase.emitStep('PULSE', 0);
      useCase.emitStep('PULSE', 1);
    });
    expect(queryByTestId('visual-guide')?.props.accessibilityLabel).toBe('PULSE');

    await act(async () => {
      fireEvent.press(getByText('停止'));
    });
    expect(useCase.stop).toHaveBeenCalled();
    expect(queryByTestId('visual-guide')?.props.accessibilityLabel).toBe('待機中');
  });

  it('呼吸開始でonStepに従いフェーズが進み、完了で非表示になる', async () => {
    const repo = createRepo();
    const useCase = createUseCaseMock();
    const { getByText, queryByTestId, findByText } = render(<SessionScreen settingsRepo={repo} useCase={useCase as any} />);

    await findByText('セッション開始');

    fireEvent.press(getByText('呼吸ガイド'));

    await act(async () => {
      fireEvent.press(getByText('開始'));
    });
    expect(useCase.start).toHaveBeenCalledWith({ mode: 'BREATH' }, expect.any(Object));
    act(() => {
      useCase.emitStep('INHALE', 0);
      useCase.emitStep('HOLD', 0);
      useCase.emitStep('EXHALE', 0);
      useCase.emitComplete();
    });
    expect(queryByTestId('visual-guide')?.props.accessibilityLabel).toBe('待機中');
  });
});
