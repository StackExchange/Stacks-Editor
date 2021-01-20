const { defaults: tsjPreset } = require("ts-jest/presets");

process.env.JEST_PLAYWRIGHT_CONFIG = "./config/jest-playwright.config.js";

module.exports = {
    preset: "jest-playwright-preset",
    transform: {
        ...tsjPreset.transform,
    },
    rootDir: "../",
};
