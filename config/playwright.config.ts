import { PlaywrightTestConfig, devices } from "@playwright/test";
import * as path from "path";

// Reference: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig = {
    testDir: path.join(__dirname, "..", "test"),
    testMatch: "*.e2e.test.ts",
    forbidOnly: !!process.env.CI,
    retries: 0,

    webServer: {
        command: "npm start -- --port 8081 --no-open",
        url: "http://localhost:8081/",
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
    },

    use: {
        trace: "on",
        baseURL: "http://localhost:8081/",
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
