import {
    editorSelector,
    isElementVisible,
    isEnabled,
    switchMode,
} from "../../e2e-helpers";

const imageUploaderSelector = ".js-image-uploader";
const imagePreviewSelector = ".js-image-preview";
const addImageButtonSelector = ".js-add-image";

const uploadImageMenuItemSelector = ".js-insert-image-btn";

jest.setTimeout(35 * 1000);

beforeAll(async () => {
    await page.goto("http://localhost:8081");
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

        await fileInput.setInputFiles("./test/shared/plugins/test-image.png");

        expect(await isElementVisible(imagePreviewSelector)).toBe(true);
        expect(await isEnabled(addImageButtonSelector)).toBe(true);
    });

    it.todo("should insert uploaded image into document");
    it.todo("should show placeholder while uploading");
});
