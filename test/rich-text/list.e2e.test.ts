import { test, expect, Page } from "@playwright/test";
import { switchMode, editorSelector, clearEditor } from "../e2e-helpers";

test.describe("rich-text list", () => {
    let page: Page;
    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/");
        await switchMode(page, "rich-text");
        await clearEditor(page);
    });
    test.afterEach(async () => {
        await page.close();
    });

    test("should toggle the selected text to and from a list when the list button is clicked", async () => {
        const editor = page.locator(editorSelector);

        await editor.pressSequentially("List Item 1");
        await editor.press("Enter");
        await editor.pressSequentially("List Item 2");
        await editor.press("Enter");
        await editor.pressSequentially("List Item 3");

        await editor.selectText();

        await page.getByLabel("Bulleted list (Cmd-U)").click();

        await expect(editor.getByRole("list")).toBeVisible();
        await expect(editor.getByRole("listitem")).toHaveText([
            "List Item 1",
            "List Item 2",
            "List Item 3",
        ]);

        await page.getByLabel("Bulleted list (Cmd-U)").click();

        await expect(editor.getByRole("list")).not.toBeVisible();
    });

    test("should attempt to insert an item into existing an existing list of the same type when appropriate", async () => {
        const editor = page.locator(editorSelector);

        await editor.pressSequentially("- List Item 1");
        await editor.press("Enter");
        await editor.press("Enter");
        await editor.pressSequentially("List Item 2");
        await editor.press("Enter");
        await editor.pressSequentially("- List Item 3");

        await expect(editor.getByRole("list")).toHaveCount(2);

        // move cursor on the second list item
        await editor.getByText("List Item 2").click();

        await page.getByLabel("Bulleted list (Cmd-U)").click();

        await expect(editor.getByRole("list")).toHaveCount(1);
        await expect(editor.getByRole("listitem")).toHaveText([
            "List Item 1",
            "List Item 2",
            "List Item 3",
        ]);
    });
});
