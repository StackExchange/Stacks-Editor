const { defaults: tsjPreset } = require("ts-jest/presets");

module.exports = {
    preset: "jest-playwright-preset",
    transform: {
        ...tsjPreset.transform,
    },
    globals: {
        "ts-jest": {
            tsconfig: "./test/tsconfig.json",
        },
    },

    // uncomment to see what playwright's doing
    // launchOptions: {
    //     headless: false,
    //     slowMo: 200,
    // },
    rootDir: "../",
};
