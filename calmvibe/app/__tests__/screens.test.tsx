import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SessionScreen from '../session';
import LogsScreen from '../logs';


describe('Base screens', () => {
  it('renders Session screen', async () => {
    const { getAllByText } = render(<SessionScreen />);
    await waitFor(() => expect(getAllByText(/セッション/i).length).toBeGreaterThan(0));
  });

  it('renders Logs screen', async () => {
    const { getByText } = render(<LogsScreen />);
    await waitFor(() => expect(getByText(/履歴/i)).toBeTruthy());
  });
});
