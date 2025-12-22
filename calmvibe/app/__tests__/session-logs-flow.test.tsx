import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import SessionScreen from '../session';
import LogsScreen from '../logs';
import { SessionUseCase } from '../../src/session/useCase';
import { SimpleGuidanceEngine } from '../../src/guidance/guidanceEngine';
import { HapticsAdapter } from '../../src/guidance/types';
import { SettingsRepository, SettingsValues, defaultSettings } from '../../src/settings/types';
import { SqliteSessionRepository } from '../../src/session/sqliteRepository.web';

const createSettingsRepo = () => {
  let store: SettingsValues = defaultSettings;
  const save = jest.fn(async (values: SettingsValues) => {
    store = values;
  });
  const repo: SettingsRepository = {
    get: jest.fn(async () => store),
    save,
  };
  return { repo, save, getStore: () => store };
};

describe('Session → Logs integration (web haptics fallback)', () => {
  it('設定編集→開始/停止→記録→履歴表示まで通しで動作する', async () => {
    const { repo: settingsRepo, save } = createSettingsRepo();
    const sessionRepo = new SqliteSessionRepository();
    const adapter: HapticsAdapter = {
      play: jest.fn().mockResolvedValue({ ok: false, error: 'disabled' }),
      stop: jest.fn().mockResolvedValue({ ok: true }),
    };
    const engine = new SimpleGuidanceEngine(adapter);
    const useCase = new SessionUseCase(engine, settingsRepo, sessionRepo);

    const { getByText, getByLabelText, findByText, findByTestId, queryByTestId } = render(
      <SessionScreen settingsRepo={settingsRepo} useCase={useCase} />
    );

    await findByText('セッション開始');

    fireEvent.press(getByText('+BPM'));
    await act(async () => {
      fireEvent.press(getByText('保存'));
    });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ bpm: 61 }));

    await act(async () => {
      fireEvent.press(getByText('開始'));
    });
    await findByText('状態: 心拍ガイド実行中');
    await findByText('振動が利用できないため、視覚ガイドのみで継続します。');

    await act(async () => {
      fireEvent.press(getByText('停止'));
    });
    await findByText('状態: 停止中');

    fireEvent.press(getByText('呼吸ガイド'));
    await act(async () => {
      fireEvent.press(getByText('開始'));
    });
    await findByText('状態: 呼吸ガイド実行中');
    await act(async () => {
      fireEvent.press(getByText('停止'));
    });

    fireEvent.press(getByText('記録する'));
    await findByTestId('record-modal');
    fireEvent.press(getByLabelText('guideType-vibration'));
    fireEvent.changeText(getByLabelText('preHr-input'), '80');
    fireEvent.changeText(getByLabelText('postHr-input'), '70');
    fireEvent.press(getByLabelText('改善3'));

    await act(async () => {
      fireEvent.press(getByLabelText('record-save'));
    });

    await waitFor(() => {
      expect(queryByTestId('record-modal')).toBeNull();
    });

    const { findByText: findByTextLogs } = render(<LogsScreen repo={sessionRepo} />);
    await findByTextLogs('履歴');
    await findByTextLogs(/開始心拍: 80/);
    await findByTextLogs(/終了心拍: 70/);
    await findByTextLogs(/BPM: 61/);
  });
});
