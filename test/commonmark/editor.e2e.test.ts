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

    test("should select word on double click", async () => {
        await clearEditor(page);
        await typeText(page, "paragraph here.");
        await page.dblclick(".js-editor code");
        const selectedText = await page.evaluate(() =>
            window.getSelection().toString()
        );
        expect(selectedText).toEqual("paragraph");
    });

    test("should select line on triple click", async () => {
        await clearEditor(page);
        await typeText(
            page,
            "# Heading 1\n\n```\nconsole.log(window);\n```\n\n- list item 1\n- list item 2\n\nparagraph here."
        );
        await page.click(".js-editor .hljs-section", { clickCount: 3 });
        const selectedText = await page.evaluate(() =>
            window.getSelection().toString()
        );
        expect(selectedText).toEqual("# Heading 1\n");
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
});
