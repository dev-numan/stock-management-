// Mock AsyncStorage so stores that persist (and utils that transitively import
// them) can be loaded in the Node test environment.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
