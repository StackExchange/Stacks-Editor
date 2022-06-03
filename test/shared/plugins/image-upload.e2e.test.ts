/* eslint-disable jest/no-commented-out-tests */
import { test, expect, Page } from "@playwright/test";
import { editorSelector, switchMode } from "../../e2e-helpers";

const imageUploaderSelector = ".js-image-uploader";
const imagePreviewSelector = ".js-image-preview";
const addImageButtonSelector = ".js-add-image";

const uploadImageMenuItemSelector = ".js-insert-image-btn";

test.describe.serial("inserting images", () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/");
        await switchMode(page, false);
    });
    test.afterAll(async () => {
        await page.close();
    });

    test("should show image upload on keyboard shortcut", async () => {
        await expect(page.locator(imageUploaderSelector)).toBeHidden({
            timeout: 1000,
        });

        await page.keyboard.down("Control");
        await page.press(editorSelector, "g");
        await page.keyboard.up("Control");
        await expect(page.locator(imageUploaderSelector)).toBeVisible();

        await page.click(imageUploaderSelector + " .js-cancel-button");
        await expect(page.locator(imageUploaderSelector)).toBeHidden({
            timeout: 1000,
        });
    });

    test("should show upload when clicking menu icon", async () => {
        await expect(page.locator(imageUploaderSelector)).toBeHidden({
            timeout: 1000,
        });

        await page.click(uploadImageMenuItemSelector);
        await expect(page.locator(imageUploaderSelector)).toBeVisible();

        await page.click(imageUploaderSelector + " .js-cancel-button");
        await expect(page.locator(imageUploaderSelector)).toBeHidden({
            timeout: 1000,
        });
    });

    // TODO test("should show upload when pasting");
    // TODO test("should show upload when dropping a file");

    test("should show image preview", async () => {
        await page.click(uploadImageMenuItemSelector);
        const fileInput = await page.$("input[type=file]");

        await expect(page.locator(imagePreviewSelector)).toBeHidden({
            timeout: 1000,
        });
        await expect(page.locator(addImageButtonSelector)).toBeDisabled();

        await fileInput.setInputFiles("./test/shared/plugins/test-image.png");

        await expect(page.locator(imagePreviewSelector)).toBeVisible();
        await expect(page.locator(addImageButtonSelector)).toBeEnabled();
    });

    // TODO test("should insert uploaded image into document");
    // TODO test("should show placeholder while uploading");
});
