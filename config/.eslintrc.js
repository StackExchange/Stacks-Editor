module.exports = {
    root: true,
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.eslint.json"],
    },
    extends: ["@stackoverflow"],
};
