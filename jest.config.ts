import type { Config } from "jest"

const config: Config = {
  verbose: true,
  preset: "ts-jest",
  transform: {
    tsconfig: "<rootDir>/tsconfig.test.json",
  },
  projects: [
    {
      clearMocks: true,
      displayName: "serverless-ses-template",
      testRegex: "(/tests/.*|(\\.|/)test)\\.ts$",
      testPathIgnorePatterns: ["./dist", ".eslintrc.cjs"],
      moduleDirectories: ["node_modules", "node_modules/.pnpm", "src"],
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
