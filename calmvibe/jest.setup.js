import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';
import { configure } from '@testing-library/react-native';

configure({
  asyncUtilTimeout: 3000,
  defaultIncludeHiddenElements: true,
  concurrentRoot: false,
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Jest環境でExpoのimport meta registryがない問題への暫定対応
if (!globalThis.__ExpoImportMetaRegistry) {
  globalThis.__ExpoImportMetaRegistry = {};
}

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}
