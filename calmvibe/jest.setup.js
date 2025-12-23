import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';
import { configure } from '@testing-library/react-native';

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
