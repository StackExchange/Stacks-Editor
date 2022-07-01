import { test, expect, Page } from "@playwright/test";
import {
    clearEditor,
    editorSelector,
    switchMode,
    typeText,
} from "../e2e-helpers";

test.describe.serial("rich-text inputrules", () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/");
        await switchMode(page, false);
    });
    test.afterAll(async () => {
        await page.close();
    });

    for (const input of [`"`, "...", "--"] as const) {
        test(`should not transform special characters: ${input}`, async () => {
            await clearEditor(page);
            await typeText(page, input);
            const text = await page.innerText(editorSelector);
            expect(text).toMatch(input);
        });
    }

    for (const [input, expectedNodeType] of [
        // valid rules
        ["1. ", "ordered_list"],
        ["2) ", "ordered_list"],
        ["- ", "bullet_list"],
        ["+ ", "bullet_list"],
        ["* ", "bullet_list"],
        ["> ", "blockquote"],
        [">! ", "spoiler"],
        ["# ", "heading"],
        ["## ", "heading"],
        ["### ", "heading"],
        ["```", "code_block"],

        // invalid rules
        ["10. ", "paragraph"],
        ["#### ", "paragraph"],
    ] as const) {
        test(`should create a node on input '${input}'`, async () => {
            await clearEditor(page);
            await typeText(page, input);
            // TODO HACK don't use the debugging instance on window since it is unique to our specific view
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const doc = await page.evaluate(() =>
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
                (<any>window).editorInstance.editorView.state.doc.toJSON()
            );

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            expect(doc.content[0].type).toBe(expectedNodeType);
        });
    }

    for (const [input, expectedMarkType] of [
        // valid inline mark rules
        ["**bold** ", "strong"],
        ["*emphasis* ", "em"],
        ["__bold__ ", "strong"],
        ["_emphasis_ ", "em"],
        ["`code` ", "code"],
        ["[a link](https://example.com)", "link"],
    ] as const) {
        test(`should create a mark on input '${input}'`, async () => {
            await clearEditor(page);
            const simulateTyping = true;
            await typeText(page, input, simulateTyping);
            // TODO HACK don't use the debugging instance on window since it is unique to our specific view
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const doc = await page.evaluate(() =>
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
                (<any>window).editorInstance.editorView.state.doc.toJSON()
            );

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            expect(doc.content[0].content[0].marks[0].type).toContain(
                expectedMarkType
            );
        });
    }

    for (const [input, matchIndex] of [
        // invalid followed by valid
        ["__nope_ _match_", 1],
        ["**nope* *match*", 1],
        // invalid, folled by valid, but duplicate text
        ["__test_ _test_", 1],
        ["**test* *test*", 1],
        // no match
        ["**test*", -1],
        ["__test_", -1],
    ] as const) {
        test(`should handle strong vs weak emphasis marks (${input})`, async () => {
            await clearEditor(page);
            await typeText(page, input, true);

            // TODO HACK don't use the debugging instance on window since it is unique to our specific view
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const doc = await page.evaluate(() =>
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
                (<any>window).editorInstance.editorView.state.doc.toJSON()
            );

            // consider a matchIndex of -1 to mean "should not match"
            let mark = "em";
            if (matchIndex === -1) {
                mark = undefined;
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            expect(doc.content[0].content[matchIndex]?.marks[0].type).toBe(
                mark
            );
        });
    }

    test("should validate links for link input rule", async () => {
        await clearEditor(page);
        const simulateTyping = true;
        await typeText(page, "[invalid link](example)", simulateTyping);
        // TODO HACK don't use the debugging instance on window since it is unique to our specific view
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const doc = await page.evaluate(() =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
            (<any>window).editorInstance.editorView.state.doc.toJSON()
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(doc.content[0].content[0].marks).toBeUndefined();
    });
});
