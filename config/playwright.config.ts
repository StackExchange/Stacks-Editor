import { PlaywrightTestConfig, devices } from "@playwright/test";
import * as path from "path";

// Reference: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig = {
    testDir: path.join(__dirname, "..", "test"),
    testMatch: "*.e2e.test.ts",
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,

    webServer: {
        command: "npm start -- --port 8081 --no-open",
        port: 8081,
    },

    use: {
        trace: "on",
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
