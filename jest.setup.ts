const ONLINE_STATE = {
  type: "wifi",
  isConnected: true,
  isInternetReachable: true,
  details: null,
};

jest.mock("expo-sqlite", () => {
  const db = {
    execSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => undefined),
    runSync: jest.fn(() => ({ changes: 0, lastInsertRowId: 0 })),
    prepareSync: jest.fn(() => ({
      executeSync: jest.fn(() => ({
        getAllSync: () => [],
        getFirstSync: () => undefined,
      })),
      finalizeSync: jest.fn(),
    })),
    closeSync: jest.fn(),
  };

  return {
    __esModule: true,
    openDatabaseSync: jest.fn(() => db),
  };
});

jest.mock("expo-image-manipulator", () => ({
  __esModule: true,
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: jest.fn(async (uri: string) => ({ uri })),
}));

jest.mock("expo-file-system", () => ({
  __esModule: true,
  documentDirectory: "file:///mock-documents/",
  cacheDirectory: "file:///mock-cache/",
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async () => undefined),
  downloadAsync: jest.fn(async () => ({ uri: "file:///mock-download.jpg" })),
}));

jest.mock("@react-native-firebase/app", () => ({
  __esModule: true,
  getApp: jest.fn(() => ({ name: "mock-app" })),
}));

jest.mock("@react-native-firebase/auth", () => ({
  __esModule: true,
  getAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
    manifest: { extra: {} },
  },
}));

jest.mock("@sentry/react-native", () => ({
  __esModule: true,
  init: jest.fn(),
  wrap: jest.fn((Component: unknown) => Component),
  setUser: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@react-native-community/netinfo", () => {
  const fetch = jest.fn(async () => ONLINE_STATE);
  const addEventListener = jest.fn(() => jest.fn());
  const useNetInfo = jest.fn(() => ONLINE_STATE);

  return {
    __esModule: true,
    default: {
      fetch,
      addEventListener,
      configure: jest.fn(),
      useNetInfo,
    },
    fetch,
    addEventListener,
    configure: jest.fn(),
    useNetInfo,
    NetInfoStateType: {
      none: "none",
      unknown: "unknown",
      cellular: "cellular",
      wifi: "wifi",
      bluetooth: "bluetooth",
      ethernet: "ethernet",
      wimax: "wimax",
      vpn: "vpn",
      other: "other",
    },
  };
});
