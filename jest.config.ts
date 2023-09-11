import type { Config } from "jest"

const config: Config = {
  verbose: true,
  clearMocks: true,
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
  collectCoverage: true,
  transform: {
    tsconfig: "<rootDir>/tsconfig.test.json",
  },
  projects: [
    {
      displayName: "serverless-ses-template",
      testRegex: "tests",
      testPathIgnorePatterns: ["./dist", ".eslintrc.cjs"],
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
