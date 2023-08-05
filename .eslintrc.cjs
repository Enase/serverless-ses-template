module.exports = {
  root: true,
  env: {
    commonjs: true,
    es6: true,
    node: true,
    mocha: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "prettier",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  parser: "@typescript-eslint/parser",
  ignorePatterns: ["dist", "node_modules"],
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "lines-between-class-members": ["error", "always", { "exceptAfterSingleLine": true }],
    "no-console": "error",
    "no-nested-ternary": "error",
    "prefer-template": "error",
    "prettier/prettier": [
      "error",
      {
        tabWidth: 2,
        endOfLine: "auto",
        semi: false,
        trailingComma: "all",
      },
    ],
    "id-length": [
      "error",
      { max: 40, properties: "never", exceptions: ["$", "_"] },
    ],
    "@typescript-eslint/triple-slash-reference": [
      "error",
      { path: "always", types: "always", lib: "always" },
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        caughtErrors: "all",
      },
    ],
    "@typescript-eslint/no-explicit-any": ["off"],
    "@typescript-eslint/ban-types": ["off"],
    "sort-imports": [
      "error",
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
        allowSeparatedGroups: false
      },
    ],
  },
}
