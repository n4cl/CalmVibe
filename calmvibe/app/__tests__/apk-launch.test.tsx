import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import RootLayout from '../_layout';

const screens: string[] = [];

jest.mock('../../src/bootstrap/useDatabaseCompatibility', () => ({
  useDatabaseCompatibility: () => ({ ready: true }),
}));

jest.mock('expo-router', () => {
  const Tabs = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  const TabsScreen = ({ name }: { name: string }) => {
    screens.push(name);
    return null;
  };
  TabsScreen.displayName = 'TabsScreen';
  Tabs.displayName = 'Tabs';
  Tabs.Screen = TabsScreen;
  return { Tabs };
});

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const GestureHandlerRootView = ({ children, ...props }: { children?: React.ReactNode }) => (
    <View {...props}>{children}</View>
  );
  GestureHandlerRootView.displayName = 'GestureHandlerRootView';
  return { GestureHandlerRootView };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('APK起動時のタブ定義', () => {
  beforeEach(() => {
    screens.length = 0;
  });

  test('セッションと履歴のタブが定義されている', () => {
    render(<RootLayout />);
    expect(screens).toEqual(expect.arrayContaining(['session', 'logs']));
  });
});
