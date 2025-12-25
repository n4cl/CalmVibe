import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { useDatabaseCompatibility } from '../useDatabaseCompatibility';

const mockEnsureDatabaseCompatibility = jest.fn();

jest.mock('../databaseCompatibility', () => ({
  ensureDatabaseCompatibility: (...args: unknown[]) => mockEnsureDatabaseCompatibility(...args),
}));

const StatusView = () => {
  const { ready } = useDatabaseCompatibility();
  return <Text testID="status">{ready ? 'ready' : 'pending'}</Text>;
};

describe('useDatabaseCompatibility', () => {
  beforeEach(() => {
    mockEnsureDatabaseCompatibility.mockReset();
  });

  test('互換性チェックが失敗しても起動準備完了になる', async () => {
    mockEnsureDatabaseCompatibility.mockRejectedValueOnce(new Error('mismatch'));
    const { getByTestId } = render(<StatusView />);
    await waitFor(() => {
      expect(getByTestId('status').props.children).toBe('ready');
    });
  });

  test('互換性チェックが完了した場合に起動準備完了になる', async () => {
    mockEnsureDatabaseCompatibility.mockResolvedValueOnce(undefined);
    const { getByTestId } = render(<StatusView />);
    await waitFor(() => {
      expect(getByTestId('status').props.children).toBe('ready');
    });
  });
});
