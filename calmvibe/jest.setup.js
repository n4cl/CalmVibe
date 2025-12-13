import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Workaround for Expo import meta registry in Jest environment
if (!globalThis.__ExpoImportMetaRegistry) {
  globalThis.__ExpoImportMetaRegistry = {};
}

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}
