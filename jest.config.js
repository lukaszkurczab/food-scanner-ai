module.exports = {
  preset: "react-native",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.ts?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@assets/(.*)$": "<rootDir>/assets/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@contexts/(.*)$": "<rootDir>/src/context/$1",
    "^@feature/(.*)$": "<rootDir>/src/feature/$1",
    "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@navigation/(.*)$": "<rootDir>/src/navigation/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@theme/(.*)$": "<rootDir>/src/theme/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },
  collectCoverageFrom: ["src/hooks/useChatHistory.ts", "src/hooks/useMeals.ts"],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  clearMocks: true,
};
