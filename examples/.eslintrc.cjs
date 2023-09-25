const path = require("path");
module.exports = {
  extends: [path.join(__dirname, '../.eslintrc.cjs')],
  rules: {
    "@typescript-eslint/no-var-requires": "off",
    "require-extensions/require-index": "off",
    "require-extensions/require-extensions": "off",
  }
}
