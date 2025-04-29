import type { Config } from "jest"

const config: Config = {
  verbose: true,
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    tsconfig: "<rootDir>/tests/tsconfig.json",
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  projects: [
    {
      clearMocks: true,
      displayName: "serverless-ses-template",
      testRegex: "(/tests/.*|(\\.|/)test)\\.ts$",
      testPathIgnorePatterns: ["./dist", ".eslintrc.cjs"],
      moduleDirectories: ["node_modules", "node_modules/.pnpm", "src"],
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
    },
  ],
  coverageReporters: ["text"],
  coverageThreshold: {
    global: {
      lines: 100,
    },
  },
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["!**/dist/**", "src/**", "!src/types.ts"],
}

export default config
