import type { Config } from "jest"

const config: Config = {
  verbose: true,
  clearMocks: true,
  moduleFileExtensions: ["js", "ts"],
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
  transform: {
    "^.+\\.ts$": "babel-jest",
  },
  collectCoverage: true,
  projects: [
    {
      displayName: "serverless-ses-template",
      testRegex: "tests",
      testPathIgnorePatterns: [
        ".eslintrc.cjs",
        "/tests/payloads",
        "/tests/utils/",
        "/tests/assets",
      ],
    },
  ],
  coverageReporters: ["text"],
  coverageThreshold: {
    global: {
      lines: 100,
    },
  },
  collectCoverageFrom: ["!**/dist/**", "src/**"],
}

export default config
