import { expect, test } from "@playwright/test";

test("shows a concrete stable-major version without beta branding", async ({
    page,
}) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Stacks Editor");
    await expect(page.locator("main > h1")).toHaveText("Stacks Editor");
    await expect(page.locator(".js-version-number")).toHaveText(/^1\./);
});

test("uses V3 menu styling for site settings", async ({ page }) => {
    await page.goto("/");
    await page.locator('[aria-controls="js-settings-popover"]').click();

    const settingsPopover = page.locator("#js-settings-popover");
    await expect(settingsPopover).toHaveClass(/is-visible/);
    await expect(settingsPopover).not.toHaveAttribute("role");
    await expect(settingsPopover.locator(".s-block-link")).toHaveCount(0);
    await expect(settingsPopover.locator(".s-menu--item")).not.toHaveCount(0);
    await expect(settingsPopover.getByRole("checkbox")).toHaveCount(4);
    await expect(settingsPopover.getByRole("link")).not.toHaveCount(0);
});
