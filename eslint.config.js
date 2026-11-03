const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");
const ts = require("@typescript-eslint/eslint-plugin");
const prettier = require("eslint-config-prettier/flat");
const jest = require("eslint-plugin-jest");
const noUnsanitized = require("eslint-plugin-no-unsanitized");

module.exports = defineConfig([
    {
        ignores: ["dist/**", "config/**", "eslint.config.js"],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        extends: [
            js.configs.recommended,
            ts.configs["flat/recommended-type-checked"],
            prettier,
            noUnsanitized.configs.recommended,
        ],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: ["./config/tsconfig.eslint.json"],
            },
        },
        rules: {
            // ESLint 9 removed this rule from its recommended preset.
            "no-inner-declarations": [
                "error",
                "functions",
                { blockScopedFunctions: "disallow" },
            ],
            "no-console": "error",
            "no-alert": "error",
            "no-process-env": "error",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/only-throw-error": "off",
            "@typescript-eslint/prefer-promise-reject-errors": "off",
        },
    },
    {
        files: ["**/!(*.e2e).test.ts"],
        extends: [jest.configs["flat/recommended"], jest.configs["flat/style"]],
        rules: {
            "jest/no-disabled-tests": "off",
            "jest/consistent-test-it": ["error", { fn: "it" }],
        },
    },
    {
        files: ["**/*.e2e.test.ts"],
        extends: [jest.configs["flat/recommended"]],
        rules: {
            "jest/no-standalone-expect": "off",
        },
    },
]);
