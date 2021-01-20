/// <reference types="jest-playwright-preset" />
/// <reference types="expect-playwright" />

const editorToggleStateSelector = ".js-editor-toggle-state";
const editorModeSwitcherSelector = ".js-editor-mode-switcher";
const editorSelector = ".js-editor";
const menuSelector = ".js-editor-menu";
const imageUploaderSelector = ".js-image-uploader";
const imagePreviewSelector = ".js-image-preview";
const addImageButtonSelector = ".js-add-image";

const uploadImageMenuItemSelector = ".js-insert-image-btn";
const insertLinkMenuItemSelector = ".js-insert-link-btn";
const boldMenuButtonSelector = ".js-bold-btn";

const linkViewTooltipSelector = ".js-link-tooltip";
const removeLinkSelector = ".js-link-tooltip-remove";

const switchMode = async (switchToMarkdown: boolean) => {
    if ((await getIsMarkdown()) !== switchToMarkdown) {
        return await page.click(editorModeSwitcherSelector);
    }
};

const getMenu = async () => {
    return await page.$(menuSelector);
};

const getIsMarkdown = async () => {
    return await page.$eval(
        editorToggleStateSelector,
        (el: HTMLInputElement) => el.checked
    );
};

const isElementVisible = async (selector: string) => {
    return await page.$eval(selector, (el) => !el.classList.contains("d-none"));
};

const elementExists = async (selector: string) => {
    return (await page.$(selector)) !== null;
};

const isEnabled = async (selector: string) => {
    return await page.$eval(selector, (el: HTMLInputElement) => !el.disabled);
};

const hasClass = async (selector: string, cssClass: string) => {
    return await page.$eval(
        selector,
        (el: HTMLElement, cssClass) => el.classList.contains(cssClass),
        cssClass
    );
};

const clearEditor = async () => {
    return await page.$eval(
        editorSelector,
        (editor: HTMLElement) => (editor.innerText = "")
    );
};

const getMarkdownContent = async () => {
    const wasMarkdownModeActive = await getIsMarkdown();
    await switchMode(true);
    const text = await page.innerText(editorSelector);
    if (!wasMarkdownModeActive) {
        await switchMode(false);
    }
    return text;
};

const typeText = async (text: string) => {
    return await page.fill(editorSelector, text);
};

const enterTextAsMarkdown = async (text: string) => {
    await clearEditor();
    await switchMode(true);
    await typeText(text);
    await switchMode(false);
};

jest.setTimeout(35 * 1000);

beforeAll(async () => {
    await page.goto("http://localhost:8080");
});

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

describe("markdown mode", () => {
    beforeAll(async () => {
        await switchMode(true);
    });

    it("should show toggle switch", async () => {
        const isMarkdown = await getIsMarkdown();

        expect(isMarkdown).toBeTruthy();
    });

    it("should render menu bar", async () => {
        const menu = await getMenu();
        expect(menu).not.toBeNull();
    });

    it("should not highlight bold menu button after click", async () => {
        await clearEditor();

        expect(await hasClass(boldMenuButtonSelector, "is-selected")).toBe(
            false
        );
        await page.click(boldMenuButtonSelector);

        expect(await hasClass(boldMenuButtonSelector, "is-selected")).toBe(
            false
        );
    });
});

describe("inserting images", () => {
    beforeAll(async () => {
        await switchMode(false);
    });

    it("should show image upload on keyboard shortcut", async () => {
        expect(await isElementVisible(imageUploaderSelector)).toBe(false);

        await page.keyboard.down("Control");
        await page.press(editorSelector, "g");
        await page.keyboard.up("Control");
        expect(await isElementVisible(imageUploaderSelector)).toBe(true);

        await page.click(imageUploaderSelector + " .js-cancel-button");
        expect(await isElementVisible(imageUploaderSelector)).toBe(false);
    });

    it("should show upload when clicking menu icon", async () => {
        expect(await isElementVisible(imageUploaderSelector)).toBe(false);

        await page.click(uploadImageMenuItemSelector);
        expect(await isElementVisible(imageUploaderSelector)).toBe(true);

        await page.click(imageUploaderSelector + " .js-cancel-button");
        expect(await isElementVisible(imageUploaderSelector)).toBe(false);
    });
    it.todo("should show upload when pasting");
    it.todo("should show upload when dropping a file");

    it("should show image preview", async () => {
        await page.click(uploadImageMenuItemSelector);
        const fileInput = await page.$("input[type=file]");

        expect(await isElementVisible(imagePreviewSelector)).toBe(false);
        expect(await isEnabled(addImageButtonSelector)).toBe(false);

        await fileInput.setInputFiles("./test/e2e/test-image.png");

        expect(await isElementVisible(imagePreviewSelector)).toBe(true);
        expect(await isEnabled(addImageButtonSelector)).toBe(true);
    });

    it.todo("should insert uploaded image into document");
    it.todo("should show placeholder while uploading");
});
