/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    moduleNameMapper: {
        "\\.svg$": "<rootDir>/test/__mocks__/svgMock.ts",
    },
    rootDir: "../",
    testPathIgnorePatterns: ["/node_modules/", String.raw`\.e2e\.test`],
    setupFilesAfterEnv: ["<rootDir>/test/matchers.ts"],
    transform: {
        "\\.ts$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/test/tsconfig.json",
            },
        ],
    },
};
