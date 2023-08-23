import type { Config } from "jest"

const config: Config = {
  verbose: true,
  preset: "ts-jest",
  clearMocks: true,
  moduleFileExtensions: ["js", "ts"],
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  collectCoverage: true,
  projects: [
    {
      displayName: "serverless-ses-template",
      testRegex: "tests",
      testPathIgnorePatterns: ["./dist", ".eslintrc.cjs"],
    },
  ],
  moduleNameMapper: {
    chalk: "chalk/source/index.js",
    "#ansi-styles": "chalk/source/vendor/ansi-styles/index.js",
    "#supports-color": "chalk/source/vendor/supports-color/index.js",
  },
  coverageReporters: ["text"],
  coverageThreshold: {
    global: {
      lines: 100,
    },
  },
  collectCoverageFrom: ["!**/dist/**", "src/**"],
}

export default config
