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

test("scrolls the toolbar horizontally without wrapping controls", async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 420, height: 600 });
    await page.goto("/");

    const toolbar = page.locator(".js-editor-toolbar");
    await expect(toolbar).toHaveCount(1);
    const geometry = await toolbar.evaluate((element) => {
        const controls = Array.from(
            element.querySelectorAll<HTMLElement>(".s-editor-btn")
        )
            .map((control) => {
                const { top, right, bottom, left, width, height } =
                    control.getBoundingClientRect();
                return {
                    label: control.title,
                    top,
                    right,
                    bottom,
                    left,
                    width,
                    height,
                };
            })
            .filter(({ width, height }) => width > 0 && height > 0);
        return {
            overflowX: getComputedStyle(element).overflowX,
            scrolls: element.scrollWidth > element.clientWidth,
            singleRow:
                Math.max(...controls.map(({ top }) => top)) <
                Math.min(...controls.map(({ bottom }) => bottom)),
            controls,
        };
    });
    expect(geometry.overflowX).toBe("auto");
    expect(geometry.scrolls).toBe(true);
    expect(geometry.singleRow, JSON.stringify(geometry.controls)).toBe(true);
    await toolbar.screenshot({
        path: testInfo.outputPath("scrolling-toolbar.png"),
        animations: "disabled",
    });
});

test("preserves the mode toggle group border and prose size", async ({
    page,
    browserName,
}, testInfo) => {
    await page.goto("/");

    const toggle = page.locator(".s-editor-btn-group");
    // Inline flex is blockified because the group is itself a flex item.
    await expect(toggle).toHaveCSS("display", "flex");
    await expect(toggle).toHaveCSS("border-top-width", "1px");
    await expect(page.locator(".ProseMirror.s-prose")).toHaveCSS(
        "font-size",
        "15px"
    );
    const fontFamilies = await page.evaluate(() => ({
        body: getComputedStyle(document.body).fontFamily,
        editor: getComputedStyle(document.querySelector(".ProseMirror"))
            .fontFamily,
    }));
    expect(fontFamilies.editor).toBe(fontFamilies.body);
    const selected = toggle.locator('label[for^="mode-toggle-rich-"]');
    const unselected = toggle.locator('label[for^="mode-toggle-markdown-"]');
    const backgrounds = await Promise.all([
        selected.evaluate(
            (element) => getComputedStyle(element).backgroundColor
        ),
        unselected.evaluate(
            (element) => getComputedStyle(element).backgroundColor
        ),
    ]);
    expect(backgrounds[0]).not.toBe(backgrounds[1]);
    let focusedId = "";
    for (
        let index = 0;
        index < 30 && !focusedId.startsWith("mode-toggle-");
        index++
    ) {
        await tab(page, browserName);
        focusedId = await page.evaluate(() => document.activeElement?.id ?? "");
    }
    expect(focusedId).toMatch(/^mode-toggle-/);
    await expect(toggle.locator(`label[for="${focusedId}"]`)).not.toHaveCSS(
        "box-shadow",
        "none"
    );
    await toggle.screenshot({
        path: testInfo.outputPath("mode-toggle.png"),
        animations: "disabled",
    });
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
            await expect(action).toHaveCSS("border-radius", "0px");
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
