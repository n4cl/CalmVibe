import React from 'react';
import { act, render, waitFor, fireEvent } from '@testing-library/react-native';
import LogsScreen from '../logs';
import { SessionRecord, SessionRepository } from '../../src/session/types';

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useIsFocused: () => mockIsFocused,
  };
});

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
  async update() {
    throw new Error('not used');
  },
  async list() {
    return data;
  },
  async listPage() {
    return { records: data, nextCursor: null, hasNext: false };
  },
  async get() {
    return null;
  },
});

describe('LogsScreen', () => {
  beforeEach(() => {
    mockIsFocused = true;
  });

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

  it('履歴詳細から編集モーダルを開き、既存値を初期表示する', async () => {
    const update = jest.fn(async () => undefined);
    const repo = {
      ...createRepo(records),
      update,
    };
    const { getByLabelText, getByText, findByTestId } = render(<LogsScreen repo={repo} />);

    await waitFor(() => {
      expect(getByText('履歴')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('log-item-2'));
    await findByTestId('log-detail-modal');

    fireEvent.press(getByLabelText('log-edit'));
    const modal = await findByTestId('record-modal');
    expect(modal).toBeTruthy();
    const preHrInput = getByLabelText('preHr-input');
    expect(preHrInput.props.value).toBe('85');
    await act(async () => {
      fireEvent.press(getByLabelText('record-save'));
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '2',
        guideType: 'VIBRATION',
        preHr: 85,
        postHr: 70,
        improvement: 3,
        bpm: 60,
      })
    );
  });

  it('履歴が無い場合に空メッセージを表示する', async () => {
    const repo = createRepo([]);
    const { getByText } = render(<LogsScreen repo={repo} />);
    await waitFor(() => {
      expect(getByText('履歴がありません')).toBeTruthy();
    });
  });

  it('履歴が空でもプル更新を実行できる', async () => {
    const listPage = jest.fn(async () => ({
      records: [],
      nextCursor: null,
      hasNext: false,
    }));
    const repo: SessionRepository = {
      ...createRepo([]),
      listPage,
    };
    const { getByTestId, getByText } = render(<LogsScreen repo={repo} />);

    await waitFor(() => {
      expect(getByText('履歴がありません')).toBeTruthy();
    });

    const list = getByTestId('logs-list');
    await act(async () => {
      await list.props.onRefresh?.();
    });

    expect(listPage).toHaveBeenCalledTimes(2);
  });

  it('末尾到達で追加ロードし、履歴を追記する', async () => {
    const pagedRepo: SessionRepository = {
      async save() {
        throw new Error('not used');
      },
      async update() {
        throw new Error('not used');
      },
      async list() {
        return [];
      },
      async get() {
        return null;
      },
      listPage: jest.fn(async ({ cursor }) => {
        if (!cursor) {
          return {
            records: records.slice(0, 2),
            nextCursor: { recordedAt: records[1].recordedAt, id: records[1].id },
            hasNext: true,
          };
        }
        return {
          records: records.slice(2),
          nextCursor: null,
          hasNext: false,
        };
      }),
    };

    const { getByTestId, getByText } = render(<LogsScreen repo={pagedRepo} />);

    await waitFor(() => {
      expect(getByText('履歴')).toBeTruthy();
    });

    const list = getByTestId('logs-list');
    await act(async () => {
      list.props.onEndReached?.();
    });

    await waitFor(() => {
      expect(getByText(/2025\/12\/16/)).toBeTruthy();
    });
    expect(pagedRepo.listPage).toHaveBeenCalledTimes(2);
  });

  it('初回フォーカス時のみ履歴を取得し、再表示で再取得しない', async () => {
    const listPage = jest.fn(async () => ({
      records,
      nextCursor: null,
      hasNext: false,
    }));
    const repo: SessionRepository = {
      ...createRepo(records),
      listPage,
    };

    const { rerender } = render(<LogsScreen repo={repo} />);

    await waitFor(() => {
      expect(listPage).toHaveBeenCalledTimes(1);
    });

    mockIsFocused = false;
    rerender(<LogsScreen repo={repo} />);

    mockIsFocused = true;
    rerender(<LogsScreen repo={repo} />);

    await waitFor(() => {
      expect(listPage).toHaveBeenCalledTimes(1);
    });
  });

  it('プル更新で最新1ページを取得し、既存一覧に先頭追加する', async () => {
    const newest = records[0];
    const middle = records[1];
    const oldest = {
      ...records[1],
      id: '0',
      recordedAt: '2025-12-15T10:00:00.000Z',
    };
    const listPage = jest.fn(async ({ cursor }) => {
      if (!cursor) {
        if (listPage.mock.calls.length === 1) {
          return {
            records: [middle, oldest],
            nextCursor: { recordedAt: oldest.recordedAt, id: oldest.id },
            hasNext: true,
          };
        }
        return {
          records: [newest, middle],
          nextCursor: { recordedAt: middle.recordedAt, id: middle.id },
          hasNext: true,
        };
      }
      return {
        records: [],
        nextCursor: null,
        hasNext: false,
      };
    });
    const repo: SessionRepository = {
      ...createRepo([middle, oldest]),
      listPage,
    };

    const { getByTestId, getByText, queryAllByLabelText } = render(<LogsScreen repo={repo} />);

    await waitFor(() => {
      expect(getByText(/2025\/12\/16/)).toBeTruthy();
    });

    const list = getByTestId('logs-list');
    await act(async () => {
      await list.props.onRefresh?.();
    });

    await waitFor(() => {
      expect(getByText(/2025\/12\/17/)).toBeTruthy();
      expect(getByText(/2025\/12\/15/)).toBeTruthy();
    });
    expect(queryAllByLabelText('log-item-1').length).toBe(1);

    await act(async () => {
      list.props.onEndReached?.();
    });

    await waitFor(() => {
      expect(listPage).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { recordedAt: oldest.recordedAt, id: oldest.id },
        })
      );
    });
  });
});
