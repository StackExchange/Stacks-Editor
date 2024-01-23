import type { Page } from "@playwright/test";

export const editorSelector = ".js-editor";
export const menuSelector = ".js-editor-menu";

type Mode = "markdown" | "rich-text";

const modeIds: { [id: string]: Mode } = {
    "0": "rich-text",
    "1": "markdown",
};

export async function getMode(page: Page): Promise<"markdown" | "rich-text"> {
    const checkedModeRadio = page.getByRole("radio", {
        name: "mode",
        checked: true,
    });

    const modeId = await checkedModeRadio.getAttribute("data-mode");

    return modeIds[modeId];
}

export async function switchMode(page: Page, mode: Mode): Promise<void> {
    const currentMode = await getMode(page);
    if (currentMode !== mode) {
        const checkedModeRadio = page.getByRole("radio", {
            name: "mode",
            checked: true,
        });

        await checkedModeRadio.focus();

        // webkit doesn't loop through the radio buttons when it reaches the last one in the list
        // so we need to be specific about which arrow key to press
        currentMode === "rich-text"
            ? await page.keyboard.press("ArrowRight")
            : await page.keyboard.press("ArrowLeft");
    }
}

export async function clearEditor(page: Page): Promise<string> {
    return await page.$eval(
        editorSelector,
        (editor: HTMLElement) => (editor.innerText = "")
    );
}

/**
 * Type text into the editor window
 * @param text the text to type
 * @param simulateTyping if `true` this will type characters one by one instead of entering the text all at once. That's slower but sometimes necessary
 */
export async function typeText(
    page: Page,
    text: string,
    simulateTyping = false
): Promise<void> {
    return simulateTyping
        ? await page.type(editorSelector, text)
        : await page.fill(editorSelector, text);
}

/**
 * Clears the editor, switches to markdown mode, types the text as markdown and switches to rich text mode
 * @param page The page to use
 * @param text The text to type
 */
export async function enterTextAsMarkdown(page: Page, text: string) {
    await clearEditor(page);
    await switchMode(page, "markdown");
    await typeText(page, text);
    await switchMode(page, "rich-text");
}

/**
 * When clicking inside the editor, the scrolling behavior in Page.click causes flakiness
 * so we've rolled our own version of it
 * @param page The page to use
 * @param selector The element to click
 * @param clickCount The number of times to click the element
 */
export async function clickEditorContent(
    page: Page,
    selector: string,
    clickCount: number
) {
    const locator = page.locator(selector);
    const bb = await locator.boundingBox();
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2, {
        clickCount,
    });
}

/**
 * Simulate pressing the tab key consistently across browsers
 * @param page
 * @param browserName
 */
export async function tab(
    page: Page,
    browserName: "chromium" | "firefox" | "webkit"
): Promise<void> {
    // see https://github.com/microsoft/playwright/issues/2114
    const tabKey = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await page.keyboard.press(tabKey);
}
