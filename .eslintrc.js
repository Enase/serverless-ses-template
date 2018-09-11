// @see https://eslint.org/docs/user-guide/configuring#configuring-rules
const OFF = 0;
const WARN = 1;
const ERROR = 2;

module.exports = {
    "root": true,
    "extends": "airbnb",
    "env": {
        "es6": true,
        "node": true,
        "mocha": true
    },
    "plugins": [
        "filenames"
    ],
    "rules": {
        "filenames/match-exported": [ ERROR, "kebab" ],
        "max-len": ["error", 120],
        "indent": ["error", 4, {"SwitchCase": 1}],
        "linebreak-style": "off",
        "no-console": "off",
        "prefer-rest-params": "error",
        "import/no-extraneous-dependencies": ["aws-sdk"],
        "no-cond-assign" : [ERROR, "except-parens"],
        "no-unused-expressions" : "off",
        "no-unused-vars" : ["error", { "argsIgnorePattern": "^_" }],
        "no-useless-escape" : "off",
        "no-underscore-dangle" : "off",
        "function-paren-newline" : "off",
        "class-methods-use-this" : "off",
        // JSDoc Requirements
        "require-jsdoc": [ WARN, {
            "require": {
                "FunctionDeclaration": true,
                "MethodDefinition": true,
                "ClassDeclaration": false
            }
        }],
        "valid-jsdoc": [ ERROR, {
            "requireReturn": true,
            "requireReturnDescription": false,
            "requireParamDescription": false,
            "requireReturnType": false,
            "prefer": {
                // go to PhpStorm config path e.g. {UserFolder}\.PhpStorm2017.3\config\options\options.xml
                // find and replace
                // <application>
                // <component name="PropertiesComponent">
                // <property name="javascript.return.tag" value="returns" />
                "return": "returns"
            }
        }]
    },
};
