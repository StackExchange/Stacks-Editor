module.exports = {
    root: true,
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.eslint.json"],
    },
    plugins: ["@typescript-eslint", "jest"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "prettier",
        "plugin:no-unsanitized/DOM",
    ],
    rules: {
        "no-console": "error",
        "no-alert": "error",
        "no-process-env": "error",
    },
    overrides: [
        {
            // enable
            files: ["**/*.ts", "**/*.tsx"],
            parser: "@typescript-eslint/parser",
            parserOptions: {
                tsconfigRootDir: __dirname,
            },
        },
        {
            // only enable jest rules in non-e2e test files
            files: ["**/!(*.e2e).test.ts"],
            extends: ["plugin:jest/recommended", "plugin:jest/style"],
            rules: {
                "jest/no-disabled-tests": "off",
                "jest/consistent-test-it": ["error", { fn: "it" }],
            },
        },
        {
            // enable a subset of jest rules in e2e test files, since the syntax is similar-ish
            files: ["**/*.e2e.test.ts"],
            extends: ["plugin:jest/recommended"],
            rules: {
                "jest/no-standalone-expect": "off",
            },
        },
    ],
};
