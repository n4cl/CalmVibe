import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from '../app/_layout';

const mockUseDatabaseCompatibility = jest.fn();

jest.mock('../src/bootstrap/useDatabaseCompatibility', () => ({
  useDatabaseCompatibility: () => mockUseDatabaseCompatibility(),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Tabs = ({ children }: { children?: React.ReactNode }) => (
    <View testID="tabs">{children}</View>
  );
  Tabs.Screen = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return { Tabs };
});

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('RootLayout database compatibility bootstrap', () => {
  beforeEach(() => {
    mockUseDatabaseCompatibility.mockReset();
  });

  test('互換性チェックが完了している場合のみタブを描画する', () => {
    mockUseDatabaseCompatibility.mockReturnValue({ ready: true });
    const { queryByTestId } = render(<RootLayout />);
    expect(queryByTestId('tabs')).toBeTruthy();
  });

  test('互換性チェックが未完了の場合はタブを描画しない', () => {
    mockUseDatabaseCompatibility.mockReturnValue({ ready: false });
    const { queryByTestId } = render(<RootLayout />);
    expect(queryByTestId('tabs')).toBeNull();
  });
});
