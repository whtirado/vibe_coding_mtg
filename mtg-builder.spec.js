// @ts-check
const { test, expect } = require("@playwright/test");

// --- Test Suite ---
test.describe("MTG Deck Builder", () => {
  test.beforeEach(async ({ page }) => {
    // Load the local HTML file
    // IMPORTANT: Make sure this path is correct for your system where you run the tests.
    // You might need to adjust 'D:/Vibe_Coding/MTG/index.html'
    await page.goto("file:///D:/Vibe_Coding/MTG/index.html");
  });

  // --- Theme Tests ---
  test.describe("Theme Switching", () => {
    // Define selectors and constants for theme testing
    const themeToggleLabelSelector = 'label[for="themeToggleCheckbox"]'; // More robust to click the label
    const themeToggleInputSelector = "#themeToggleCheckbox";
    const bodySelector = "body";
    const themeLocalStorageKey = "mtgThemePreference";
    const lightBgColor = "rgb(240, 242, 245)"; // Computed style for #f0f2f5
    const darkBgColor = "rgb(26, 26, 26)"; // Computed style for #1a1a1a

    test("should default to light theme on first load", async ({ page }) => {
      // 1. Check the body's data-theme attribute
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "light"
      );

      // 2. Check if the toggle switch is unchecked
      await expect(page.locator(themeToggleInputSelector)).not.toBeChecked();

      // 3. Check a visual style (e.g., background color) associated with the light theme
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        lightBgColor
      );

      // 4. Check local storage (it might be null or 'light' after initial load script runs)
      const storedTheme = await page.evaluate(
        (key) => localStorage.getItem(key),
        themeLocalStorageKey
      );
      // The initial load script sets it to light if nothing is stored or system prefers light
      expect(storedTheme === "light" || storedTheme === null).toBe(true); // Allow null if script hasn't run or detection failed, but default is light
    });

    test("should switch to dark theme when toggle is clicked", async ({
      page,
    }) => {
      // Start in light theme (verified by previous test implicitly)
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "light"
      );
      await expect(page.locator(themeToggleInputSelector)).not.toBeChecked();

      // Click the theme toggle switch (using the label)
      await page.locator(themeToggleLabelSelector).click();

      // 1. Check the body's data-theme attribute has changed
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "dark"
      );

      // 2. Check if the toggle switch is now checked
      await expect(page.locator(themeToggleInputSelector)).toBeChecked();

      // 3. Check the visual style for the dark theme
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        darkBgColor
      );

      // 4. Verify the preference is saved to local storage
      await expect(
        page.evaluate((key) => localStorage.getItem(key), themeLocalStorageKey)
      ).resolves.toBe("dark");
    });

    test("should switch back to light theme when toggle is clicked again", async ({
      page,
    }) => {
      // Click once to go dark
      await page.locator(themeToggleLabelSelector).click();
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "dark"
      );
      await expect(page.locator(themeToggleInputSelector)).toBeChecked();

      // Click again to go back to light
      await page.locator(themeToggleLabelSelector).click();

      // 1. Check the body's data-theme attribute is back to light
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "light"
      );

      // 2. Check if the toggle switch is unchecked again
      await expect(page.locator(themeToggleInputSelector)).not.toBeChecked();

      // 3. Check the visual style for the light theme
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        lightBgColor
      );

      // 4. Verify the preference in local storage is updated
      await expect(
        page.evaluate((key) => localStorage.getItem(key), themeLocalStorageKey)
      ).resolves.toBe("light");
    });

    test("should load dark theme if 'dark' preference is set in local storage", async ({
      page,
    }) => {
      // Use addInitScript to set local storage *before* the page loads its own scripts
      await page.addInitScript((key) => {
        window.localStorage.setItem(key, "dark");
      }, themeLocalStorageKey);

      // Reload the page to trigger the theme loading logic with the preset storage
      // Alternatively, could navigate again, but reload is fine here.
      await page.reload();

      // 1. Check the body's data-theme attribute is dark immediately on load
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "dark"
      );

      // 2. Check if the toggle switch is checked accordingly
      await expect(page.locator(themeToggleInputSelector)).toBeChecked();

      // 3. Check the visual style for the dark theme
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        darkBgColor
      );
    });

    test("should load light theme if 'light' preference is set in local storage", async ({
      page,
    }) => {
      // Set local storage preference to 'light' before page script execution
      await page.addInitScript((key) => {
        window.localStorage.setItem(key, "light");
      }, themeLocalStorageKey);

      // Reload the page
      await page.reload();

      // 1. Check the body's data-theme attribute is light on load
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "light"
      );

      // 2. Check if the toggle switch is unchecked
      await expect(page.locator(themeToggleInputSelector)).not.toBeChecked();

      // 3. Check the visual style for the light theme
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        lightBgColor
      );
    });
  });

  // --- Add other test suites below if needed ---
}); // End of main describe block
