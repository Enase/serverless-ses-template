import type { Config } from "jest"

const config: Config = {
  moduleDirectories: ["node_modules", "node_modules/.pnpm", "src"],
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  transform: {
    tsconfig: "<rootDir>/tsconfig.test.json",
  },
  extensionsToTreatAsEsm: [".ts"],
  projects: [
    {
      displayName: "serverless-ses-template",
      testRegex: "(/tests/.*|(\\.|/)test)\\.ts$",
      testPathIgnorePatterns: ["./dist", ".eslintrc.cjs"],
    },
  ],
  coverageReporters: ["text"],
  coverageThreshold: {
    global: {
      lines: 100,
    },
  },
  collectCoverageFrom: ["!**/dist/**", "src/**", "!src/types.ts"],
}

export default config
