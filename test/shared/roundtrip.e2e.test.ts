import { test, expect, Page } from "@playwright/test";
import {
    switchMode,
    clearEditor,
    editorSelector,
    enterTextAsMarkdown
} from "../e2e-helpers";

test.describe.serial("roundtrip tests", () => {
    let page: Page;
    test.beforeAll(async ({browser}) => {
       page = await browser.newPage();
       await page.goto("/empty.html");
       await switchMode(page, "markdown");
    });

    test.afterAll(async () => {
        await page.close();
    });

    for (const [markdown] of [
        //Basic commonmark
        ['plain'],
        ['*italic*'],
        ['_italic_'],
        ['**bold**'],
        ['__bold__'],
        ['# H1' ],
        ['## H2' ],
        ['[link](http://www.example.com)' ],
        ['![Image](http://www.example.com/pretty.png)' ],
        ['> blockquote' ],
        ['* List Item' ],
        ['- List Item' ],
        ['1. List Item' ],
        ['2) List Item' ],
        ['lol\n\n---\n\nlmao' ],
        ['lol\n\n***\n\nlmao' ],
        ['`code`' ],
        //TODO: Codeblock does weird things roundtripping: Adds an extra space
        //['```javascript\ncodeblock\n```' ],

        //Escape character
        [String.raw`\# not a header`],
        [String.raw`- \# list item (not header)`]
    ] as const) {
        test(`should make markdown -> richtext -> markdown round trip '${markdown}'`, async () => {
            await clearEditor(page);
            await enterTextAsMarkdown(page, markdown);
            await switchMode(page, "markdown");

            const text = await page.innerText(editorSelector);
            expect(text).toBe(markdown);
        })
    }
});
