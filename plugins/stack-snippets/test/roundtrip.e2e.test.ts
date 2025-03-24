import {expect, Page, test} from "@playwright/test";
import {
    validBegin,
    validCss, validEnd,
    validHtml,
    validJs
} from "./stack-snippet-helpers";
import {
    clearEditor, editorSelector,
    enterTextAsMarkdown,
    switchMode
} from "../../../test/e2e-helpers";

test.describe.serial("roundtrip tests", () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/empty.html");
        await switchMode(page, "markdown");
    });

    test.afterAll(async () => {
        await page.close();
    });

    test(`should make markdown -> richtext -> markdown round trip '${JSON.stringify(validBegin + validJs + validCss + validHtml + validEnd)}'`, async () => {
        await clearEditor(page);
        await enterTextAsMarkdown(page, validBegin + validJs + validCss + validHtml + validEnd);
        await switchMode(page, "markdown");

        const text = await page.innerText(editorSelector)
        console.log(JSON.stringify(text));
        expect(text).toBe(validBegin + validJs + validCss + validHtml + validEnd);
    });
});
