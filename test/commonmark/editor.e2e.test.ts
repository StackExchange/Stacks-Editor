import { test, expect, Page } from "@playwright/test";
import {
    clearEditor,
    getIsMarkdown,
    menuSelector,
    typeText,
    switchMode,
} from "../e2e-helpers";

const boldMenuButtonSelector = ".js-bold-btn";

test.describe.serial("markdown mode", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/empty.html");
        await switchMode(page, true);
    });
    test.afterEach(async ({ page }) => {
        await page.close();
    });

    test("should show toggle switch", async ({ page }) => {
        const isMarkdown = await getIsMarkdown(page);

        expect(isMarkdown).toBeTruthy();
    });

    test("should render menu bar", async ({ page }) => {
        await expect(page.locator(menuSelector)).toBeVisible();
    });

    test("should not highlight bold menu button after click", async ({
        page,
    }) => {
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

    test("should select word on double click", async ({ page }) => {
        await typeText(page, "paragraph here", true);
        await click(page, ".js-editor code >> text=paragraph", 2);

        const selectedText = await page.evaluate(() =>
            window.getSelection().toString()
        );

        // On some OSes (Windows 10 at least), the selection includes the trailing space
        expect(selectedText).toMatch(/^paragraph\s?$/);
    });

    test("should select line on triple click", async ({ page }) => {
        await clearEditor(page);
        await typeText(
            page,
            "# Heading 1\n\n```\nconsole.log(window);\n```\n\n- list item 1\n- list item 2\n\nparagraph here."
        );
        await click(page, ".js-editor .hljs-section", 3);

        const selectedText = await page.evaluate(() =>
            window.getSelection().toString()
        );

        // On some OSes (Windows 10 at least), the selection excludes the trailing newline
        expect(selectedText).toMatch(/^# Heading 1\n?$/);
    });
});

/** The scrolling behavior in Page.click causes flakiness, so roll our own */
async function click(page: Page, selector: string, clickCount: number) {
    const locator = page.locator(selector);
    const bb = await locator.boundingBox();
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2, {
        clickCount,
    });
}
