import type { Page } from "@playwright/test";

export const editorSelector = ".js-editor";
const editorModeSwitcherSelector = ".js-editor-mode-switcher";
const editorToggleStateSelector = ".js-editor-toggle-state";
export const menuSelector = ".js-editor-menu";

export async function getIsMarkdown(page: Page): Promise<boolean> {
    return await page.$eval(
        editorToggleStateSelector,
        (el: HTMLInputElement) => el.checked
    );
}

export async function switchMode(
    page: Page,
    switchToMarkdown: boolean
): Promise<void> {
    if ((await getIsMarkdown(page)) !== switchToMarkdown) {
        return await page.click(editorModeSwitcherSelector);
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
    await switchMode(page, true);
    await typeText(page, text);
    await switchMode(page, false);
}
