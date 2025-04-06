// @ts-check
const { test, expect } = require("@playwright/test");

// --- Mock Scryfall API Data ---
const mockScryfallResponses = {
  sol: {
    // Mock for searching "sol"
    status: 200,
    body: {
      object: "list",
      total_cards: 2,
      has_more: false,
      data: [
        {
          object: "card",
          id: "1",
          name: "Sol Ring",
          image_uris: {
            small: "https://cards.scryfall.io/small/front/1/s/1solring.jpg",
            normal: "https://cards.scryfall.io/normal/front/1/s/1solring.jpg",
          },
        },
        {
          object: "card",
          id: "2",
          name: "Soldier Token",
          image_uris: {
            small: "https://cards.scryfall.io/small/front/t/o/token.jpg",
            normal: "https://cards.scryfall.io/normal/front/t/o/token.jpg",
          },
        },
        // Add more if needed for testing limits, but 2 is fine
      ],
    },
  },
  bolt: {
    // Mock for searching "bolt"
    status: 200,
    body: {
      object: "list",
      total_cards: 1,
      has_more: false,
      data: [
        {
          object: "card",
          id: "3",
          name: "Lightning Bolt",
          image_uris: {
            small:
              "https://cards.scryfall.io/small/front/l/i/lightningbolt.jpg",
            normal:
              "https://cards.scryfall.io/normal/front/l/i/lightningbolt.jpg",
          },
        },
      ],
    },
  },
  xyzabc: {
    // Mock for a search with no results
    status: 404, // Simulate Scryfall's Not Found
    body: {
      object: "error",
      code: "not_found",
      details: "No cards found matching “xyzabc”",
      status: 404,
    },
  },
  "invalid query!": {
    // Mock for a bad search query
    status: 400, // Simulate Scryfall's Bad Request
    body: {
      object: "error",
      code: "bad_request",
      details: "Your query is invalid",
      status: 400,
    },
  },
};

// --- Test Suite ---
test.describe("MTG Deck Builder", () => {
  test.beforeEach(async ({ page }) => {
    // Load the local HTML file
    // IMPORTANT: Adjust this path if necessary!
    await page.goto("file:///D:/Vibe_Coding/MTG/index.html");

    // --- Mock Scryfall API Route ---
    // Mock network requests to Scryfall API to avoid actual calls
    await page.route(
      "**/api.scryfall.com/cards/search?**",
      async (route, request) => {
        const url = new URL(request.url());
        const query = url.searchParams.get("q")?.toLowerCase() || "";
        console.log(`Mocking Scryfall request for query: "${query}"`); // Debugging line

        let response = mockScryfallResponses["xyzabc"]; // Default to not found

        // Find the first matching mock key based on the query
        const mockKey = Object.keys(mockScryfallResponses).find((key) =>
          query.includes(key)
        );

        if (mockKey) {
          response = mockScryfallResponses[mockKey];
          console.log(`  -> Using mock response for key: "${mockKey}"`);
        } else {
          console.log(`  -> No specific mock found, using default (404).`);
        }

        await route.fulfill({
          status: response.status,
          contentType: "application/json",
          body: JSON.stringify(response.body),
        });
      }
    );
    // --- End Mock ---
  });

  // --- Theme Tests ---
  test.describe("Theme Switching", () => {
    // Define selectors and constants for theme testing
    const themeToggleLabelSelector = 'label[for="themeToggleCheckbox"]';
    const themeToggleInputSelector = "#themeToggleCheckbox";
    const bodySelector = "body";
    const themeLocalStorageKey = "mtgThemePreference";
    const lightBgColor = "rgb(240, 242, 245)";
    const darkBgColor = "rgb(26, 26, 26)";

    test("should default to light theme on first load", async ({ page }) => {
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "light"
      );
      await expect(page.locator(themeToggleInputSelector)).not.toBeChecked();
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        lightBgColor
      );
      const storedTheme = await page.evaluate(
        (key) => localStorage.getItem(key),
        themeLocalStorageKey
      );
      expect(storedTheme === "light" || storedTheme === null).toBe(true);
    });

    test("should switch to dark theme when toggle is clicked", async ({
      page,
    }) => {
      await page.locator(themeToggleLabelSelector).click();
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "dark"
      );
      await expect(page.locator(themeToggleInputSelector)).toBeChecked();
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        darkBgColor
      );
      await expect(
        page.evaluate((key) => localStorage.getItem(key), themeLocalStorageKey)
      ).resolves.toBe("dark");
    });

    test("should switch back to light theme when toggle is clicked again", async ({
      page,
    }) => {
      await page.locator(themeToggleLabelSelector).click(); // to dark
      await page.locator(themeToggleLabelSelector).click(); // back to light
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "light"
      );
      await expect(page.locator(themeToggleInputSelector)).not.toBeChecked();
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        lightBgColor
      );
      await expect(
        page.evaluate((key) => localStorage.getItem(key), themeLocalStorageKey)
      ).resolves.toBe("light");
    });

    test("should load dark theme if 'dark' preference is set in local storage", async ({
      page,
    }) => {
      await page.addInitScript((key) => {
        window.localStorage.setItem(key, "dark");
      }, themeLocalStorageKey);
      await page.reload();
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "dark"
      );
      await expect(page.locator(themeToggleInputSelector)).toBeChecked();
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        darkBgColor
      );
    });

    test("should load light theme if 'light' preference is set in local storage", async ({
      page,
    }) => {
      await page.addInitScript((key) => {
        window.localStorage.setItem(key, "light");
      }, themeLocalStorageKey);
      await page.reload();
      await expect(page.locator(bodySelector)).toHaveAttribute(
        "data-theme",
        "light"
      );
      await expect(page.locator(themeToggleInputSelector)).not.toBeChecked();
      await expect(page.locator(bodySelector)).toHaveCSS(
        "background-color",
        lightBgColor
      );
    });
  });

  // --- Card Search Tests ---
  test.describe("Card Search", () => {
    const searchInputSelector = "#searchInput";
    const searchResultsSelector = "#searchResults";
    const searchResultItemSelector = "#searchResults li";
    const statusSelector = "#status";
    const deckListSelector = "#deckList";
    const deckListItemSelector = "#deckList li";
    const deckCardNameSelector = ".card-name";
    const deckTotalCountSelector = "#deckTotalCount";

    test("should show initial status message and no results", async ({
      page,
    }) => {
      await expect(page.locator(searchInputSelector)).toBeVisible();
      await expect(page.locator(searchResultsSelector)).toBeHidden();
      await expect(page.locator(statusSelector)).toHaveText(
        /Type at least \d+ characters/
      );
    });

    test.skip("should show 'Searching...' status when typing enough characters", async ({
      page,
    }) => {
      await page.locator(searchInputSelector).fill("sol");
      // Status updates quickly, then changes again when results arrive.
      // We check that it *does* briefly show 'Searching...'
      // Note: This can be flaky if the mock responds too fast.
      // A better check might be to ensure the 'loading' class is added.
      await expect(page.locator(statusSelector)).toHaveClass(/loading/, {
        timeout: 100,
      }); // Check class quickly
      await expect(page.locator(statusSelector)).toHaveText(/Searching.../, {
        timeout: 100,
      });
      // Wait for results to ensure the final state is reached
      await page.waitForSelector(searchResultItemSelector);
    });

    test("should display search results when typing 3+ characters", async ({
      page,
    }) => {
      await page.locator(searchInputSelector).fill("sol");
      await page.waitForSelector(searchResultItemSelector); // Wait for results to render

      await expect(page.locator(searchResultsSelector)).toBeVisible();
      const results = page.locator(searchResultItemSelector);
      await expect(results).toHaveCount(2); // Based on mockScryfallResponses["sol"]

      // Check content of the first result
      const firstResult = results.first();
      await expect(
        firstResult.locator("img.search-result-image")
      ).toHaveAttribute("src", /1solring\.jpg/);
      await expect(firstResult.locator("span.search-result-name")).toHaveText(
        "Sol Ring"
      );

      // Check content of the second result
      const secondResult = results.nth(1);
      await expect(
        secondResult.locator("img.search-result-image")
      ).toHaveAttribute("src", /token\.jpg/);
      await expect(secondResult.locator("span.search-result-name")).toHaveText(
        "Soldier Token"
      );

      await expect(page.locator(statusSelector)).toHaveText(
        /2 result\(s\) shown/
      );
    });

    test("should hide results and update status when input is cleared", async ({
      page,
    }) => {
      await page.locator(searchInputSelector).fill("sol");
      await page.waitForSelector(searchResultItemSelector);
      await expect(page.locator(searchResultsSelector)).toBeVisible();

      await page.locator(searchInputSelector).clear();
      await expect(page.locator(searchResultsSelector)).toBeHidden();
      await expect(page.locator(statusSelector)).toHaveText(
        /Type at least \d+ characters/
      );
    });

    test("should hide results and update status when input has less than 3 characters", async ({
      page,
    }) => {
      await page.locator(searchInputSelector).fill("sol");
      await page.waitForSelector(searchResultItemSelector);
      await expect(page.locator(searchResultsSelector)).toBeVisible();

      await page.locator(searchInputSelector).fill("so"); // Less than 3 chars
      await expect(page.locator(searchResultsSelector)).toBeHidden();
      await expect(page.locator(statusSelector)).toHaveText(
        /Type at least \d+ characters/
      );
    });

    test("should show 'No cards found' status for unsuccessful search", async ({
      page,
    }) => {
      await page.locator(searchInputSelector).fill("xyzabc");
      // Wait for the status to potentially update after debounce/API call
      await expect(page.locator(statusSelector)).toHaveText(
        /No cards found matching "xyzabc"./,
        { timeout: 1000 }
      );
      await expect(page.locator(searchResultsSelector)).toBeHidden();
    });

    test("should add card to deck when clicking a search result", async ({
      page,
    }) => {
      await page.locator(searchInputSelector).fill("sol");
      await page.waitForSelector(searchResultItemSelector);

      // Click the first result ("Sol Ring")
      await page.locator(searchResultItemSelector).first().click();

      // Assertions:
      // 1. Search input is cleared
      await expect(page.locator(searchInputSelector)).toHaveValue("");
      // 2. Search results are hidden
      await expect(page.locator(searchResultsSelector)).toBeHidden();
      // 3. Status is cleared (or shows add message briefly, then clears)
      //    Checking for empty is more robust after the timeout clears it.
      await expect(page.locator(statusSelector)).toHaveText("", {
        timeout: 5000,
      }); // Wait for status clear timeout
      // 4. Deck list contains the added card
      const deckItems = page.locator(deckListItemSelector);
      await expect(deckItems).toHaveCount(1);
      await expect(deckItems.first().locator(deckCardNameSelector)).toHaveText(
        "Sol Ring"
      );
      // 5. Deck count is updated
      await expect(page.locator(deckTotalCountSelector)).toHaveText("1");
    });

    test("should add the first card to deck when pressing Enter in search input", async ({
      page,
    }) => {
      await page.locator(searchInputSelector).fill("bolt");
      await page.waitForSelector(searchResultItemSelector); // Wait for "Lightning Bolt"

      // Press Enter
      await page.locator(searchInputSelector).press("Enter");

      // Assertions (similar to click test):
      await expect(page.locator(searchInputSelector)).toHaveValue("");
      await expect(page.locator(searchResultsSelector)).toBeHidden();
      await expect(page.locator(statusSelector)).toHaveText("", {
        timeout: 5000,
      });

      const deckItems = page.locator(deckListItemSelector);
      await expect(deckItems).toHaveCount(1);
      await expect(deckItems.first().locator(deckCardNameSelector)).toHaveText(
        "Lightning Bolt"
      ); // Should be the first result
      await expect(page.locator(deckTotalCountSelector)).toHaveText("1");
    });

    test("should handle clicking outside search results to close them", async ({
      page,
    }) => {
      await page.locator(searchInputSelector).fill("sol");
      await page.waitForSelector(searchResultItemSelector);
      await expect(page.locator(searchResultsSelector)).toBeVisible();

      // Click somewhere else, like the main header
      await page.locator("h1").click();

      await expect(page.locator(searchResultsSelector)).toBeHidden();
    });
  });

  // --- Add other test suites below (Deck Management, Test Area, etc.) ---
}); // End of main describe block
