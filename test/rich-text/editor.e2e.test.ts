/* eslint-disable jest/no-done-callback */
import { test, expect, Page } from "@playwright/test";
import {
    switchMode,
    getIsMarkdown,
    clearEditor,
    editorSelector,
    typeText,
    menuSelector,
} from "../e2e-helpers";

const boldMenuButtonSelector = ".js-bold-btn";
const insertLinkMenuItemSelector = ".js-insert-link-btn";
const insertHeadingDropdownButtonSelector = `[id^="heading-dropdown-btn-"]`;
const headingPopoverSelector = `[id^="heading-dropdown-popover-"]`;
const insertH1ButtonSelector = "button[data-key='h1-btn']";

const linkViewTooltipSelector = ".js-link-tooltip";
const removeLinkSelector = ".js-link-tooltip-remove";

const getMarkdownContent = async (page: Page) => {
    const wasMarkdownModeActive = await getIsMarkdown(page);
    await switchMode(page, true);
    const text = await page.innerText(editorSelector);
    if (!wasMarkdownModeActive) {
        await switchMode(page, false);
    }
    return text;
};

const enterTextAsMarkdown = async (page: Page, text: string) => {
    await clearEditor(page);
    await switchMode(page, true);
    await typeText(page, text);
    await switchMode(page, false);
};

test.describe.serial("rich-text mode", () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/");
        await switchMode(page, false);
    });
    test.afterAll(async () => {
        await page.close();
    });

    test("should show toggle switch", async () => {
        const isMarkdown = await getIsMarkdown(page);
        expect(isMarkdown).toBeFalsy();
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

        expect(await getMarkdownContent(page)).toEqual("# plain text");
    });

    test.describe("input rules", () => {
        for (const input of [`"`, "...", "--"] as const) {
            test(`should not transform special characters: ${input}`, async () => {
                await typeText(page, input);
                const text = await page.innerText(editorSelector);
                expect(text).toBe(input);
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

    test.describe("editing images", () => {
        const imagePopoverSelector = ".js-img-popover";

        test("should show image popover when selecting an image", async () => {
            await enterTextAsMarkdown(
                page,
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

        test("should hide image popover when deselecting an image", async () => {
            await enterTextAsMarkdown(
                page,
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

    test.describe("editing links", () => {
        test("should insert a link for selected text when clicking menu item", async () => {
            await clearEditor(page);
            await expect(page.locator(linkViewTooltipSelector)).toBeHidden({
                timeout: 5000,
            });

            await typeText(page, "some link here");

            // select some text
            await page.keyboard.down("Shift");
            await page.press(editorSelector, "ArrowLeft");
            await page.press(editorSelector, "ArrowLeft");
            await page.press(editorSelector, "ArrowLeft");
            await page.keyboard.up("Shift");

            await page.click(insertLinkMenuItemSelector);

            await expect(page.locator(linkViewTooltipSelector)).toBeVisible();
        });

        test("should show link popover when selecting a link", async () => {
            // enter a link in markdown mode and switch back to rich text mode
            await enterTextAsMarkdown(
                page,
                "[a link](https://example.com/a-link)"
            );

            await expect(page.locator(linkViewTooltipSelector)).toBeHidden({
                timeout: 5000,
            });

            await page.press(editorSelector, "ArrowRight");

            await expect(page.locator(linkViewTooltipSelector)).toBeVisible();
            await expect(page.locator(linkViewTooltipSelector)).toContainText(
                "https://example.com/a-link"
            );
        });

        test("should hide link popover when deselecting a link", async ({
            browserName,
        }) => {
            test.fixme(
                browserName === "firefox",
                "ArrowLeft does not work for some reason"
            );
            await enterTextAsMarkdown(
                page,
                "[a link](https://example.com/a-link)"
            );

            await page.press(editorSelector, "ArrowRight"); // select link
            await page.press(editorSelector, "ArrowLeft"); // and deselect again
            await expect(page.locator(linkViewTooltipSelector)).toBeHidden({
                timeout: 5000,
            });
        });

        test("should remove link mark when clicking popover action", async () => {
            await enterTextAsMarkdown(
                page,
                "[a link](https://example.com/a-link)"
            );
            expect(await getMarkdownContent(page)).toEqual(
                "[a link](https://example.com/a-link)"
            );

            await page.press(editorSelector, "ArrowRight"); // select link
            await page.click(removeLinkSelector);

            expect(await getMarkdownContent(page)).toEqual("a link");
        });
    });
});
