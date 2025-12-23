import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';
import { configure } from '@testing-library/react-native';
jest.mock('./app/session/_visualGuide', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VisualGuide: ({ testID, accessibilityLabel }) =>
      React.createElement(View, { testID, accessibilityLabel }),
  };
});

configure({
  asyncUtilTimeout: 3000,
  defaultIncludeHiddenElements: true,
  concurrentRoot: false,
});

// Jest環境でExpoのimport meta registryがない問題への暫定対応
if (!globalThis.__ExpoImportMetaRegistry) {
  globalThis.__ExpoImportMetaRegistry = {};
}

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}
