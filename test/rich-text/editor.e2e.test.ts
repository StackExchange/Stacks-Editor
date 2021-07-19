import {
    switchMode,
    getIsMarkdown,
    getMenu,
    clearEditor,
    hasClass,
    editorSelector,
    isElementVisible,
    elementExists,
    typeText,
} from "../e2e-helpers";

const boldMenuButtonSelector = ".js-bold-btn";
const insertLinkMenuItemSelector = ".js-insert-link-btn";

const linkViewTooltipSelector = ".js-link-tooltip";
const removeLinkSelector = ".js-link-tooltip-remove";

const getMarkdownContent = async () => {
    const wasMarkdownModeActive = await getIsMarkdown();
    await switchMode(true);
    const text = await page.innerText(editorSelector);
    if (!wasMarkdownModeActive) {
        await switchMode(false);
    }
    return text;
};

const enterTextAsMarkdown = async (text: string) => {
    await clearEditor();
    await switchMode(true);
    await typeText(text);
    await switchMode(false);
};

describe("rich-text mode", () => {
    beforeAll(async () => {
        await switchMode(false);
    });

    it("should show toggle switch", async () => {
        const isMarkdown = await getIsMarkdown();
        expect(isMarkdown).toBeFalsy();
    });

    it("should render menu bar", async () => {
        const menu = await getMenu();
        expect(menu).not.toBeNull();
    });

    it("should highlight bold menu button after click", async () => {
        await clearEditor();

        expect(await hasClass(boldMenuButtonSelector, "is-selected")).toBe(
            false
        );
        await page.click(boldMenuButtonSelector);

        expect(await hasClass(boldMenuButtonSelector, "is-selected")).toBe(
            true
        );
    });

    describe("input rules", () => {
        it.each([`"`, "...", "--"])(
            "should not transform special characters",
            async (input) => {
                await typeText(input);
                const text = await page.innerText(editorSelector);
                expect(text).toBe(input);
            }
        );

        it.each([
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
        ])(
            "should create a node on input '%s'",
            async (input, expectedNodeType) => {
                await clearEditor();
                await typeText(input);
                // TODO HACK don't use the debugging instance on window since it is unique to our specific view
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const doc = await page.evaluate(() =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
                    (<any>window).editorInstance.editorView.state.doc.toJSON()
                );

                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                expect(doc.content[0].type).toBe(expectedNodeType);
            }
        );

        it.each([
            // valid inline mark rules
            ["**bold** ", "strong"],
            ["*emphasis* ", "em"],
            ["__bold__ ", "strong"],
            ["_emphasis_ ", "em"],
            ["`code` ", "code"],
            ["[a link](https://example.com)", "link"],
        ])(
            "should create a mark on input '%s'",
            async (input, expectedMarkType) => {
                await clearEditor();
                const simulateTyping = true;
                await typeText(input, simulateTyping);
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
            }
        );

        it.each([
            // invalid followed by valid
            ["__nope_ _match_", 1],
            ["**nope* *match*", 1],
            // invalid, folled by valid, but duplicate text
            ["__test_ _test_", 1],
            ["**test* *test*", 1],
            // no match
            ["**test*", -1],
            ["__test_", -1],
        ])(
            "should handle strong vs weak emphasis marks (%s)",
            async (input, matchIndex) => {
                await clearEditor();
                await typeText(input, true);

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
            }
        );

        it("should validate links for link input rule", async () => {
            await clearEditor();
            const simulateTyping = true;
            await typeText("[invalid link](example)", simulateTyping);
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

    describe("editing images", () => {
        const imagePopoverSelector = ".js-img-popover";

        it("should show image popover when selecting an image", async () => {
            await enterTextAsMarkdown(
                "![an image](https://localhost/some-image)"
            );

            expect(
                await page.$eval(imagePopoverSelector, (el) =>
                    el.classList.contains("is-visible")
                )
            ).toBe(false);

            await page.click(".js-editor img");

            expect(
                await page.$eval(imagePopoverSelector, (el) =>
                    el.classList.contains("is-visible")
                )
            ).toBe(true);
        });

        it("should hide image popover when deselecting an image", async () => {
            await enterTextAsMarkdown(
                "![an image](https://localhost/some-image)"
            );

            await page.click(".js-editor img"); // select image
            await page.click(boldMenuButtonSelector); // deselect image

            expect(
                await page.$eval(imagePopoverSelector, (el) =>
                    el.classList.contains("is-visible")
                )
            ).toBe(false);
        });
    });

    describe("editing links", () => {
        it("should insert a link for selected text when clicking menu item", async () => {
            await clearEditor();
            expect(await elementExists(linkViewTooltipSelector)).toBe(false);

            await typeText("some link here");

            // select some text
            await page.keyboard.down("Shift");
            await page.press(editorSelector, "ArrowLeft");
            await page.press(editorSelector, "ArrowLeft");
            await page.press(editorSelector, "ArrowLeft");
            await page.keyboard.up("Shift");

            await page.click(insertLinkMenuItemSelector);

            expect(await isElementVisible(linkViewTooltipSelector)).toBe(true);
        });

        it("should show link popover when selecting a link", async () => {
            // enter a link in markdown mode and switch back to rich text mode
            await enterTextAsMarkdown("[a link](https://example.com/a-link)");

            expect(await elementExists(linkViewTooltipSelector)).toBe(false);

            await page.press(editorSelector, "ArrowRight");

            expect(await isElementVisible(linkViewTooltipSelector)).toBe(true);
            expect(await page.innerText(linkViewTooltipSelector)).toEqual(
                "https://example.com/a-link"
            );
        });

        it("should hide link popover when deselecting a link", async () => {
            await enterTextAsMarkdown("[a link](https://example.com/a-link)");

            await page.press(editorSelector, "ArrowRight"); // select link
            await page.press(editorSelector, "ArrowLeft"); // and deselect again

            expect(await elementExists(linkViewTooltipSelector)).toBe(false);
        });

        it("should remove link mark when clicking popover action", async () => {
            await enterTextAsMarkdown("[a link](https://example.com/a-link)");
            expect(await getMarkdownContent()).toEqual(
                "[a link](https://example.com/a-link)"
            );

            await page.press(editorSelector, "ArrowRight"); // select link
            await page.click(removeLinkSelector);

            expect(await getMarkdownContent()).toEqual("a link");
        });
    });
});
