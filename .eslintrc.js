// @see https://eslint.org/docs/user-guide/configuring#configuring-rules
const OFF = 0;
const WARN = 1;
const ERROR = 2;

module.exports = {
  root: true,
  extends: ['airbnb'],
  env: {
    es6: true,
    node: true,
    mocha: true,
  },
  plugins: [
    'filenames',
  ],
  rules: {
    'arrow-body-style': [ERROR, 'as-needed'],
    'class-methods-use-this': OFF,
    'comma-dangle': [ERROR, 'always-multiline'],
    'import/imports-first': ERROR,
    'import/newline-after-import': ERROR,
    'import/no-dynamic-require': OFF,
    'import/no-extraneous-dependencies': [ERROR, { devDependencies: true }],
    'import/extensions': [ERROR, 'never'],
    'import/no-named-as-default': ERROR,
    'import/no-unresolved': ERROR,
    'import/no-webpack-loader-syntax': OFF,
    'import/prefer-default-export': OFF,
    'import/no-cycle': ['error', { maxDepth: 9999 }],
    'global-require': OFF,
    indent: [ERROR, 2, { SwitchCase: 1 }],
    'max-len': [ERROR, 120],
    'newline-per-chained-call': ERROR,
    'no-confusing-arrow': ERROR,
    'no-console': ERROR,
    'no-unused-vars': [ERROR, { argsIgnorePattern: '^_' }],
    'no-use-before-define': ERROR,
    'prefer-template': ERROR,
    'require-yield': ERROR,
    'filenames/match-exported': [ERROR, 'kebab'],
    'function-call-argument-newline': [ERROR, 'consistent'],
    'linebreak-style': OFF,
    'prefer-rest-params': ERROR,
    'no-cond-assign': [ERROR, 'except-parens'],
    'no-unused-expressions': [ERROR, { allowShortCircuit: true, allowTernary: true }],
    'no-useless-escape': OFF,
    'no-underscore-dangle': OFF,
    'function-paren-newline': OFF,
    'sort-imports': [ERROR, {
      ignoreCase: false,
      ignoreDeclarationSort: true,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
    }],
    eqeqeq: [ERROR, 'always', { null: 'ignore' }],
    // JSDoc Requirements
    'require-jsdoc': [WARN, {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: false,
      },
    }],
    'valid-jsdoc': [ERROR, {
      requireReturn: true,
      requireReturnDescription: false,
      requireParamDescription: false,
      requireParamType: true,
      requireReturnType: false,
      preferType: {
        Boolean: 'boolean', Number: 'number', object: 'Object', String: 'string',
      },
      prefer: {
        return: 'returns',
      },
    }],
  },
  settings: {
    'import/core-modules': ['aws-sdk'],
    react: {
      createClass: 'createReactClass', // Regex for Component Factory to use,
      // default to "createReactClass"
      pragma: 'React', // Pragma to use, default to "React"
      // React version, default to the latest React stable release
      version: '999.999.999', // @see https://github.com/yannickcr/eslint-plugin-react/issues/1955
    },
  },
  overrides: [
    {
      files: ['*.test.js'],
      rules: {
        'no-unused-expressions': OFF,
      },
    },
    {
      files: ['src/index.js'],
      rules: {
        'filenames/match-exported': OFF,
      },
    },
  ],
};
