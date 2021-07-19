module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    moduleNameMapper: {
        "\\.svg$": "<rootDir>/test/__mocks__/svgMock.ts",
    },
    rootDir: "../",
    testPathIgnorePatterns: ["/node_modules/", String.raw`\.e2e\.test`],
};
