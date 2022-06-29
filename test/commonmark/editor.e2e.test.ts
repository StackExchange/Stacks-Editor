import { test, expect, Page } from "@playwright/test";
import {
    clearEditor,
    enterTextAsMarkdown,
    getIsMarkdown,
    menuSelector,
    switchMode,
    typeText,
} from "../e2e-helpers";

const boldMenuButtonSelector = ".js-bold-btn";
const mdPreviewSelector = ".js-md-preview";

test.describe.serial("markdown mode", () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/");
        await switchMode(page, true);
    });
    test.afterAll(async () => {
        await page.close();
    });

    test("should show toggle switch", async () => {
        const isMarkdown = await getIsMarkdown(page);

        expect(isMarkdown).toBeTruthy();
    });

    test("should render menu bar", async () => {
        await expect(page.locator(menuSelector)).toBeVisible();
    });

    test("should not highlight bold menu button after click", async () => {
        await clearEditor(page);

        await expect(page.locator(boldMenuButtonSelector)).not.toHaveClass(
            /is-selected/,
            { timeout: 1000 }
        );
        await page.click(boldMenuButtonSelector);
        await expect(page.locator(boldMenuButtonSelector)).not.toHaveClass(
            /is-selected/,
            { timeout: 1000 }
        );
    });

    test("shouldn't show preview by default", async () => {
        await expect(page.locator(mdPreviewSelector)).toBeHidden({
            timeout: 1000,
        });
    });

    test("should render markdown preview", async () => {
        await page.goto("/md-preview.html");

        expect(
            await page.$eval(mdPreviewSelector, (el) =>
                el.innerHTML.includes("<h1>Here’s a thought</h1>")
            )
        ).toBeTruthy();
    });
    test("should update the markdown preview on change", async () => {
        await page.goto("/md-preview.html");
        await enterTextAsMarkdown(
            page,
            "![an image](https://localhost/some-image)"
        );
        await switchMode(page, true);

        expect(
            await page.$eval(mdPreviewSelector, (el) =>
                el.innerHTML.includes(
                    '<img src="https://localhost/some-image" alt="an image">'
                )
            )
        ).toBeTruthy();
    });
});
