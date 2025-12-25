import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from '../_layout';

const mockScreens: string[] = [];

jest.mock('../../src/bootstrap/useDatabaseCompatibility', () => ({
  useDatabaseCompatibility: () => ({ ready: true }),
}));

jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native');
  const Tabs = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  const TabsScreen = ({ name }: { name: string }) => {
    mockScreens.push(name);
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
  const { View } = jest.requireActual('react-native');
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
    mockScreens.length = 0;
  });

  test('セッションと履歴のタブが定義されている', () => {
    render(<RootLayout />);
    expect(mockScreens).toEqual(expect.arrayContaining(['session', 'logs']));
  });
});
