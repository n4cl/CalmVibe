module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-.*|@expo-.*|@unimodules/.*|unimodules-.*|sentry-expo|native-base|react-navigation|@react-navigation/.*)/)'
  ]
};
