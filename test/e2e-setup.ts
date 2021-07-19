/// <reference types="jest-playwright-preset" />

jest.setTimeout(35 * 1000);

beforeAll(async () => {
    await page.goto("http://localhost:8081");
});
