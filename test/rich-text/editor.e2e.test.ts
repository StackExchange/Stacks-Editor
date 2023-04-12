import { test, expect, Page } from "@playwright/test";
import {
    switchMode,
    clearEditor,
    getMode,
    editorSelector,
    menuSelector,
    enterTextAsMarkdown,
} from "../e2e-helpers";

const boldMenuButtonSelector = ".js-bold-btn";
const insertHeadingDropdownButtonSelector = `[id^="heading-dropdown-btn-"]`;
const headingPopoverSelector = `[id^="heading-dropdown-popover-"]`;
const insertH1ButtonSelector = "button[data-key='h1-btn']";

const getMarkdownContent = async (page: Page) => {
    const initialMode = await getMode(page);
    await switchMode(page, "markdown");
    const text = await page.innerText(editorSelector);
    await switchMode(page, initialMode);
    return text;
};

test.describe.serial("rich-text mode", () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/");
        await switchMode(page, "rich-text");
    });
    test.afterAll(async () => {
        await page.close();
    });

    test("should show toggle switch", async () => {
        const mode = await getMode(page);
        expect(mode).toBe("rich-text");
    });

    test("should render menu bar", async () => {
        await expect(page.locator(menuSelector)).toBeVisible();
    });

    test("should highlight bold menu button after click", async () => {
        await clearEditor(page);

        await expect(page.locator(boldMenuButtonSelector)).not.toHaveClass(
            /is-selected/,
            { timeout: 1000 }
        );
        await page.click(boldMenuButtonSelector);

        await expect(page.locator(boldMenuButtonSelector)).toHaveClass(
            /is-selected/,
            { timeout: 1000 }
        );
    });

    test("should insert heading from dropdown", async () => {
        await enterTextAsMarkdown(page, "plain text");
        await expect(page.locator(headingPopoverSelector)).not.toHaveClass(
            /is-visible/,
            { timeout: 1000 }
        );

        await page.click(insertHeadingDropdownButtonSelector);
        await expect(page.locator(headingPopoverSelector)).toHaveClass(
            /is-visible/,
            { timeout: 1000 }
        );

        await page.click(insertH1ButtonSelector);
        await expect(page.locator(headingPopoverSelector)).not.toHaveClass(
            /is-visible/,
            { timeout: 1000 }
        );

        // In some browsers (webkit at least), the markdown content includes the trailing newline
        expect(await getMarkdownContent(page)).toMatch(/^# plain text\n?$/);
    });
});
