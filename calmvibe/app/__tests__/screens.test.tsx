import React from 'react';
import { render } from '@testing-library/react-native';
import SettingsScreen from '../settings';
import SessionScreen from '../session';
import LogsScreen from '../logs';


describe('Base screens', () => {
  it('renders Settings screen', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(/設定/i)).toBeTruthy();
  });

  it('renders Session screen', () => {
    const { getAllByText } = render(<SessionScreen />);
    expect(getAllByText(/セッション/i).length).toBeGreaterThan(0);
  });

  it('renders Logs screen', () => {
    const { getByText } = render(<LogsScreen />);
    expect(getByText(/履歴/i)).toBeTruthy();
  });
});
