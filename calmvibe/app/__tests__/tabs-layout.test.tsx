import React from 'react';
import renderer, { act } from 'react-test-renderer';
import TabLayout from '../(tabs)/_layout';

// expo-router Tabs を軽量モック
jest.mock('expo-router', () => {
  const React = require('react');
  const View = ({ children, ...props }: any) => <>{children}</>;
  const Tabs: any = ({ children, ...props }) => <View {...props}>{children}</View>;
  Tabs.Screen = ({ name, options }: any) => <View screenName={name} options={options} />;
  return { Tabs };
});

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('TabLayout', () => {
  it('Session と Logs の2タブのみを定義する', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TabLayout />);
    });
    const root = (tree as renderer.ReactTestRenderer).root;
    const screens = root.findAll((node) => node.props?.screenName);
    const names = screens.map((n) => n.props.screenName);
    expect(names).toEqual(['session', 'logs']);
  });
});
