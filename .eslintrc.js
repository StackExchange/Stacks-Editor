module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./config/tsconfig.eslint.json"],
    },
    plugins: ["@typescript-eslint", "jest"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "prettier",
        "plugin:jest/recommended",
        "plugin:jest/style",
    ],
    rules: {
        "no-console": "error",
        "no-alert": "error",
        "jest/no-disabled-tests": "off",
        "no-process-env": "error",
    },
};
