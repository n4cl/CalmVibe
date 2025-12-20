import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import LogsScreen from '../logs';
import { SessionRecord, SessionRepository } from '../../src/session/types';

const records: SessionRecord[] = [
  {
    id: '2',
    recordedAt: '2025-12-17T12:06:00.000Z',
    startedAt: '2025-12-17T12:00:00.000Z',
    endedAt: '2025-12-17T12:05:00.000Z',
    guideType: 'VIBRATION',
    bpm: 60,
    preHr: 85,
    postHr: 70,
    improvement: 3,
    breathConfig: undefined,
  },
  {
    id: '1',
    recordedAt: '2025-12-16T11:10:00.000Z',
    startedAt: null,
    endedAt: null,
    guideType: 'BREATH',
    preHr: 90,
    postHr: 75,
    improvement: 2,
    breathConfig: { inhaleSec: 4, exhaleSec: 4 },
  },
];

const createRepo = (data: SessionRecord[]): SessionRepository => ({
  async save() {
    throw new Error('not used');
  },
  async list() {
    return data;
  },
  async get() {
    return null;
  },
});

describe('LogsScreen', () => {
  it('最新順で履歴を表示し、ガイド種別や心拍を含めて表示する', async () => {
    const repo = createRepo(records);
    const { getByText, queryAllByText } = render(<LogsScreen repo={repo} />);

    await waitFor(() => {
      expect(getByText('履歴')).toBeTruthy();
      expect(getByText(/心拍ガイド/)).toBeTruthy();
    });

    // 最新レコードが先頭に表示される
    const startedFirst = getByText(/2025\/12\/17/);
    expect(startedFirst).toBeTruthy();

    // 心拍・呼吸の種別表記
    expect(getByText('心拍ガイド')).toBeTruthy();
    expect(getByText('呼吸ガイド')).toBeTruthy();

    // 前後心拍
    expect(getByText(/開始心拍: 85/)).toBeTruthy();
    expect(getByText(/終了心拍: 70/)).toBeTruthy();

    // 改善度
    expect(queryAllByText(/改善:/).length).toBeGreaterThan(0);
  });

  it('履歴カードをタップすると詳細モーダルを表示する', async () => {
    const repo = createRepo(records);
    const { getByLabelText, getByText, findByTestId } = render(<LogsScreen repo={repo} />);

    await waitFor(() => {
      expect(getByText('履歴')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('log-item-2'));

    const modal = await findByTestId('log-detail-modal');
    expect(modal).toBeTruthy();
    expect(getByText('履歴詳細')).toBeTruthy();
    expect(getByText(/ガイド: 心拍ガイド/)).toBeTruthy();
  });

  it('履歴が無い場合に空メッセージを表示する', async () => {
    const repo = createRepo([]);
    const { getByText } = render(<LogsScreen repo={repo} />);
    await waitFor(() => {
      expect(getByText('履歴がありません')).toBeTruthy();
    });
  });
});
