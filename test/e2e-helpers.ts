/// <reference types="jest-playwright-preset" />

import type { ElementHandle } from "playwright-core";

export const editorSelector = ".js-editor";
const editorModeSwitcherSelector = ".js-editor-mode-switcher";
const editorToggleStateSelector = ".js-editor-toggle-state";
const menuSelector = ".js-editor-menu";

export async function getIsMarkdown(): Promise<boolean> {
    return await page.$eval(
        editorToggleStateSelector,
        (el: HTMLInputElement) => el.checked
    );
}

export async function switchMode(switchToMarkdown: boolean): Promise<void> {
    if ((await getIsMarkdown()) !== switchToMarkdown) {
        return await page.click(editorModeSwitcherSelector);
    }
}

export async function getMenu(): Promise<ElementHandle> {
    return await page.$(menuSelector);
}

export async function clearEditor(): Promise<string> {
    return await page.$eval(
        editorSelector,
        (editor: HTMLElement) => (editor.innerText = "")
    );
}

export async function hasClass(
    selector: string,
    cssClass: string
): Promise<boolean> {
    return await page.$eval(
        selector,
        (el: HTMLElement, cssClass) => el.classList.contains(cssClass),
        cssClass
    );
}

export async function isElementVisible(selector: string): Promise<boolean> {
    return await page.$eval(selector, (el) => !el.classList.contains("d-none"));
}

export async function elementExists(selector: string): Promise<boolean> {
    return (await page.$(selector)) !== null;
}

/**
 * Type text into the editor window
 * @param text the text to type
 * @param simulateTyping if `true` this will type characters one by one instead of entering the text all at once. That's slower but sometimes necessary
 */
export async function typeText(
    text: string,
    simulateTyping = false
): Promise<void> {
    return simulateTyping
        ? await page.type(editorSelector, text)
        : await page.fill(editorSelector, text);
}

export async function isEnabled(selector: string): Promise<boolean> {
    return await page.$eval(selector, (el: HTMLInputElement) => !el.disabled);
}
