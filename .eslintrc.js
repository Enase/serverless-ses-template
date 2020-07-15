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
        'filenames/match-exported': [ERROR, 'kebab'],
        'function-call-argument-newline': [ERROR, 'consistent'],
        'max-len': ['error', 120],
        indent: ['error', 4, { SwitchCase: 1 }],
        'linebreak-style': OFF,
        'no-console': OFF,
        'prefer-rest-params': 'error',
        'import/no-extraneous-dependencies': [ERROR, { devDependencies: true }],
        'import/extensions': [ERROR, 'never'],
        'no-cond-assign': [ERROR, 'except-parens'],
        'no-unused-expressions': [ERROR, { allowShortCircuit: true, allowTernary: true }],
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-useless-escape': OFF,
        'no-underscore-dangle': OFF,
        'function-paren-newline': OFF,
        'class-methods-use-this': OFF,
        'sort-imports': ['error', {
            ignoreCase: false,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
            memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        }],
        eqeqeq: ['error', 'always', { null: 'ignore' }],
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
                // go to PhpStorm config path e.g. {UserFolder}\.PhpStorm2017.3\config\options\options.xml
                // find and replace
                // <application>
                // <component name="PropertiesComponent">
                // <property name="javascript.return.tag" value="returns" />
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
    ],
};
