import { PlaywrightTestConfig, devices } from "@playwright/test";
import * as path from "path";

// Reference: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig = {
    testDir: path.join(__dirname, "..", "test"),
    testMatch: /.*e2e\.test\.ts/,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,

    webServer: {
        command: "npm start -- --port 8081 --no-open",
        port: 8081,
    },

    use: {
        trace: "on-first-retry",
    },

    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
        {
            name: "firefox",
            use: {
                ...devices["Desktop Firefox"],
                // TODO: remove after https://github.com/microsoft/playwright/pull/10492 was released
                userAgent:
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0.1) Gecko/20100101 Firefox/94.0.1",
            },
        },
        {
            name: "webkit",
            use: {
                ...devices["Desktop Safari"],
            },
        },
    ],
};
export default config;
