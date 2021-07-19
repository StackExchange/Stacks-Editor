import {
    clearEditor,
    getIsMarkdown,
    getMenu,
    hasClass,
    switchMode,
} from "../e2e-helpers";

const boldMenuButtonSelector = ".js-bold-btn";

jest.setTimeout(35 * 1000);

beforeAll(async () => {
    await page.goto("http://localhost:8081");
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
