import { expect, test } from "@playwright/test";
import { editorSelector, enterTextAsMarkdown, tab } from "../e2e-helpers";

test("operates heading actions by keyboard without losing editor content", async ({
    page,
    browserName,
}) => {
    await page.goto("/");
    await enterTextAsMarkdown(page, "Keyboard heading");
    const trigger = page.locator('[id^="heading-dropdown-btn-"]');
    await trigger.focus();
    await page.keyboard.press("Enter");

    const popover = page.locator('[id^="heading-dropdown-popover-"]');
    const heading = popover.getByRole("menuitem").first();
    await expect(popover).toBeVisible();
    await tab(page, browserName);
    await expect(heading).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(`${editorSelector} h1`)).toHaveText(
        "Keyboard heading"
    );
    await expect(heading).toBeFocused();
});

test("keeps settings checkboxes labelled and keyboard operable", async ({
    page,
    browserName,
}) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).focus();
    await page.keyboard.press("Enter");
    const settings = page.locator("#js-settings-popover");
    const darkMode = settings.getByRole("checkbox", { name: "Dark mode" });
    await expect(settings).toBeVisible();
    await tab(page, browserName);
    await expect(darkMode).toBeFocused();
    await page.keyboard.press("Space");
    await expect(darkMode).toBeChecked();
    await page.keyboard.press("Space");
    await expect(darkMode).not.toBeChecked();
});

for (const theme of ["light", "dark", "high-contrast", "dark-high-contrast"]) {
    test(`lays out heading menu actions in ${theme}`, async ({
        page,
    }, testInfo) => {
        await page.goto("/");
        await enterTextAsMarkdown(page, "Menu layout");
        if (theme !== "light") {
            await page
                .getByRole("button", { name: "Settings", exact: true })
                .click();
            if (theme.includes("dark")) {
                await page.locator('label[for="js-toggle-dark"]').click();
                await expect(
                    page.getByRole("checkbox", { name: "Dark mode" })
                ).toBeChecked();
            }
            if (theme.includes("high-contrast")) {
                await page.locator('label[for="js-toggle-contrast"]').click();
                await expect(
                    page.getByRole("checkbox", { name: "High contrast" })
                ).toBeChecked();
            }
            await page
                .getByRole("button", { name: "Settings", exact: true })
                .click();
        }
        await page.locator(editorSelector).focus();
        await page.locator('[id^="heading-dropdown-btn-"]').click();
        const popover = page.locator('[id^="heading-dropdown-popover-"]');
        await expect(popover).toBeVisible();
        const actions = popover.getByRole("menuitem");
        expect(await actions.count()).toBeGreaterThan(0);
        for (const action of await actions.all()) {
            await expect(action).toBeVisible();
            await expect(action).toHaveCSS("display", "flex");
            const geometry = await action.evaluate((element) => {
                const actionRect = element.getBoundingClientRect();
                const menuRect = element
                    .closest(".s-popover")
                    .getBoundingClientRect();
                return {
                    height: actionRect.height,
                    contained:
                        actionRect.left >= menuRect.left &&
                        actionRect.right <= menuRect.right,
                    clipped: element.scrollWidth > element.clientWidth,
                };
            });
            expect(geometry.height).toBeGreaterThan(0);
            expect(geometry.contained).toBe(true);
            expect(geometry.clipped).toBe(false);
        }
        // Review artifacts supplement layout assertions; these are not baselines.
        await popover.screenshot({
            path: testInfo.outputPath("heading-menu.png"),
            animations: "disabled",
        });
    });
}
