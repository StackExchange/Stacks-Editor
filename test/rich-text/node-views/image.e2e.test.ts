import { test, expect, Page } from "@playwright/test";
import { enterTextAsMarkdown, switchMode } from "../../e2e-helpers";

const boldMenuButtonSelector = ".js-bold-btn";

test.describe.serial("rich-text image nodeview", () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/");
        await switchMode(page, "rich-text");
    });
    test.afterAll(async () => {
        await page.close();
    });

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

    test("should not show image popover when navigating with left/right arrow keys", async () => {
        await enterTextAsMarkdown(
            page,
            "![an image](https://localhost/some-image)"
        );

        // move over the image from the left side
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");

        expect(
            await page.$eval(imagePopoverSelector, (el) =>
                el.classList.contains("is-visible")
            )
        ).toBe(false);

        // move over the image from the right side
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowLeft");

        expect(
            await page.$eval(imagePopoverSelector, (el) =>
                el.classList.contains("is-visible")
            )
        ).toBe(false);
    });
});
