const baseConfig = require("./jest.config.js");

module.exports = {
  ...baseConfig,
  collectCoverageFrom: [],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};
