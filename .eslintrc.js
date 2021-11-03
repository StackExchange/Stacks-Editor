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
        "plugin:no-unsanitized/DOM",
    ],
    rules: {
        "no-console": "error",
        "no-alert": "error",
        "jest/no-disabled-tests": "off",
        "no-process-env": "error",
        // TODO this one is a pain to fix w/ ProseMirror's Class<T extends Schema = any> types
        "@typescript-eslint/no-unsafe-argument": "off",
    },
};
