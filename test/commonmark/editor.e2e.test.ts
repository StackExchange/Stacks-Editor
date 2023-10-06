import { test, expect } from "@playwright/test";
import {
    clearEditor,
    getMode,
    menuSelector,
    typeText,
    switchMode,
    clickEditorContent,
} from "../e2e-helpers";

const moreMenuDropdownSelector = ".js-more-formatting-dropdown";
const boldMenuButtonSelector = ".js-bold-btn";

test.describe.serial("markdown mode", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/empty.html");
        await switchMode(page, "markdown");
    });
    test.afterEach(async ({ page }) => {
        await page.close();
    });

    test("should show toggle switch", async ({ page }) => {
        const mode = await getMode(page);

        expect(mode).toBe("markdown");
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
        await clickEditorContent(page, ".js-editor code >> text=paragraph", 2);

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
        await clickEditorContent(page, ".js-editor code >> text=Heading", 3);

        const selectedText = await page.evaluate(() =>
            window.getSelection().toString()
        );

        // On some OSes (Windows 10 at least), the selection excludes the trailing newline
        expect(selectedText).toMatch(/^# Heading 1\n?$/);
    });

    test("should retain focus on the menu item after triggering via keyboard", async ({
        page,
    }) => {
        await expect(page.locator(moreMenuDropdownSelector)).toBeInViewport();

        // Focus the dropdown
        await page.focus(moreMenuDropdownSelector);
        const moreDropdownBtnIsFocused = await page.evaluate(() =>
            document
                .querySelector(".js-more-formatting-dropdown")
                ?.isEqualNode(document.activeElement)
        );
        expect(moreDropdownBtnIsFocused).toBe(true);

        // Open the dropdown
        await page.keyboard.press("Enter");

        // Tab to "Spoiler (Cmd-/)"
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");

        const activeElementDataKey = await page.evaluate(() =>
            document.activeElement.getAttribute("data-key")
        );
        expect(activeElementDataKey).toBe("spoiler-btn");

        // Trigger the menu item via keyboard
        await page.keyboard.press("Enter");

        // Ensure the menu item retains focus after triggering via keyboard
        const newActiveElementDataKey = await page.evaluate(() =>
            document.activeElement.getAttribute("data-key")
        );
        expect(newActiveElementDataKey).toBe("spoiler-btn");
    });
});
