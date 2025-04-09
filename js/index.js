"use strict";

$(function () {
  // Self-executing function on document ready

  /* --- jQuery DOM Element References --- */
  const $searchInput = $("#searchInput");
  const $searchResults = $("#searchResults");
  const $statusDiv = $("#status");
  const $deckList = $("#deckList");
  const $deckTotalCountSpan = $("#deckTotalCount");
  const $deckTotalCountBottomSpan = $("#deckTotalCountBottom");
  const $saveDeckButton = $("#saveDeckButton");
  const $importDeckButton = $("#importDeckButton");
  const $deleteSavedDeckButton = $("#deleteSavedDeckButton");
  const $clearDeckButton = $("#clearDeckButton");
  const $deckActionStatus = $("#deckActionStatus");
  const $currentDeckNameStatus = $("#currentDeckNameStatus");
  const $savedDecksList = $("#savedDecksList");
  const $drawHandButton = $("#drawHandButton");
  const $drawNextCardButton = $("#drawNextCardButton");
  const $shuffleDeckButton = $("#shuffleDeckButton");
  const $searchDeckButton = $("#searchDeckButton");
  const $scryButton = $("#scryButton");
  const $scryCountInput = $("#scryCountInput");
  const $untapAllButton = $("#untapAllButton");
  const $flipCoinButton = $("#flipCoinButton");
  const $rollDieButton = $("#rollDieButton");
  const $testHandStatus = $("#testHandStatus");
  const $testAreaSection = $("#testAreaSection");
  const $fullscreenTestAreaButton = $("#fullscreenTestAreaButton");
  const $battlefieldDisplayContainer = $("#battlefieldDisplayContainer");
  const $generalZone = $("#generalZone");
  const $graveyardZone = $("#graveyardZone");
  const $exileZone = $("#exileZone");
  const $graveyardCountSpan = $("#graveyardCount");
  const $exileCountSpan = $("#exileCount");
  const $testHandContainer = $("#testHandContainer");
  const $themeToggle = $("#themeToggleCheckbox");
  const $deckSearchArea = $("#deckSearchArea");
  const $deckSearchResults = $("#deckSearchResults");
  const $closeSearchAreaButton = $("#closeSearchAreaButton");
  const $cardContextMenu = $("#cardContextMenu");
  const $scryOverlay = $("#scryOverlay");
  const $scryModal = $("#scryModal");
  const $scryModalTitle = $("#scryModalTitle");
  const $scryCardContainer = $("#scryCardContainer");
  const $cardViewPopupOverlay = $("#cardViewPopupOverlay");
  const $cardViewImage = $("#cardViewImage");
  const $closeCardViewPopupButton = $("#closeCardViewPopupButton");
  const $resultPopupOverlay = $("#resultPopupOverlay");
  const $resultPopupContent = $("#resultPopupContent");
  const $resultPopupText = $("#resultPopupText");
  const $closeResultPopupButton = $("#closeResultPopupButton");
  // Life Counter Elements
  const $lifeTotalDisplay = $("#lifeTotalDisplay");
  const $increaseLifeButton = $("#increaseLifeButton");
  const $decreaseLifeButton = $("#decreaseLifeButton");
  // Import Deck Popup Elements
  const $importDeckPopupOverlay = $("#importDeckPopupOverlay");
  const $importDeckPopupContent = $("#importDeckPopupContent");
  const $importDeckNameInput = $("#importDeckNameInput");
  const $importDeckListTextarea = $("#importDeckListTextarea");
  const $saveImportedDeckButton = $("#saveImportedDeckButton");
  const $closeImportDeckPopupButton = $("#closeImportDeckPopupButton");
  const $importDeckStatus = $("#importDeckStatus");

  /* --- Constants --- */
  const MULTI_DECK_STORAGE_KEY = "mtgDeckBuilderMultiDeckStorageV1";
  const THEME_STORAGE_KEY = "mtgThemePreference";
  const MIN_SEARCH_LENGTH = 3;
  const DEBOUNCE_DELAY = 350;
  const STATUS_CLEAR_DELAY = 4000;
  const STARTING_HAND_SIZE = 7;
  const STARTING_LIFE_TOTAL = 20;
  const SCRYFALL_API_DELAY = 75; // ms delay for Scryfall API politeness

  /* --- Application State --- */
  let currentDeck =
    {}; /* Stores the main deck list { cardName: { quantity, imageUrl, normalImageUrl } } */
  let currentLoadedDeckName =
    null; /* Name of the currently loaded deck from local storage */
  // let searchAbortController = null; /* Controller replaced by jqXHR object */
  let currentSearchRequest = null; /* Reference to the ongoing $.ajax request */
  let currentHand =
    []; /* Array of card objects currently in the player's hand */
  let currentBattlefield =
    {}; /* Object storing cards on the battlefield { battlefieldId: cardData } */
  let currentLibrary =
    []; /* Array of card objects representing the deck's library */
  let currentGraveyard = []; /* Array of card objects in the graveyard */
  let currentExile = []; /* Array of card objects in exile */
  let handCardIdCounter = 0; /* Counter for generating unique hand card IDs */
  let battlefieldCardIdCounter = 0; /* Counter for generating unique battlefield card IDs */
  let graveyardCardIdCounter = 0; /* Counter for generating unique graveyard card IDs */
  let exileCardIdCounter = 0; /* Counter for generating unique exile card IDs */
  let currentPlayerLife = STARTING_LIFE_TOTAL; /* Player's life total */
  let dragInfo = {
    /* State for drag-and-drop operations */ cardId: null,
    sourceZone: null,
    offsetX: 0,
    offsetY: 0,
    element: null, // Store the actual dragged element (jQuery object or DOM element)
  };
  let contextMenuVisible = false; /* Flag indicating if the context menu is open */
  let contextMenuTarget = {
    /* State for the card targeted by the context menu */ cardId: null,
    cardData: null,
    sourceZone: null,
    libraryIndex: null,
  };
  let scryingState = {
    /* State for the scry operation */ active: false,
    cards: [],
    expectedCount: 0,
    resolvedCount: 0,
    toBottom: [],
  };
  let isFullscreen = false; /* Flag indicating if the test area is in fullscreen mode */
  let isImporting = false; // Flag to prevent multiple import saves at once
  let importCardDataRequest = null; // Store the jqXHR for card data fetching

  /* --- Utility Functions --- */

  /**
   * Debounce function to limit the rate at which a function can fire.
   * @param {Function} func - The function to debounce.
   * @param {number} wait - The debounce delay in milliseconds.
   * @returns {Function} The debounced function.
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args); // Use apply to maintain context
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Updates the status message displayed below the search input.
   * @param {string} message - The message to display.
   * @param {boolean} [isLoading=false] - Whether to show a loading indicator.
   */
  function updateStatus(message, isLoading = false) {
    $statusDiv.text(message).toggleClass("loading", isLoading);
  }

  /**
   * Clears the search status message.
   */
  function clearStatus() {
    updateStatus("");
  }

  /**
   * Removes the loading indicator from the search status.
   */
  function removeLoadingIndicator() {
    $statusDiv.removeClass("loading");
  }

  /**
   * Updates the status message related to deck actions (save, load, clear).
   * Message automatically clears after a delay.
   * @param {string} message - The message to display.
   */
  function updateDeckActionStatus(message) {
    $deckActionStatus.text(message);
    setTimeout(() => {
      if ($deckActionStatus.text() === message) $deckActionStatus.text("");
    }, STATUS_CLEAR_DELAY);
  }

  /**
   * Updates the status message inside the import popup.
   * @param {string} message - The message to display.
   * @param {'info' | 'error' | 'success'} [type='info'] - The type of message (for styling).
   */
  function updateImportStatus(message, type = "info") {
    // Replace newlines with <br> for HTML display
    const formattedMessage = escapeHtml(message).replace(/\n/g, "<br>");
    $importDeckStatus.html(formattedMessage); // Use .html() for <br>
    $importDeckStatus.removeClass("error success").addClass(type); // Add specified class
  }

  /**
   * Updates the display showing the name of the currently loaded/edited deck.
   * Also enables/disables the delete button based on whether a deck is loaded.
   * @param {string|null} deckName - The name of the loaded deck, or null if none.
   */
  function updateCurrentDeckNameStatus(deckName) {
    if (deckName) {
      const safeDeckName = escapeHtml(deckName);
      $currentDeckNameStatus.text(`Editing: ${safeDeckName}`);
      $deleteSavedDeckButton
        .text(`Delete Deck: "${safeDeckName}"`)
        .prop("disabled", false);
    } else {
      $currentDeckNameStatus.text("No Deck Loaded / Unsaved Deck");
      $deleteSavedDeckButton
        .text("Delete Current Loaded Deck")
        .prop("disabled", true);
    }
  }

  /**
   * Escapes HTML special characters in a string to prevent XSS.
   * @param {string|null|undefined} unsafe - The potentially unsafe string.
   * @returns {string} The escaped string.
   */
  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return "";
    // jQuery can create a temporary element to do this safely
    return $("<div/>").text(unsafe.toString()).html();
  }

  /**
   * Shuffles an array in place using the Fisher-Yates algorithm.
   * @param {Array<any>} array - The array to shuffle.
   */
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Simple delay function using Promises.
   * @param {number} ms - Milliseconds to wait.
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* --- Scryfall API Interaction --- */

  /**
   * Performs a live search using the Scryfall API based on user input.
   * Handles API errors and displays results or status messages.
   * Uses the jqXHR object to abort previous requests.
   * @param {string} query - The search query string.
   */
  async function performLiveSearch(query) {
    if (currentSearchRequest) {
      currentSearchRequest.abort();
    }
    $searchResults.empty().hide();

    if (!query || query.length < MIN_SEARCH_LENGTH) {
      updateStatus(
        `Type at least ${MIN_SEARCH_LENGTH} characters for suggestions.`
      );
      return;
    }

    updateStatus("Searching...", true);
    const apiUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
      query
    )}&unique=cards&order=name&include_extras=false&include_variations=false`;

    await sleep(SCRYFALL_API_DELAY); // Add delay before ajax call

    currentSearchRequest = $.ajax({
      url: apiUrl,
      method: "GET",
      dataType: "json", // Expect JSON response
      timeout: 10000, // 10 second timeout
    })
      .done(function (data) {
        displaySearchResults(data.data.slice(0, 15)); // Limit results
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (textStatus === "abort") {
          console.log("Search AJAX aborted");
          return;
        }
        console.error("Search Error:", textStatus, errorThrown);
        let errorMsg = `Error searching cards.`;
        if (jqXHR.status === 404) {
          errorMsg = `No cards found matching "${escapeHtml(query)}".`;
        } else if (jqXHR.status === 400) {
          errorMsg = `Invalid search query. Try different terms.`;
        } else if (textStatus === "timeout") {
          errorMsg = "Search timed out. Please try again.";
        } else {
          errorMsg = `API Error (${jqXHR.status}): ${escapeHtml(
            errorThrown || textStatus
          )}`;
        }
        updateStatus(errorMsg);
        $searchResults.hide();
      })
      .always(function () {
        removeLoadingIndicator();
        currentSearchRequest = null; // Clear the request reference
      });
  }

  /**
   * Debounced version of the live search function.
   */
  const debouncedLiveSearch = debounce(performLiveSearch, DEBOUNCE_DELAY);

  /**
   * Displays the card search results in the UI using jQuery.
   * @param {Array<object>} cards - An array of card objects from the Scryfall API.
   */
  function displaySearchResults(cards) {
    $searchResults.empty(); // Clear previous results
    if (!cards || cards.length === 0) {
      $searchResults.hide();
      return;
    }
    updateStatus(`${cards.length} result(s) shown. Click to add.`);
    $searchResults.show();

    $.each(cards, function (index, card) {
      const smallImageUrl =
        card.image_uris?.small || card.image_uris?.normal || "";
      const normalImageUrl = card.image_uris?.normal || smallImageUrl;
      const cardName = card.name || "Unknown Card";
      const safeCardName = escapeHtml(cardName);
      const safeSmallImageUrl = escapeHtml(smallImageUrl);

      const $li = $("<li>")
        .attr("data-cardname", cardName) // Store original name
        .attr("data-imageurl", smallImageUrl)
        .attr("data-normalimageurl", normalImageUrl);

      const $img = $("<img>")
        .addClass("search-result-image")
        .attr("src", safeSmallImageUrl)
        .attr("alt", safeCardName)
        .prop("loading", "lazy");

      const $span = $("<span>").addClass("search-result-name").text(cardName); // Display original name

      $li.append($img, $span);
      $searchResults.append($li);
    });
  }

  /* --- Deck Management Functions --- */

  /**
   * Renders the current deck list in the UI using jQuery.
   * Calculates and displays the total card count.
   * Enables/disables the draw hand button based on deck size.
   */
  function renderDeck() {
    $deckList.empty();
    let totalCards = 0;
    const sortedCardNames = Object.keys(currentDeck).sort();

    $.each(sortedCardNames, function (index, cardName) {
      const cardInfo = currentDeck[cardName];
      if (!cardInfo || cardInfo.quantity <= 0) {
        if (cardInfo)
          delete currentDeck[cardName]; /* Clean up invalid entries */
        return true; // Continue $.each loop
      }
      totalCards += cardInfo.quantity;

      const smallImageUrl = cardInfo.imageUrl || "";
      const normalImageUrl = cardInfo.normalImageUrl || smallImageUrl;
      const safeCardName = escapeHtml(cardName);
      const safeSmallImageUrl = escapeHtml(smallImageUrl);
      const safeNormalImageUrl = escapeHtml(normalImageUrl);

      const $li = $("<li>");

      const $cardInfoDiv = $("<div>").addClass("card-info");
      const $img = $("<img>")
        .addClass("card-image")
        .attr("src", safeSmallImageUrl)
        .attr("alt", safeCardName)
        .attr("data-normal-src", safeNormalImageUrl)
        .prop("loading", "lazy");
      const $nameSpan = $("<span>")
        .addClass("card-name")
        .attr("title", safeCardName)
        .text(cardName);
      $cardInfoDiv.append($img, $nameSpan);

      const $cardControlsDiv = $("<div>").addClass("card-controls");
      const $quantitySpan = $("<span>").addClass("card-quantity");
      const $quantityInput = $("<input>")
        .attr("type", "number")
        .attr("min", "1")
        .attr("data-cardname", cardName)
        .addClass("quantity-input")
        .val(cardInfo.quantity);
      $quantitySpan.append($quantityInput);

      const $deleteButton = $("<button>")
        .addClass("delete-card-btn")
        .attr("data-cardname", cardName)
        .text("X");
      $cardControlsDiv.append($quantitySpan, $deleteButton);

      $li.append($cardInfoDiv, $cardControlsDiv);
      $deckList.append($li);
    });

    $deckTotalCountSpan.text(totalCards);
    $deckTotalCountBottomSpan.text(totalCards);
    $drawHandButton.prop("disabled", totalCards < STARTING_HAND_SIZE);
  }

  /**
   * Adds a card to the current deck or increments its quantity.
   * @param {string} cardName - The name of the card.
   * @param {string} smallImageUrl - The URL for the small card image.
   * @param {string} normalImageUrl - The URL for the normal card image.
   */
  function addCardToDeck(cardName, smallImageUrl, normalImageUrl) {
    if (!cardName) {
      console.error("Attempted to add card with no name.");
      updateDeckActionStatus("Error: Cannot add card without a name.");
      return;
    }
    const existingCard = currentDeck[cardName];
    const safeCardName = escapeHtml(cardName);

    if (existingCard) {
      existingCard.quantity++;
      updateDeckActionStatus(
        `Incremented "${safeCardName}" to ${existingCard.quantity}.`
      );
    } else {
      const safeSmallUrl =
        typeof smallImageUrl === "string" ? smallImageUrl : "";
      const safeNormalUrl =
        typeof normalImageUrl === "string" ? normalImageUrl : safeSmallUrl;
      if (!safeSmallUrl)
        console.warn(`Missing image URL for card: ${safeCardName}.`);

      currentDeck[cardName] = {
        quantity: 1,
        imageUrl: safeSmallUrl,
        normalImageUrl: safeNormalUrl,
      };
      updateDeckActionStatus(`Added "${safeCardName}" to deck.`);
    }
    renderDeck();
    $searchInput.val(""); // Clear search input
    $searchResults.empty().hide(); // Clear results
    clearStatus();
  }

  /**
   * Updates the quantity of a specific card in the deck.
   * Removes the card if the quantity becomes zero or less.
   * @param {string} cardName - The name of the card to update.
   * @param {string|number} newQuantity - The new quantity for the card.
   */
  function updateCardQuantity(cardName, newQuantity) {
    const quantity = parseInt(newQuantity, 10);
    const cardInfo = currentDeck[cardName];
    if (!cardInfo) return;

    const safeCardName = escapeHtml(cardName);
    if (isNaN(quantity) || quantity <= 0) {
      deleteCardFromDeck(cardName);
      updateDeckActionStatus(
        `Removed "${safeCardName}" (quantity set to 0 or less).`
      );
    } else {
      cardInfo.quantity = quantity;
      updateDeckActionStatus(
        `Updated "${safeCardName}" quantity to ${quantity}.`
      );
      renderDeck(); // Re-render to update the input visually if needed, though the value is already changed
    }
  }

  /**
   * Removes a card completely from the current deck.
   * @param {string} cardName - The name of the card to remove.
   */
  function deleteCardFromDeck(cardName) {
    if (currentDeck[cardName]) {
      const safeCardName = escapeHtml(cardName);
      delete currentDeck[cardName];
      updateDeckActionStatus(`Removed "${safeCardName}" from deck.`);
      renderDeck();
    }
  }

  /**
   * Clears the entire current deck and resets the test area.
   * Prompts the user for confirmation.
   */
  function clearDeck() {
    if (
      confirm(
        "Are you sure you want to clear the current deck? This also clears the test area. This cannot be undone unless saved."
      )
    ) {
      currentDeck = {};
      currentLoadedDeckName = null;
      updateDeckActionStatus("Deck cleared.");
      updateCurrentDeckNameStatus(null);
      renderDeck();
      clearTestArea();
      $testAreaSection.hide();
    }
  }

  /* --- Local Storage (Deck Saving/Loading) --- */

  /**
   * Retrieves all saved decks from local storage.
   * Performs basic validation on the retrieved data structure.
   * @returns {object} An object containing saved decks { deckName: deckData }.
   */
  function getSavedDecks() {
    const savedData = localStorage.getItem(MULTI_DECK_STORAGE_KEY);
    let decks = {};
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Basic validation: ensure it's a non-null object
        if (
          typeof parsedData === "object" &&
          parsedData !== null &&
          !Array.isArray(parsedData)
        ) {
          decks = parsedData;
        } else {
          console.warn(
            "Invalid data type found in multi-deck storage:",
            parsedData
          );
          localStorage.removeItem(MULTI_DECK_STORAGE_KEY); // Clear invalid data
        }
      } catch (error) {
        console.error("Error parsing saved decks:", error);
        localStorage.removeItem(MULTI_DECK_STORAGE_KEY); // Clear corrupted data
      }
    }
    return decks;
  }

  /**
   * Renders the list of saved decks in the UI using jQuery.
   */
  function renderSavedDecksList() {
    const savedDecks = getSavedDecks();
    const deckNames = Object.keys(savedDecks).sort();
    $savedDecksList.empty(); // Clear previous list

    if (deckNames.length === 0) {
      $("<li>")
        .text("No saved decks found.")
        .addClass("no-decks")
        .appendTo($savedDecksList);
    } else {
      $.each(deckNames, function (index, name) {
        $("<li>")
          .text(escapeHtml(name)) // Display escaped name
          .attr("data-deck-name", name) // Store original name in data attribute
          .appendTo($savedDecksList);
      });
    }
  }

  /**
   * Saves the current deck to local storage.
   * Prompts the user for a deck name and handles overwriting existing decks.
   */
  function saveDeck() {
    const deckName = prompt(
      "Enter a name for this deck:",
      currentLoadedDeckName || ""
    );
    if (!deckName || deckName.trim() === "") {
      updateDeckActionStatus("Save cancelled: Deck name cannot be empty.");
      return;
    }
    const trimmedDeckName = deckName.trim();
    const savedDecks = getSavedDecks();

    if (
      savedDecks[trimmedDeckName] &&
      !confirm(
        `A deck named "${escapeHtml(
          trimmedDeckName
        )}" already exists. Overwrite it?`
      )
    ) {
      updateDeckActionStatus("Save cancelled.");
      return;
    }

    // Create a deep copy to avoid modifying the saved data if currentDeck changes later
    savedDecks[trimmedDeckName] = JSON.parse(JSON.stringify(currentDeck));

    try {
      localStorage.setItem(MULTI_DECK_STORAGE_KEY, JSON.stringify(savedDecks));
      currentLoadedDeckName = trimmedDeckName;
      updateDeckActionStatus(
        `Deck "${escapeHtml(trimmedDeckName)}" saved successfully!`
      );
      updateCurrentDeckNameStatus(trimmedDeckName);
      renderSavedDecksList();
    } catch (error) {
      console.error("Error saving deck:", error);
      updateDeckActionStatus(
        "Error saving deck. LocalStorage might be full or disabled."
      );
    }
  }

  /**
   * Loads a deck from local storage by its name.
   * Performs validation on the loaded deck data structure.
   * Updates the current deck and UI.
   * @param {string} deckName - The name of the deck to load.
   */
  function loadDeckByName(deckName) {
    const savedDecks = getSavedDecks();
    const deckData = savedDecks[deckName];
    const safeDeckName = escapeHtml(deckName);

    if (deckData) {
      let isValid = true;
      const validatedDeck = {};
      // Validate the structure of the loaded deck data
      for (const cardName in deckData) {
        if (typeof cardName !== "string" || cardName.trim() === "") {
          isValid = false;
          console.warn("Invalid card name found in loaded deck:", cardName);
          break;
        }
        const entry = deckData[cardName];
        if (
          typeof entry !== "object" ||
          entry === null ||
          typeof entry.quantity !== "number" ||
          !Number.isInteger(entry.quantity) ||
          entry.quantity <= 0 ||
          typeof entry.imageUrl !== "string" ||
          (entry.hasOwnProperty("normalImageUrl") &&
            typeof entry.normalImageUrl !== "string")
        ) {
          // Attempt to fix missing normalImageUrl
          if (typeof entry.imageUrl === "string" && !entry.normalImageUrl) {
            entry.normalImageUrl = entry.imageUrl;
          } else {
            isValid = false;
            console.warn("Invalid card data structure for:", cardName, entry);
            break;
          }
        }
        validatedDeck[cardName] = {
          quantity: entry.quantity,
          imageUrl: entry.imageUrl,
          normalImageUrl: entry.normalImageUrl || entry.imageUrl,
        };
      }

      if (isValid) {
        currentDeck = validatedDeck;
        currentLoadedDeckName = deckName;
        updateDeckActionStatus(`Deck "${safeDeckName}" loaded successfully!`);
        updateCurrentDeckNameStatus(deckName);
        clearTestArea(); // Reset play area when loading a new deck
        renderDeck();
        const totalDeckCards = Object.values(currentDeck).reduce(
          (sum, card) => sum + card.quantity,
          0
        );
        $drawHandButton.prop("disabled", totalDeckCards < STARTING_HAND_SIZE);
        disableDrawNextButton();
        disableShuffleButton();
        disableSearchButton();
        disableScryButton();
        hideDeckSearchArea();
        $testAreaSection.show(); // Show test area
        updateLifeDisplay(); // Ensure life total is displayed correctly
      } else {
        updateDeckActionStatus(
          `Failed to load deck "${safeDeckName}": Invalid data format found.`
        );
        console.warn(
          "Invalid deck structure found in loaded deck data:",
          deckData
        );
      }
    } else {
      updateDeckActionStatus(`Deck "${safeDeckName}" not found.`);
      renderSavedDecksList(); // Refresh list in case it was deleted elsewhere
    }
  }

  /**
   * Deletes the currently loaded deck from local storage.
   * Prompts the user for confirmation.
   */
  function deleteSavedDeck() {
    const deckNameToDelete = currentLoadedDeckName;

    if (!deckNameToDelete) {
      updateDeckActionStatus("Please load the deck you wish to delete first.");
      return;
    }
    const safeDeckName = escapeHtml(deckNameToDelete);
    const savedDecks = getSavedDecks();

    if (!savedDecks[deckNameToDelete]) {
      updateDeckActionStatus(
        `Error: Loaded deck "${safeDeckName}" not found in storage.`
      );
      currentLoadedDeckName = null; // Reset state
      updateCurrentDeckNameStatus(null);
      renderSavedDecksList();
      return;
    }

    if (
      confirm(
        `Are you sure you want to permanently delete the deck "${safeDeckName}"? This cannot be undone.`
      )
    ) {
      delete savedDecks[deckNameToDelete];
      try {
        localStorage.setItem(
          MULTI_DECK_STORAGE_KEY,
          JSON.stringify(savedDecks)
        );
        updateDeckActionStatus(`Deck "${safeDeckName}" deleted.`);
        clearDeck(); // Clear the currently loaded deck from UI
        renderSavedDecksList();
      } catch (error) {
        console.error("Error deleting deck:", error);
        updateDeckActionStatus(
          "Error deleting deck. LocalStorage might be full or disabled."
        );
      }
    } else {
      updateDeckActionStatus("Delete cancelled.");
    }
  }

  /* --- Life Point Management --- */

  /**
   * Updates the life total display in the UI.
   */
  function updateLifeDisplay() {
    $lifeTotalDisplay.text(currentPlayerLife);
  }

  /**
   * Increases the player's life total by 1.
   */
  function increaseLife() {
    currentPlayerLife++;
    updateLifeDisplay();
  }

  /**
   * Decreases the player's life total by 1.
   */
  function decreaseLife() {
    currentPlayerLife--;
    updateLifeDisplay();
  }

  /* --- Test Area / Play Simulation Functions --- */

  /**
   * Updates the display of +1/+1 and -1/-1 counters on a battlefield card element.
   * @param {jQuery} $cardElement - The jQuery object representing the card on the battlefield.
   * @param {object} counters - The counters object ({ plusOne: number, minusOne: number }).
   */
  function updateCardCountersDisplay($cardElement, counters) {
    const $countersDiv = $cardElement.find(".card-counters");
    if (!$countersDiv.length) return;
    $countersDiv.empty(); // Clear existing counters

    if (counters?.plusOne > 0) {
      $("<span>")
        .addClass("counter-display plus-one")
        .text(`+${counters.plusOne}/+${counters.plusOne}`)
        .appendTo($countersDiv);
    }
    if (counters?.minusOne > 0) {
      $("<span>")
        .addClass("counter-display minus-one")
        .text(`-${counters.minusOne}/-${counters.minusOne}`)
        .appendTo($countersDiv);
    }
  }

  /**
   * Renders the cards currently on the battlefield in the UI.
   */
  function displayBattlefield() {
    // Clear existing battlefield cards, keeping the title (h4)
    $generalZone.children().not("h4").remove();

    $.each(currentBattlefield, function (id, card) {
      if (card.zone === "general") {
        const posX = typeof card.x === "number" ? card.x : 10;
        const posY = typeof card.y === "number" ? card.y : 10;
        const smallImageUrl = card.imageUrl || "";
        const normalImageUrl = card.normalImageUrl || smallImageUrl;
        const safeCardName = escapeHtml(card.name || "Unknown Card");
        const safeSmallImageUrl = escapeHtml(smallImageUrl);
        const safeNormalImageUrl = escapeHtml(normalImageUrl);

        const $cardDiv = $("<div>")
          .addClass("battlefield-card")
          .attr("data-battlefield-id", id)
          .prop("draggable", true)
          .css({
            left: `${posX}px`,
            top: `${posY}px`,
          })
          .toggleClass("tapped", card.isTapped);

        const $img = $("<img>")
          .attr("src", safeSmallImageUrl)
          .attr("alt", safeCardName)
          .attr("title", safeCardName)
          .attr("data-normal-src", safeNormalImageUrl);

        // Add container for counters
        const $cardCountersDiv = $("<div>").addClass("card-counters");

        $cardDiv.append($img, $cardCountersDiv);
        updateCardCountersDisplay($cardDiv, card.counters); // Pass jQuery element

        $generalZone.append($cardDiv);
      }
    });
    updateUntapAllButtonVisibility();
  }

  /**
   * Renders the cards currently in the hand zone in the UI.
   */
  function displayHand() {
    const $fragment = $(document.createDocumentFragment()); // Use jQuery fragment equivalent
    $.each(currentHand, function (index, card) {
      const displayImageUrl = card.imageUrl || "";
      const normalImageUrl = card.normalImageUrl || displayImageUrl;
      const safeCardName = escapeHtml(card.name || "Unknown Card");
      const safeDisplayImageUrl = escapeHtml(displayImageUrl);
      const safeNormalImageUrl = escapeHtml(normalImageUrl);

      const $cardDiv = $("<div>")
        .addClass("hand-card")
        .attr("data-hand-id", card.handId)
        .prop("draggable", true); // Make hand cards draggable

      const $img = $("<img>")
        .attr("src", safeDisplayImageUrl)
        .attr("alt", safeCardName)
        .attr("title", safeCardName)
        .attr("data-normal-src", safeNormalImageUrl)
        .prop("loading", "lazy");

      $cardDiv.append($img);
      $fragment.append($cardDiv);
    });
    $testHandContainer.empty().append($fragment); // Clear previous hand and append new one
    updateTestStatus(); // Update counts
  }

  /**
   * Renders the cards in the graveyard and exile zones.
   */
  function displaySideZones() {
    // Helper to clear a zone while keeping the H4 title
    const clearZone = ($zone, $countSpan) => {
      $zone.children().not("h4").remove();
      $countSpan.text("0");
    };

    clearZone($graveyardZone, $graveyardCountSpan);
    clearZone($exileZone, $exileCountSpan);

    $.each(currentGraveyard, function (index, card) {
      const displayImageUrl = card.imageUrl || "";
      const normalImageUrl = card.normalImageUrl || displayImageUrl;
      const safeCardName = escapeHtml(card.name || "Unknown Card");
      const safeDisplayImageUrl = escapeHtml(displayImageUrl);
      const safeNormalImageUrl = escapeHtml(normalImageUrl);

      const $cardDiv = $("<div>")
        .addClass("side-zone-card")
        .attr("data-gy-id", card.gyId);

      const $img = $("<img>")
        .attr("src", safeDisplayImageUrl)
        .attr("alt", safeCardName)
        .attr("title", safeCardName)
        .attr("data-normal-src", safeNormalImageUrl)
        .prop("loading", "lazy");

      $cardDiv.append($img);
      $graveyardZone.append($cardDiv);
    });

    $.each(currentExile, function (index, card) {
      const displayImageUrl = card.imageUrl || "";
      const normalImageUrl = card.normalImageUrl || displayImageUrl;
      const safeCardName = escapeHtml(card.name || "Unknown Card");
      const safeDisplayImageUrl = escapeHtml(displayImageUrl);
      const safeNormalImageUrl = escapeHtml(normalImageUrl);

      const $cardDiv = $("<div>")
        .addClass("side-zone-card")
        .attr("data-exile-id", card.exileId);

      const $img = $("<img>")
        .attr("src", safeDisplayImageUrl)
        .attr("alt", safeCardName)
        .attr("title", safeCardName)
        .attr("data-normal-src", safeNormalImageUrl)
        .prop("loading", "lazy");

      $cardDiv.append($img);
      $exileZone.append($cardDiv);
    });

    updateTestStatus(); // Update counts
  }

  /**
   * Shows or hides the "Untap All" button based on whether any cards on the battlefield are tapped.
   */
  function updateUntapAllButtonVisibility() {
    let tappedCardExists = false;
    for (const id in currentBattlefield) {
      if (
        currentBattlefield[id].zone === "general" &&
        currentBattlefield[id].isTapped
      ) {
        tappedCardExists = true;
        break;
      }
    }
    $untapAllButton.toggle(tappedCardExists); // Use toggle for show/hide
  }

  /**
   * Updates the status text in the test area (card counts, messages) and enables/disables relevant buttons.
   * @param {string} [message=""] - An optional message to prepend to the status.
   */
  function updateTestStatus(message = "") {
    const handCount = currentHand.length;
    const libraryCount = currentLibrary.length;
    const gyCount = currentGraveyard.length;
    const exileCount = currentExile.length;

    $graveyardCountSpan.text(gyCount);
    $exileCountSpan.text(exileCount);

    let statusText = message ? `${message} ` : "";
    statusText += `Hand: ${handCount}, Library: ${libraryCount}, GY: ${gyCount}, Exile: ${exileCount}.`;

    const libraryAvailable = libraryCount > 0;

    // Only modify button states if not currently scrying
    if (!scryingState.active) {
      $drawNextCardButton.prop("disabled", !libraryAvailable);
      $shuffleDeckButton.prop("disabled", libraryCount <= 1);
      $searchDeckButton.prop("disabled", !libraryAvailable);
      $scryButton.prop("disabled", !libraryAvailable);
      $scryCountInput.prop("disabled", !libraryAvailable);
      if (libraryAvailable) {
        $scryCountInput.prop("max", libraryCount);
        if (parseInt($scryCountInput.val(), 10) > libraryCount) {
          $scryCountInput.val(libraryCount); // Adjust if value exceeds max
        }
      } else {
        $scryCountInput.prop("max", 1).val(1);
      }
    }

    if (!libraryAvailable && !scryingState.active) {
      statusText += " Library is empty.";
    }
    $testHandStatus.text(statusText);
    updateUntapAllButtonVisibility();
    updateLifeDisplay(); // Keep life display updated
  }

  /**
   * Draws the initial starting hand from the current deck.
   * Shuffles the deck, sets up the library and hand state, and updates the UI.
   * Resets life total.
   */
  function drawTestHand() {
    clearTestArea(); // Reset everything before drawing
    const deckArray = [];
    // Create a flat array representing the deck
    for (const cardName in currentDeck) {
      const cardInfo = currentDeck[cardName];
      if (cardInfo && cardInfo.quantity > 0) {
        for (let i = 0; i < cardInfo.quantity; i++)
          deckArray.push({
            name: cardName,
            imageUrl: cardInfo.imageUrl,
            normalImageUrl: cardInfo.normalImageUrl,
          });
      }
    }

    const deckSize = deckArray.length;
    if (deckSize < STARTING_HAND_SIZE) {
      updateTestStatus(
        `Cannot draw hand: Deck only has ${deckSize} cards (needs at least ${STARTING_HAND_SIZE}).`
      );
      disableDrawNextButton();
      disableShuffleButton();
      disableSearchButton();
      disableScryButton();
      displayHand();
      displayBattlefield();
      displaySideZones();
      $testAreaSection.hide(); // Hide test area if deck too small
      currentPlayerLife = STARTING_LIFE_TOTAL; // Reset life even if draw fails
      updateLifeDisplay();
      return;
    }

    $testAreaSection.show(); // Ensure test area is visible
    shuffleArray(deckArray);

    const hand = deckArray.slice(0, STARTING_HAND_SIZE);
    currentHand = hand.map((card) => ({
      handId: `h-${handCardIdCounter++}`,
      name: card.name,
      imageUrl: card.imageUrl,
      normalImageUrl: card.normalImageUrl,
    }));
    currentLibrary = deckArray.slice(STARTING_HAND_SIZE);
    currentPlayerLife = STARTING_LIFE_TOTAL; // Reset life total for new game

    displayHand();
    displayBattlefield();
    displaySideZones();
    updateTestStatus(`Drew ${STARTING_HAND_SIZE} cards.`);
    enableDrawNextButton();
    enableShuffleButton();
    enableSearchButton();
    enableScryButton();
    hideDeckSearchArea();
    updateUntapAllButtonVisibility();
    updateLifeDisplay(); // Display initial life
  }

  /**
   * Draws the next card from the library and adds it to the hand.
   */
  function drawNextCard() {
    if (currentLibrary.length === 0) {
      updateTestStatus("Cannot draw: Library is empty.");
      disableDrawNextButton();
      disableShuffleButton();
      disableSearchButton();
      disableScryButton();
      return;
    }
    const nextCard = currentLibrary.shift();
    currentHand.push({
      handId: `h-${handCardIdCounter++}`,
      name: nextCard.name,
      imageUrl: nextCard.imageUrl,
      normalImageUrl: nextCard.normalImageUrl,
    });
    displayHand();
    updateTestStatus(`Drew ${escapeHtml(nextCard.name)}.`);

    // If library search is open, refresh it
    if ($deckSearchArea.is(":visible")) {
      displayLibraryForSearch();
    }
    updateTestStatus(); // Update counts and button states
  }

  /**
   * Shuffles the current library.
   */
  function shuffleLibrary() {
    if (currentLibrary.length > 1) {
      shuffleArray(currentLibrary);
      updateTestStatus("Library shuffled.");
      // If library search is open, refresh it
      if ($deckSearchArea.is(":visible")) {
        displayLibraryForSearch();
      }
    } else {
      updateTestStatus("Cannot shuffle: Library has 1 or 0 cards.");
    }
  }

  /* --- Button State Management --- */
  function enableDrawNextButton() {
    $drawNextCardButton.prop(
      "disabled",
      currentLibrary.length === 0 || scryingState.active
    );
  }
  function disableDrawNextButton() {
    $drawNextCardButton.prop("disabled", true);
  }
  function enableShuffleButton() {
    $shuffleDeckButton.prop(
      "disabled",
      currentLibrary.length <= 1 || scryingState.active
    );
  }
  function disableShuffleButton() {
    $shuffleDeckButton.prop("disabled", true);
  }
  function enableSearchButton() {
    $searchDeckButton.prop(
      "disabled",
      currentLibrary.length === 0 || scryingState.active
    );
  }
  function disableSearchButton() {
    $searchDeckButton.prop("disabled", true);
  }
  function enableScryButton() {
    const libraryAvailable = currentLibrary.length > 0;
    $scryButton.prop("disabled", !libraryAvailable || scryingState.active);
    $scryCountInput.prop("disabled", !libraryAvailable || scryingState.active);
    if (libraryAvailable) {
      $scryCountInput.prop("max", currentLibrary.length);
    } else {
      $scryCountInput.prop("max", 1);
    }
  }
  function disableScryButton() {
    $scryButton.prop("disabled", true);
    $scryCountInput.prop("disabled", true);
  }

  /**
   * Resets the entire test area state (hand, battlefield, library, etc.) and UI.
   * Resets life total.
   */
  function clearTestArea() {
    currentHand = [];
    currentBattlefield = {};
    currentLibrary = [];
    currentGraveyard = [];
    currentExile = [];
    currentPlayerLife = STARTING_LIFE_TOTAL; // Reset life on clear
    handCardIdCounter = 0;
    battlefieldCardIdCounter = 0;
    graveyardCardIdCounter = 0;
    exileCardIdCounter = 0;
    dragInfo = {
      cardId: null,
      sourceZone: null,
      offsetX: 0,
      offsetY: 0,
      element: null,
    };

    // Clear UI elements safely using jQuery
    $testHandContainer.empty();
    $generalZone.children().not("h4").remove();
    $graveyardZone.children().not("h4").remove();
    $exileZone.children().not("h4").remove();

    $testHandStatus.text("");
    $graveyardCountSpan.text("0");
    $exileCountSpan.text("0");

    disableDrawNextButton();
    disableShuffleButton();
    disableSearchButton();
    disableScryButton();
    hideDeckSearchArea();
    hideContextMenu();
    hideCardViewPopup();
    hideResultPopup();
    hideImportDeckPopup(); // Also hide import popup
    cancelScry(); // Ensure any active scry is cancelled
    updateUntapAllButtonVisibility();
    updateLifeDisplay(); // Update life display after reset
  }

  /**
   * Handles clicking a card in the hand to play it to the battlefield.
   * Using jQuery event object.
   * @param {jQuery.Event} event - The click event object.
   */
  function handlePlayCardFromHand(event) {
    // jQuery doesn't have event.detail like vanilla JS for dblclick detection
    // Click handler should generally just handle single clicks.
    // Double-click is handled by a separate 'dblclick' listener.

    const $cardDiv = $(event.currentTarget); // The element the listener was attached to
    const handId = $cardDiv.attr("data-hand-id");
    const cardIndex = currentHand.findIndex((card) => card.handId === handId);

    if (cardIndex > -1) {
      const [cardToPlay] = currentHand.splice(cardIndex, 1);
      const battlefieldId = `bf-${battlefieldCardIdCounter++}`;
      // Place card near top-left with slight random offset
      const initialX = 10 + Math.floor(Math.random() * 10);
      const initialY = 10 + Math.floor(Math.random() * 10);

      currentBattlefield[battlefieldId] = {
        name: cardToPlay.name,
        imageUrl: cardToPlay.imageUrl,
        normalImageUrl: cardToPlay.normalImageUrl,
        zone: "general",
        isTapped: false,
        x: initialX,
        y: initialY,
        counters: { plusOne: 0, minusOne: 0 },
      };
      displayHand();
      displayBattlefield();
      updateTestStatus(`Played ${escapeHtml(cardToPlay.name)}.`);
    }
  }

  /* --- Drag and Drop Functionality --- */
  // NOTE: Drag and drop event properties (like dataTransfer) are part of the
  // native event object. jQuery wraps the native event, but you often need
  // to access the original event for dataTransfer. Use `event.originalEvent`.

  /**
   * Handles the start of dragging a card from the hand.
   * @param {jQuery.Event} event - The dragstart event object.
   */
  function handleHandDragStart(event) {
    if (scryingState.active) {
      event.preventDefault();
      return;
    }
    const $cardElement = $(event.currentTarget);
    const handId = $cardElement.attr("data-hand-id");
    const cardIndex = currentHand.findIndex((card) => card.handId === handId);

    if (cardIndex > -1) {
      dragInfo.cardId = handId;
      dragInfo.sourceZone = "hand";
      dragInfo.element = $cardElement; // Store the jQuery element

      // Access originalEvent for dataTransfer
      event.originalEvent.dataTransfer.setData("text/plain", handId);
      event.originalEvent.dataTransfer.effectAllowed = "move";

      // Add dragging class slightly later for visual feedback
      setTimeout(() => {
        $cardElement.addClass("dragging");
      }, 0);
      event.stopPropagation();
      hideContextMenu();
      hideCardViewPopup();
      hideResultPopup();
    } else {
      event.preventDefault(); // Prevent dragging if card not found
    }
  }

  /**
   * Handles the start of dragging a card from the battlefield.
   * Calculates the correct offset, accounting for tapped rotation.
   * @param {jQuery.Event} event - The dragstart event object.
   */
  function handleBattlefieldDragStart(event) {
    if (scryingState.active) {
      event.preventDefault();
      return;
    }
    const $cardElement = $(event.currentTarget); // Listener attached directly to .battlefield-card
    const cardId = $cardElement.attr("data-battlefield-id");
    if (!cardId) return;

    if (
      !currentBattlefield[cardId] ||
      currentBattlefield[cardId].zone !== "general"
    ) {
      event.preventDefault(); // Prevent dragging if card not found or not in general zone
      return;
    }

    dragInfo.cardId = cardId;
    dragInfo.sourceZone = "battlefield";
    dragInfo.element = $cardElement; // Store jQuery element
    const rect = event.currentTarget.getBoundingClientRect(); // Use native element for rect
    const isTapped = currentBattlefield[cardId].isTapped;
    const clientX = event.originalEvent.clientX; // Use original event for coordinates
    const clientY = event.originalEvent.clientY;

    // Calculate offset relative to the card's top-left corner, considering rotation
    if (isTapped) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // Vector from center to click point
      const rotatedOffsetX = clientX - centerX;
      const rotatedOffsetY = clientY - centerY;
      // Distance and angle from center
      const clickDist = Math.sqrt(rotatedOffsetX ** 2 + rotatedOffsetY ** 2);
      const clickAngle = Math.atan2(rotatedOffsetY, rotatedOffsetX);
      // Rotate click point back 90 degrees clockwise to find original relative position
      const originalAngle = clickAngle + Math.PI / 2;
      const originalOffsetX = clickDist * Math.cos(originalAngle);
      const originalOffsetY = clickDist * Math.sin(originalAngle);
      // Calculate offset from top-left of the *untapped* card dimensions
      const untapppedWidth = rect.height; // Swapped dimensions
      const untapppedHeight = rect.width;
      dragInfo.offsetX = untapppedWidth / 2 + originalOffsetX;
      dragInfo.offsetY = untapppedHeight / 2 + originalOffsetY;
    } else {
      // Simple offset for untapped cards
      dragInfo.offsetX = clientX - rect.left;
      dragInfo.offsetY = clientY - rect.top;
    }

    event.originalEvent.dataTransfer.setData("text/plain", cardId);
    event.originalEvent.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      $cardElement.addClass("dragging");
    }, 0);
    event.stopPropagation();
    hideContextMenu();
    hideCardViewPopup();
    hideResultPopup();
  }

  /**
   * Handles the end of any drag operation (cleans up state and visuals).
   * @param {jQuery.Event} event - The dragend event object.
   */
  function handleDragEnd(event) {
    // Clear visual feedback (dragging class, shifting classes)
    if (dragInfo.element) {
      dragInfo.element.removeClass("dragging"); // Use jQuery object if stored
    }
    // Remove shifting classes from all hand cards
    $testHandContainer.find(".hand-card").removeClass("shift-left shift-right");

    // Reset drag info
    dragInfo = {
      cardId: null,
      sourceZone: null,
      offsetX: 0,
      offsetY: 0,
      element: null,
    };
  }

  /**
   * Handles the dragover event on drop zones (allows dropping).
   * @param {jQuery.Event} event - The dragover event object.
   */
  function handleDragOver(event) {
    event.preventDefault(); // Necessary to allow dropping
    // Access originalEvent for dataTransfer
    event.originalEvent.dataTransfer.dropEffect = "move";
  }

  /**
   * Finds the element being hovered over during hand reordering.
   * @param {jQuery} container - jQuery object for the hand container.
   * @param {number} x - ClientX coordinate from the event.
   * @returns {Element | null} The DOM element after which to insert, or null.
   */
  function getHandDragAfterElement(container, x) {
    // Get draggable elements *not* being dragged
    const $draggableElements = container.find(".hand-card:not(.dragging)");
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

    $draggableElements.each(function () {
      const box = this.getBoundingClientRect(); // Use DOM element for rect
      const offset = x - box.left - box.width / 2; // Find midpoint of card
      if (offset < 0 && offset > closest.offset) {
        closest = { offset: offset, element: this };
      }
    });
    return closest.element; // Return the DOM element
  }

  /**
   * Handles drag over the hand container for reordering.
   * @param {jQuery.Event} event
   */
  function handleHandDragOver(event) {
    event.preventDefault();
    event.originalEvent.dataTransfer.dropEffect = "move"; // Indicate valid drop target

    if (!dragInfo.element || dragInfo.sourceZone !== "hand") {
      return; // Only handle hand-to-hand drags
    }

    const afterElement = getHandDragAfterElement(
      $testHandContainer,
      event.originalEvent.clientX
    );
    const $draggableElements = $testHandContainer.find(
      ".hand-card:not(.dragging)"
    );

    $draggableElements.removeClass("shift-left shift-right");

    if (afterElement == null) {
      // If dragging past the end, shift the last element
      $draggableElements.last().addClass("shift-left");
    } else {
      // Shift the element we're inserting before
      $(afterElement).addClass("shift-right");
    }
  }

  /**
   * Handles drag leave from the hand container.
   * @param {jQuery.Event} event
   */
  function handleHandDragLeave(event) {
    // If the mouse leaves the container, remove shifting classes
    if (event.currentTarget === event.target) {
      // Check if leaving the container itself
      $testHandContainer
        .find(".hand-card")
        .removeClass("shift-left shift-right");
    }
  }

  /**
   * Handles dropping a card onto the hand container for reordering.
   * @param {jQuery.Event} event
   */
  function handleHandDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    if (dragInfo.sourceZone !== "hand" || !dragInfo.cardId) {
      console.warn("Attempted to drop non-hand card into hand?");
      handleDragEnd(event); // Clean up potential visuals if drag ended here
      return; // Only allow hand-to-hand drops here
    }

    const draggedHandId = dragInfo.cardId;
    const draggedCardIndex = currentHand.findIndex(
      (c) => c.handId === draggedHandId
    );

    if (draggedCardIndex === -1) {
      console.error("Could not find dragged card in currentHand array.");
      handleDragEnd(event); // Clean up visuals
      return;
    }

    // Remove the card from its original position in the array
    const [draggedCardData] = currentHand.splice(draggedCardIndex, 1);

    // Find where to insert it
    const afterElement = getHandDragAfterElement(
      $testHandContainer,
      event.originalEvent.clientX
    );

    if (afterElement == null) {
      // Dropped at the end
      currentHand.push(draggedCardData);
    } else {
      // Dropped before 'afterElement'
      const afterElementId = $(afterElement).attr("data-hand-id");
      const targetIndex = currentHand.findIndex(
        (c) => c.handId === afterElementId
      );
      if (targetIndex !== -1) {
        currentHand.splice(targetIndex, 0, draggedCardData);
      } else {
        // Fallback: add to end if target index not found
        console.warn(
          "Target element for drop not found in array, adding to end."
        );
        currentHand.push(draggedCardData);
      }
    }

    // Clean up shift classes explicitly before re-rendering
    $testHandContainer.find(".hand-card").removeClass("shift-left shift-right");

    // Re-render the hand with the new order
    displayHand();
    updateTestStatus("Reordered hand.");

    // Full cleanup happens in handleDragEnd which fires *after* drop
  }

  /**
   * Handles the drop event on valid drop zones (battlefield, graveyard, exile).
   * Moves the card between zones based on the source and target.
   * Skips if drop target is hand (handled by handleHandDrop).
   * @param {jQuery.Event} event - The drop event object.
   */
  function handleDrop(event) {
    const $targetZoneElement = $(event.currentTarget);
    const dropZoneId = $targetZoneElement.attr("id");

    // Ignore drops onto the hand container itself (handled by handleHandDrop)
    if (dropZoneId === "testHandContainer") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    hideContextMenu();
    hideCardViewPopup();
    hideResultPopup();

    const draggedCardId = dragInfo.cardId;
    const sourceZone = dragInfo.sourceZone;

    if (!draggedCardId || !sourceZone) return; // No valid drag info

    /* --- Drop on Graveyard or Exile --- */
    if (dropZoneId === "graveyardZone" || dropZoneId === "exileZone") {
      let cardData = null;
      let cardRemoved = false;

      // Remove card from source zone
      if (sourceZone === "battlefield" && currentBattlefield[draggedCardId]) {
        cardData = { ...currentBattlefield[draggedCardId] };
        delete currentBattlefield[draggedCardId];
        cardRemoved = true;
      } else if (sourceZone === "hand") {
        const index = currentHand.findIndex((c) => c.handId === draggedCardId);
        if (index > -1) {
          [cardData] = currentHand.splice(index, 1);
          cardRemoved = true;
        }
      }

      // Add card to target zone
      if (cardRemoved && cardData) {
        // Clean up properties not needed in side zones
        delete cardData.x;
        delete cardData.y;
        delete cardData.zone;
        delete cardData.isTapped;
        delete cardData.counters;
        delete cardData.handId; // Remove handId if it came from hand
        delete cardData.battlefieldId; // Remove battlefieldId if it came from battlefield

        if (dropZoneId === "graveyardZone") {
          cardData.gyId = `gy-${graveyardCardIdCounter++}`;
          currentGraveyard.push(cardData);
          updateTestStatus(`Moved ${escapeHtml(cardData.name)} to Graveyard.`);
        } else {
          // Exile Zone
          cardData.exileId = `ex-${exileCardIdCounter++}`;
          currentExile.push(cardData);
          updateTestStatus(`Moved ${escapeHtml(cardData.name)} to Exile.`);
        }
        // Update UI
        displayBattlefield();
        displayHand();
        displaySideZones();
        updateUntapAllButtonVisibility();
      }
    } else if (dropZoneId === "generalZone") {
      /* --- Drop on Battlefield --- */
      const zoneRect = event.currentTarget.getBoundingClientRect(); // Native element rect
      let cardData = null;
      let cardMoved = false;

      // Card came from Hand
      if (sourceZone === "hand") {
        const cardIndex = currentHand.findIndex(
          (card) => card.handId === draggedCardId
        );
        if (cardIndex > -1) {
          [cardData] = currentHand.splice(cardIndex, 1);
          const battlefieldId = `bf-${battlefieldCardIdCounter++}`;
          const cardWidth = 110; // Approximate battlefield card width
          const cardHeight = 154; // Approximate battlefield card height

          // Calculate drop position relative to the zone, centered under cursor
          let newX =
            event.originalEvent.clientX - zoneRect.left - dragInfo.offsetX;
          let newY =
            event.originalEvent.clientY - zoneRect.top - dragInfo.offsetY;

          // Clamp position within zone boundaries (use jQuery for dimensions if available, else rect)
          const zoneWidth = $targetZoneElement.innerWidth(); // Inner width to account for padding
          const zoneHeight = $targetZoneElement.innerHeight();
          newX = Math.max(0, Math.min(newX, zoneWidth - cardWidth - 5));
          newY = Math.max(0, Math.min(newY, zoneHeight - cardHeight - 5));

          currentBattlefield[battlefieldId] = {
            name: cardData.name,
            imageUrl: cardData.imageUrl,
            normalImageUrl: cardData.normalImageUrl,
            zone: "general",
            isTapped: false,
            x: newX,
            y: newY,
            counters: { plusOne: 0, minusOne: 0 },
          };

          updateTestStatus(`Played ${escapeHtml(cardData.name)} from hand.`);
          cardMoved = true;
          displayHand();
          displayBattlefield(); // Re-render battlefield to include new card
        }
      } else if (
        // Card came from Battlefield (repositioning)
        sourceZone === "battlefield" &&
        currentBattlefield[draggedCardId]
      ) {
        cardData = currentBattlefield[draggedCardId];
        const $cardElement = $generalZone.find(
          `[data-battlefield-id="${draggedCardId}"]`
        );
        if ($cardElement.length) {
          const cardWidth = $cardElement.outerWidth(); // Use jQuery for dimensions
          const cardHeight = $cardElement.outerHeight();

          // Calculate new top-left based on drop point and drag offset
          let newX =
            event.originalEvent.clientX - zoneRect.left - dragInfo.offsetX;
          let newY =
            event.originalEvent.clientY - zoneRect.top - dragInfo.offsetY;

          // Clamp position within zone boundaries
          const zoneWidth = $targetZoneElement.innerWidth();
          const zoneHeight = $targetZoneElement.innerHeight();
          newX = Math.max(0, Math.min(newX, zoneWidth - cardWidth - 5));
          newY = Math.max(0, Math.min(newY, zoneHeight - cardHeight - 5));

          // Update state and element style
          cardData.x = newX;
          cardData.y = newY;
          $cardElement.css({ left: `${newX}px`, top: `${newY}px` });

          updateTestStatus(
            `Moved ${escapeHtml(cardData.name)} on battlefield.`
          );
          cardMoved = true;
          // displayBattlefield(); // Might not be needed if only position changed, but good for consistency
        } else {
          console.error(
            "Could not find dragged battlefield card element on drop."
          );
          displayBattlefield(); // Refresh to ensure consistency
        }
      }

      if (!cardMoved) {
        console.warn(
          "Drop on battlefield failed, card not found in source:",
          sourceZone,
          draggedCardId
        );
        // Refresh UI in case of inconsistent state
        displayBattlefield();
        displayHand();
      }
    } else {
      console.warn("Drop occurred on unexpected element:", dropZoneId);
      // Refresh UI
      displayBattlefield();
      displayHand();
    }

    // Reset drag info *after* drop logic (handled by dragend)
  }

  /* --- Library Search Functionality --- */

  /**
   * Toggles the visibility of the library search area.
   */
  function toggleDeckSearchArea() {
    if (scryingState.active) return; // Don't allow search during scry
    if ($deckSearchArea.is(":hidden")) {
      $deckSearchArea.show();
      displayLibraryForSearch();
      updateTestStatus("Viewing library...");
    } else {
      hideDeckSearchArea();
    }
  }

  /**
   * Hides the library search area and clears its contents.
   */
  function hideDeckSearchArea() {
    $deckSearchArea.hide();
    $deckSearchResults.empty();
    updateTestStatus(); // Reset status message
  }

  /**
   * Displays the contents of the current library in the search area UI, sorted alphabetically.
   */
  function displayLibraryForSearch() {
    $deckSearchResults.empty();
    if (currentLibrary.length === 0) {
      $deckSearchResults.html("<li>Library is empty.</li>");
      return;
    }
    // Sort a copy for display, keep original library order intact
    const sortedLibrary = [...currentLibrary].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    $.each(sortedLibrary, function (index, card) {
      // Find the original index in the unsorted library
      const originalIndex = currentLibrary.findIndex((c) => c === card);
      // Handle potential duplicate object issue (less likely now but good check)
      if (originalIndex === -1 && currentLibrary.includes(card)) {
        console.warn(
          "Potential duplicate card object issue in library search display:",
          card.name
        );
      }

      const displayImageUrl = card.imageUrl || "";
      const normalImageUrl = card.normalImageUrl || displayImageUrl;
      const safeCardName = escapeHtml(card.name);
      const safeDisplayImageUrl = escapeHtml(displayImageUrl);
      const safeNormalImageUrl = escapeHtml(normalImageUrl);

      const $li = $("<li>").addClass("library-search-card");

      const $img = $("<img>")
        .attr("src", safeDisplayImageUrl)
        .attr("alt", safeCardName)
        .attr("title", safeCardName)
        .attr("data-normal-src", safeNormalImageUrl)
        .prop("loading", "lazy");

      // Store necessary data for context menu actions using .data() or .attr()
      // Using .attr() is safer if these values might be used in selectors later
      $li
        .attr("data-library-index", originalIndex)
        .attr("data-cardname", card.name)
        .attr("data-imageurl", card.imageUrl)
        .attr("data-normalimageurl", card.normalImageUrl);

      $li.append($img);
      $deckSearchResults.append($li);
    });
  }

  /* --- Theme Management --- */

  /**
   * Sets the color theme (light/dark) and saves the preference to local storage.
   * @param {'light' | 'dark'} themeName - The name of the theme to apply.
   */
  function setTheme(themeName) {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
    $("body").attr("data-theme", themeName);
    $themeToggle.prop("checked", themeName === "dark");
  }

  /**
   * Toggles the color theme based on the theme switch checkbox state.
   */
  function toggleTheme() {
    setTheme($themeToggle.prop("checked") ? "dark" : "light");
  }

  /**
   * Loads the preferred theme from local storage or detects the system preference.
   */
  function loadTheme() {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    } else if (prefersDark) {
      setTheme("dark");
    } else {
      setTheme("light"); // Default to light
    }
  }

  /* --- Context Menu Functionality --- */

  /**
   * Shows the context menu for a clicked card element.
   * @param {jQuery.Event} event - The contextmenu event object.
   * @param {Element} cardElement - The raw DOM element that was right-clicked.
   */
  function showContextMenu(event, cardElement) {
    const $cardElement = $(cardElement); // Wrap the raw element

    // Prevent context menu during scry unless clicking a scry card
    if (scryingState.active && !$cardElement.hasClass("scry-card-item")) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    hideContextMenu(); // Hide any existing menu
    hideCardViewPopup();
    hideResultPopup();

    let cardId = null;
    let sourceZone = null;
    let cardData = null;
    let libraryIndex = null;
    const cardRect = cardElement.getBoundingClientRect();

    // Determine card source and data based on element class/dataset
    if ($cardElement.hasClass("battlefield-card")) {
      sourceZone = "battlefield";
      cardId = $cardElement.attr("data-battlefield-id");
      if (currentBattlefield[cardId])
        cardData = { ...currentBattlefield[cardId] };
    } else if ($cardElement.hasClass("side-zone-card")) {
      const $parentZone = $cardElement.closest("#graveyardZone, #exileZone");
      if ($parentZone.is("#graveyardZone")) {
        sourceZone = "graveyard";
        cardId = $cardElement.attr("data-gy-id");
        const foundCard = currentGraveyard.find((c) => c.gyId === cardId);
        if (foundCard) cardData = { ...foundCard };
      } else if ($parentZone.is("#exileZone")) {
        sourceZone = "exile";
        cardId = $cardElement.attr("data-exile-id");
        const foundCard = currentExile.find((c) => c.exileId === cardId);
        if (foundCard) cardData = { ...foundCard };
      }
    } else if ($cardElement.hasClass("hand-card")) {
      sourceZone = "hand";
      cardId = $cardElement.attr("data-hand-id");
      const foundCard = currentHand.find((c) => c.handId === cardId);
      if (foundCard) cardData = { ...foundCard };
    } else if ($cardElement.hasClass("library-search-card")) {
      sourceZone = "library";
      libraryIndex = parseInt($cardElement.attr("data-library-index"), 10);
      if (
        !isNaN(libraryIndex) &&
        libraryIndex >= 0 &&
        libraryIndex < currentLibrary.length
      ) {
        // Ensure index is valid before accessing
        if (currentLibrary[libraryIndex]) {
          cardData = { ...currentLibrary[libraryIndex] };
          cardId = `lib-${libraryIndex}`; // Create a temporary ID for context
        } else {
          console.error(
            `Invalid library index access: ${libraryIndex} out of ${currentLibrary.length}`
          );
          return; // Don't show menu if data is inconsistent
        }
      }
    } else if ($cardElement.hasClass("scry-card-item")) {
      sourceZone = "scry";
      cardId = $cardElement.attr("data-scry-temp-id");
      const foundCard = scryingState.cards.find((c) => c.scryTempId === cardId);
      if (foundCard)
        cardData = {
          // Only need basic info for view action
          name: foundCard.name,
          imageUrl: foundCard.imageUrl,
          normalImageUrl: foundCard.normalImageUrl,
        };
    }

    if (!cardId || !sourceZone || !cardData) {
      console.error("Could not identify card for context menu.", cardElement);
      return;
    }

    // Store target info and update menu items
    contextMenuTarget = { cardId, cardData, sourceZone, libraryIndex };
    updateContextMenuItems(sourceZone, cardData);
    positionContextMenu(cardRect);
    $cardContextMenu.show();
    contextMenuVisible = true;
  }

  /**
   * Hides the context menu and resets its target state.
   */
  function hideContextMenu() {
    $cardContextMenu.hide();
    contextMenuVisible = false;
    contextMenuTarget = {
      cardId: null,
      cardData: null,
      sourceZone: null,
      libraryIndex: null,
    };
  }

  /**
   * Positions the context menu near the clicked card, ensuring it stays within the viewport.
   * Adjusts behavior based on fullscreen mode.
   * @param {DOMRect} cardRect - The bounding rectangle of the clicked card element.
   */
  function positionContextMenu(cardRect) {
    const menuWidth = $cardContextMenu.outerWidth();
    const menuHeight = $cardContextMenu.outerHeight();
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    const buffer = 5; // Small buffer from edges
    let idealTop, idealLeft, minLeft, maxLeft, minTop, maxTop;

    if (isFullscreen) {
      // Fullscreen coordinates are relative to viewport
      minLeft = buffer;
      maxLeft = viewportWidth - buffer;
      minTop = buffer;
      maxTop = viewportHeight - buffer;

      // Try placing above the card first
      idealTop = cardRect.top - menuHeight - buffer;
      idealLeft = cardRect.left;

      // If above doesn't fit, place below
      if (idealTop < minTop) {
        idealTop = cardRect.bottom + buffer;
      }
      // If right edge overflows, align right edges
      if (idealLeft + menuWidth > maxLeft) {
        idealLeft = cardRect.right - menuWidth;
      }

      // Clamp within viewport boundaries
      idealLeft = Math.max(minLeft, idealLeft);
      idealTop = Math.max(minTop, idealTop);

      // Final check for bottom/right overflow after adjustments
      if (idealTop + menuHeight > maxTop) {
        idealTop = maxTop - menuHeight;
        idealTop = Math.max(minTop, idealTop); // Ensure it doesn't go off top
      }
      if (idealLeft + menuWidth > maxLeft) {
        idealLeft = maxLeft - menuWidth;
        idealLeft = Math.max(minLeft, idealLeft); // Ensure it doesn't go off left
      }
    } else {
      // Non-fullscreen coordinates need scroll offset
      const scrollX = $(window).scrollLeft();
      const scrollY = $(window).scrollTop();
      minLeft = scrollX + buffer;
      maxLeft = viewportWidth + scrollX - buffer;
      minTop = scrollY + buffer;
      maxTop = viewportHeight + scrollY - buffer;

      // Try placing above the card first
      idealTop = cardRect.top + scrollY - menuHeight - buffer;
      idealLeft = cardRect.left + scrollX;

      // Adjustments similar to fullscreen, but with scroll offsets
      if (idealTop < minTop) {
        idealTop = cardRect.bottom + scrollY + buffer;
      }
      if (idealLeft + menuWidth > maxLeft) {
        idealLeft = cardRect.right + scrollX - menuWidth;
      }

      idealLeft = Math.max(minLeft, idealLeft);
      idealTop = Math.max(minTop, idealTop);

      if (idealTop + menuHeight > maxTop) {
        idealTop = maxTop - menuHeight;
        idealTop = Math.max(minTop, idealTop);
      }
      if (idealLeft + menuWidth > maxLeft) {
        idealLeft = maxLeft - menuWidth;
        idealLeft = Math.max(minLeft, idealLeft);
      }
    }

    $cardContextMenu.css({
      left: `${idealLeft}px`,
      top: `${idealTop}px`,
    });
  }

  /**
   * Updates the context menu items (enabling/disabling/hiding) based on the card's source zone and state.
   * @param {'battlefield' | 'hand' | 'graveyard' | 'exile' | 'library' | 'scry'} sourceZone - The zone the card is currently in.
   * @param {object} cardData - The data object for the card.
   */
  function updateContextMenuItems(sourceZone, cardData) {
    $cardContextMenu.find("li").each(function () {
      const $item = $(this);
      const action = $item.data("action"); // Use jQuery's .data() which gets data-* attributes
      $item.removeClass("disabled hidden");

      // Special handling for Scry zone (only View Card allowed)
      if (sourceZone === "scry") {
        if (action !== "viewCard") {
          $item.addClass("hidden");
        }
        return; // Skip other checks for scry zone
      }

      // Disable moving to the current zone
      if (
        (action === "toBattlefield" && sourceZone === "battlefield") ||
        (action === "toGraveyard" && sourceZone === "graveyard") ||
        (action === "toExile" && sourceZone === "exile") ||
        (action === "toHand" && sourceZone === "hand") ||
        ((action === "toLibraryTop" || action === "toLibraryBottom") &&
          sourceZone === "library")
      ) {
        $item.addClass("disabled");
      }

      // Tap/Untap only for battlefield
      if (action === "toggleTap") {
        if (sourceZone === "battlefield") {
          $item.text(cardData?.isTapped ? "Untap" : "Tap");
        } else {
          $item.addClass("hidden");
        }
      }

      // Counter actions only for battlefield
      if (action?.includes("Counter")) {
        // Check action exists
        if (sourceZone !== "battlefield") {
          $item.addClass("hidden");
        } else {
          // Disable removing counters if none exist
          if (action === "removePlusOneCounter") {
            if (!(cardData?.counters?.plusOne > 0)) {
              $item.addClass("disabled");
            }
          }
          if (action === "removeMinusOneCounter") {
            if (!(cardData?.counters?.minusOne > 0)) {
              $item.addClass("disabled");
            }
          }
        }
      }
    });
  }

  /**
   * Handles clicks on context menu items, performing the selected action.
   * @param {jQuery.Event} event - The click event object.
   */
  function handleContextMenuAction(event) {
    const $targetLi = $(event.target).closest("li");
    // Ensure a valid, enabled menu item was clicked and target data exists
    if (
      !$targetLi.length ||
      $targetLi.hasClass("disabled") ||
      $targetLi.hasClass("hidden") ||
      !contextMenuTarget.cardId
    ) {
      hideContextMenu();
      return;
    }

    const action = $targetLi.data("action");
    const { cardId, cardData, sourceZone, libraryIndex } = contextMenuTarget;

    if (!cardData) {
      console.error("Missing card data for context menu action.");
      hideContextMenu();
      return;
    }

    // --- Handle "View Card" Action ---
    if (action === "viewCard") {
      const imageUrl = cardData.normalImageUrl || cardData.imageUrl;
      showCardViewPopup(imageUrl);
      hideContextMenu();
      return;
    }

    // --- Prevent other actions if source is Scry ---
    if (sourceZone === "scry") {
      hideContextMenu();
      return;
    }

    // --- Handle Tap/Untap Action ---
    if (action === "toggleTap") {
      if (sourceZone === "battlefield" && currentBattlefield[cardId]) {
        const card = currentBattlefield[cardId];
        card.isTapped = !card.isTapped;
        const $cardElement = $generalZone.find(
          `.battlefield-card[data-battlefield-id="${cardId}"]`
        );
        if ($cardElement.length) {
          $cardElement.toggleClass("tapped", card.isTapped);
          // Adjust position slightly if untapping near edge (due to rotation change)
          if (!card.isTapped) {
            const cardWidth = $cardElement.outerWidth();
            const cardHeight = $cardElement.outerHeight();
            let currentX = parseFloat($cardElement.css("left"));
            let currentY = parseFloat($cardElement.css("top"));
            let newX = Math.max(
              0,
              Math.min(currentX, $generalZone.innerWidth() - cardWidth - 5)
            );
            let newY = Math.max(
              0,
              Math.min(currentY, $generalZone.innerHeight() - cardHeight - 5)
            );
            if (newX !== currentX || newY !== currentY) {
              $cardElement.css({ left: `${newX}px`, top: `${newY}px` });
              card.x = newX;
              card.y = newY;
            }
          }
        }
        updateTestStatus(
          `${card.isTapped ? "Tapped" : "Untapped"} ${escapeHtml(
            cardData.name
          )}.`
        );
        updateUntapAllButtonVisibility();
      } else {
        console.error(
          "Cannot toggle tap: Card not found on battlefield or invalid zone."
        );
      }
      hideContextMenu();
      return; // Tap action finished
    }

    // --- Handle Counter Actions ---
    if (action?.includes("Counter")) {
      if (sourceZone === "battlefield" && currentBattlefield[cardId]) {
        const card = currentBattlefield[cardId];
        if (!card.counters) card.counters = { plusOne: 0, minusOne: 0 };
        let statusMsg = "";

        switch (action) {
          case "addPlusOneCounter":
            card.counters.plusOne++;
            statusMsg = `Added +1/+1 counter to ${escapeHtml(cardData.name)}.`;
            break;
          case "removePlusOneCounter":
            if (card.counters.plusOne > 0) {
              card.counters.plusOne--;
              statusMsg = `Removed +1/+1 counter from ${escapeHtml(
                cardData.name
              )}.`;
            } else {
              statusMsg = `No +1/+1 counters to remove from ${escapeHtml(
                cardData.name
              )}.`;
            }
            break;
          case "addMinusOneCounter":
            card.counters.minusOne++;
            statusMsg = `Added -1/-1 counter to ${escapeHtml(cardData.name)}.`;
            break;
          case "removeMinusOneCounter":
            if (card.counters.minusOne > 0) {
              card.counters.minusOne--;
              statusMsg = `Removed -1/-1 counter from ${escapeHtml(
                cardData.name
              )}.`;
            } else {
              statusMsg = `No -1/-1 counters to remove from ${escapeHtml(
                cardData.name
              )}.`;
            }
            break;
        }

        // Update counter display on the card element
        const $cardElement = $generalZone.find(
          `.battlefield-card[data-battlefield-id="${cardId}"]`
        );
        if ($cardElement.length) {
          updateCardCountersDisplay($cardElement, card.counters);
        }
        updateTestStatus(statusMsg);
      } else {
        console.error("Cannot modify counters: Card not on battlefield.");
      }
      hideContextMenu();
      return; // Counter action finished
    }

    // --- Handle Zone Change Actions ---
    let cardRemoved = false;
    let cardToMove = null;
    let statusMsg = "";

    // 1. Remove card from source zone
    if (sourceZone === "battlefield") {
      if (currentBattlefield[cardId]) {
        cardToMove = { ...currentBattlefield[cardId] };
        delete currentBattlefield[cardId];
        cardRemoved = true;
      }
    } else if (sourceZone === "graveyard") {
      const index = currentGraveyard.findIndex((c) => c.gyId === cardId);
      if (index > -1) {
        [cardToMove] = currentGraveyard.splice(index, 1);
        cardRemoved = true;
      }
    } else if (sourceZone === "exile") {
      const index = currentExile.findIndex((c) => c.exileId === cardId);
      if (index > -1) {
        [cardToMove] = currentExile.splice(index, 1);
        cardRemoved = true;
      }
    } else if (sourceZone === "hand") {
      const index = currentHand.findIndex((c) => c.handId === cardId);
      if (index > -1) {
        [cardToMove] = currentHand.splice(index, 1);
        cardRemoved = true;
      }
    } else if (sourceZone === "library") {
      if (
        libraryIndex !== null &&
        libraryIndex >= 0 &&
        libraryIndex < currentLibrary.length
      ) {
        if (currentLibrary[libraryIndex]) {
          [cardToMove] = currentLibrary.splice(libraryIndex, 1);
          cardRemoved = true;
        } else {
          console.error(
            `Context menu action error: Invalid library index access: ${libraryIndex} out of ${currentLibrary.length}`
          );
        }
      }
    }

    // If removal failed, stop
    if (!cardRemoved || !cardToMove) {
      console.error(
        "Failed to remove card from source zone:",
        sourceZone,
        cardId,
        libraryIndex
      );
      hideContextMenu();
      if ($deckSearchArea.is(":visible")) {
        displayLibraryForSearch(); // Refresh search if open
      }
      updateTestStatus();
      return;
    }

    // 2. Prepare card data for the new zone (remove irrelevant properties)
    const cleanCardData = {
      name: cardToMove.name,
      imageUrl: cardToMove.imageUrl,
      normalImageUrl: cardToMove.normalImageUrl,
    };
    statusMsg = `Moved ${escapeHtml(cleanCardData.name)}`;
    let libraryAction = false; // Flag if library was modified

    // 3. Add card to the destination zone
    switch (action) {
      case "toHand":
        cleanCardData.handId = `h-${handCardIdCounter++}`;
        currentHand.push(cleanCardData);
        statusMsg += " to Hand.";
        break;
      case "toBattlefield":
        const bfId = `bf-${battlefieldCardIdCounter++}`;
        cleanCardData.x = 10 + Math.floor(Math.random() * 10);
        cleanCardData.y = 10 + Math.floor(Math.random() * 10);
        cleanCardData.zone = "general";
        cleanCardData.isTapped = false;
        cleanCardData.counters = { plusOne: 0, minusOne: 0 };
        currentBattlefield[bfId] = cleanCardData;
        statusMsg += " to Battlefield.";
        break;
      case "toGraveyard":
        cleanCardData.gyId = `gy-${graveyardCardIdCounter++}`;
        currentGraveyard.push(cleanCardData);
        statusMsg += " to Graveyard.";
        break;
      case "toExile":
        cleanCardData.exileId = `ex-${exileCardIdCounter++}`;
        currentExile.push(cleanCardData);
        statusMsg += " to Exile.";
        break;
      case "toLibraryTop":
        currentLibrary.unshift(cleanCardData);
        statusMsg += " to top of Library.";
        libraryAction = true;
        break;
      case "toLibraryBottom":
        currentLibrary.push(cleanCardData);
        statusMsg += " to bottom of Library.";
        libraryAction = true;
        break;
      default:
        // Should not happen, but handle defensively
        console.warn("Unknown context menu action:", action);
        statusMsg = `Error processing action for ${escapeHtml(
          cleanCardData.name
        )}.`;
        // Attempt to revert by putting the card back
        if (sourceZone === "library" && libraryIndex !== null) {
          currentLibrary.splice(libraryIndex, 0, cardToMove);
        } else if (sourceZone === "hand") {
          currentHand.push(cardToMove); // Simplest revert
        } else if (sourceZone === "battlefield") {
          currentBattlefield[cardId] = cardToMove;
        } else if (sourceZone === "graveyard") {
          currentGraveyard.push(cardToMove);
        } else if (sourceZone === "exile") {
          currentExile.push(cardToMove);
        } else {
          console.error(
            "Reverting action failed, card may be lost from test area."
          );
        }
        break;
    }

    // 4. Update UI
    displayBattlefield();
    displaySideZones();
    displayHand();
    updateTestStatus(statusMsg);

    // Refresh library search if it was involved or is open
    if (
      (libraryAction || sourceZone === "library") &&
      $deckSearchArea.is(":visible")
    ) {
      displayLibraryForSearch();
    }
    // Update library-dependent button states
    if (libraryAction || sourceZone === "library") {
      enableDrawNextButton();
      enableShuffleButton();
      enableSearchButton();
      enableScryButton();
    }
    updateUntapAllButtonVisibility();
    hideContextMenu();
  }

  /* --- Popups (Card View, Result) --- */

  /**
   * Shows the large card view popup.
   * @param {string} imageUrl - The URL of the card image (preferably normal size).
   */
  function showCardViewPopup(imageUrl) {
    if (!imageUrl) {
      console.warn("Cannot show card view: No image URL provided.");
      return;
    }
    hideResultPopup(); // Close other popups
    hideImportDeckPopup();
    // Attempt to get normal size image if small was provided
    const normalImageUrl = imageUrl.includes("?")
      ? imageUrl.split("?")[0]
      : imageUrl;
    $cardViewImage
      .attr("src", normalImageUrl.replace("small", "normal"))
      .attr("alt", "Card Image");
    $cardViewPopupOverlay.css("display", "flex"); // Use flex display
  }

  /**
   * Hides the large card view popup.
   */
  function hideCardViewPopup() {
    $cardViewPopupOverlay.hide();
    $cardViewImage.attr("src", "").attr("alt", "");
  }

  /**
   * Shows a simple popup for results like coin flips or die rolls.
   * @param {string} message - The message to display in the popup.
   */
  function showResultPopup(message) {
    hideContextMenu(); // Close other overlays
    hideCardViewPopup();
    hideImportDeckPopup();
    $resultPopupText.text(message);
    $resultPopupOverlay.css("display", "flex"); // Use flex display
  }

  /**
   * Hides the result popup.
   */
  function hideResultPopup() {
    $resultPopupOverlay.hide();
    $resultPopupText.text("");
  }

  /* --- Scry Functionality --- */

  /**
   * Initiates the Scry process. Takes cards from the library and displays them in the Scry modal.
   */
  function handleScry() {
    if (scryingState.active) return; // Already scrying
    const count = parseInt($scryCountInput.val(), 10);
    if (isNaN(count) || count <= 0) {
      updateTestStatus("Invalid scry amount.");
      return;
    }
    const actualCount = Math.min(count, currentLibrary.length);
    if (actualCount === 0) {
      updateTestStatus("Library is empty, cannot scry.");
      return;
    }

    // Initialize scry state
    scryingState.active = true;
    scryingState.cards = [];
    scryingState.expectedCount = actualCount;
    scryingState.resolvedCount = 0;
    scryingState.toBottom = [];

    // Move cards from library to scry state
    for (let i = 0; i < actualCount; i++) {
      const card = currentLibrary.shift();
      if (card) {
        card.scryTempId = `scry-${i}`; // Add temporary ID for tracking
        scryingState.cards.push(card);
      } else {
        console.error("Attempted to scry undefined card from library.");
        scryingState.expectedCount--; // Adjust count if card was invalid
      }
    }

    if (scryingState.expectedCount <= 0) {
      console.warn("No valid cards found to scry.");
      cancelScry(); // Clean up state
      return;
    }

    // Disable other actions during scry
    disableDrawNextButton();
    disableShuffleButton();
    disableSearchButton();
    disableScryButton();
    $untapAllButton.prop("disabled", true);

    displayScryModal(scryingState.expectedCount);
    updateTestStatus(
      `Scrying ${scryingState.expectedCount} cards... Choose Top or Bottom for each.`
    );
  }

  /**
   * Displays the Scry modal UI with the cards to be resolved.
   * @param {number} count - The number of cards being scryed.
   */
  function displayScryModal(count) {
    $scryModalTitle.text(`Scry ${count}`);
    $scryCardContainer.empty();

    $.each(scryingState.cards, function (index, card) {
      const safeImgUrl = escapeHtml(card.imageUrl || "");
      const safeName = escapeHtml(card.name);
      const safeNormalUrl = escapeHtml(
        card.normalImageUrl || card.imageUrl || ""
      );

      const $cardDiv = $("<div>")
        .addClass("scry-card-item")
        .attr("data-scry-temp-id", card.scryTempId);

      const $img = $("<img>")
        .attr("src", safeImgUrl)
        .attr("alt", safeName)
        .attr("title", safeName)
        .attr("data-normal-src", safeNormalUrl);

      const $buttonDiv = $("<div>").addClass("scry-choice-buttons");

      const $topButton = $("<button>").text("Top").attr("data-choice", "top");
      // Note: Event listeners for buttons are added via delegation later

      const $bottomButton = $("<button>")
        .text("Bottom")
        .attr("data-choice", "bottom");

      $buttonDiv.append($topButton, $bottomButton);
      $cardDiv.append($img, $buttonDiv);

      // Allow context menu (for View Card) on scry items
      // Context menu listener is already delegated to document

      $scryCardContainer.append($cardDiv);
    });

    $scryOverlay.css("display", "flex"); // Use flex display
  }

  /**
   * Handles the user's choice (Top or Bottom) for a single card during Scry.
   * Uses event delegation.
   * @param {jQuery.Event} event - The click event from the Top/Bottom button.
   */
  function handleScryChoice(event) {
    if (!scryingState.active) return;
    hideContextMenu(); // Close context menu if open

    const $button = $(event.currentTarget); // The button that was clicked
    const choice = $button.data("choice");
    const $cardItem = $button.closest(".scry-card-item");
    const scryTempId = $cardItem.attr("data-scry-temp-id");

    const cardIndex = scryingState.cards.findIndex(
      (c) => c.scryTempId === scryTempId
    );
    if (cardIndex === -1) {
      console.error("Could not find scry card data for ID:", scryTempId);
      return;
    }

    // Remove card from the active scry list
    const [cardData] = scryingState.cards.splice(cardIndex, 1);
    delete cardData.scryTempId; // Remove temporary ID

    let actionMsg = "";
    if (choice === "top") {
      // Put card back on top of library immediately
      currentLibrary.unshift(cardData);
      actionMsg = `Keeping ${escapeHtml(cardData.name)} on top.`;
    } else {
      // Add card to a temporary 'bottom' list
      scryingState.toBottom.push(cardData);
      actionMsg = `Moving ${escapeHtml(cardData.name)} to bottom.`;
    }

    $cardItem.remove(); // Remove the resolved card from the modal
    updateTestStatus(actionMsg);

    scryingState.resolvedCount++;

    // Check if all cards have been resolved
    if (scryingState.resolvedCount === scryingState.expectedCount) {
      // Add all cards marked for bottom to the actual bottom of the library
      currentLibrary.push(...scryingState.toBottom);
      scryingState.toBottom = []; // Clear temporary list
      endScrySession();
    }
  }

  /**
   * Cleans up the Scry state and UI after the operation is complete or cancelled.
   */
  function endScrySession() {
    const wasActive = scryingState.active;
    hideContextMenu();
    // Reset scry state
    scryingState.active = false;
    scryingState.cards = [];
    scryingState.toBottom = [];
    scryingState.expectedCount = 0;
    scryingState.resolvedCount = 0;

    // Hide modal and clear its content
    $scryOverlay.hide();
    $scryCardContainer.empty();

    // Re-enable buttons
    enableDrawNextButton();
    enableShuffleButton();
    enableSearchButton();
    enableScryButton();
    $untapAllButton.prop("disabled", false);

    // Update status message
    if (wasActive) {
      let currentStatus = $testHandStatus.text() || "";
      // Clean up intermediate scry messages
      currentStatus = currentStatus
        .replace(/Scrying.*Choose.*|Keeping.*top\.|Moving.*bottom\./g, "")
        .trim();
      updateTestStatus(currentStatus + " Scry finished.");
    } else {
      updateTestStatus(); // General update if cancelled before starting
    }

    // Refresh library search if open
    if ($deckSearchArea.is(":visible")) {
      displayLibraryForSearch();
    }
  }

  /**
   * Cancels an ongoing Scry operation, returning all involved cards to the top of the library.
   */
  function cancelScry() {
    if (scryingState.active) {
      hideContextMenu();
      // Gather all cards currently in scry state or marked for bottom
      const cardsToReturn = [...scryingState.cards, ...scryingState.toBottom];
      cardsToReturn.forEach((card) => delete card.scryTempId); // Clean up temp IDs
      // Return all cards to the top of the library
      currentLibrary.unshift(...cardsToReturn);

      updateTestStatus("Scry cancelled. Cards returned to library.");
      endScrySession(); // Clean up state and UI
    }
  }

  /* --- Import Deck Functionality --- */

  /**
   * Shows the import deck popup modal.
   */
  function showImportDeckPopup() {
    $importDeckNameInput.val("");
    $importDeckListTextarea.val("");
    updateImportStatus(""); // Clear status
    $saveImportedDeckButton.prop("disabled", false); // Re-enable button
    isImporting = false; // Reset flag
    if (importCardDataRequest) {
      importCardDataRequest.abort(); // Abort any ongoing fetch
      importCardDataRequest = null;
    }
    $importDeckPopupOverlay.css("display", "flex"); // Use flex
    $importDeckNameInput.trigger("focus"); // Use trigger to focus
    hideResultPopup();
    hideCardViewPopup();
    hideContextMenu();
  }

  /**
   * Hides the import deck popup modal.
   */
  function hideImportDeckPopup() {
    if (importCardDataRequest) {
      importCardDataRequest.abort(); // Abort fetch if popup is closed
      importCardDataRequest = null;
    }
    $importDeckPopupOverlay.hide();
    updateImportStatus(""); // Clear status on close
  }

  /**
   * Parses decklist text into card names and quantities.
   * Supports formats like "4x Card Name" or "4 Card Name".
   * Ignores lines that look like category headers (e.g., "Creature (20)").
   * Ignores comments starting with //
   * @param {string} decklistText - The raw text from the textarea.
   * @returns {{ deck: { [cardName: string]: number }, errors: string[] }}
   */
  function parseDecklist(decklistText) {
    const lines = decklistText.split("\n");
    const parsedDeck = {};
    const errors = [];
    // Regex to capture "4x Card Name" or "4 Card Name", ignoring leading/trailing spaces and comments
    const lineRegex = /^\s*(\d+)\s*x?\s+([^/]+)(?:\/\/.*)?$/i;
    // Regex to identify category headers like "Creature (20)" or just "Lands"
    const headerRegex = /^\s*([a-zA-Z\s]+)\s*(\(\d+\))?\s*$/;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // Skip empty lines

      // Skip header lines
      if (headerRegex.test(trimmedLine) && !lineRegex.test(trimmedLine)) {
        const headerMatch = trimmedLine.match(headerRegex);
        if (headerMatch && !/^\d+/.test(trimmedLine)) {
          return;
        }
      }

      const match = trimmedLine.match(lineRegex);

      if (match) {
        const quantity = parseInt(match[1], 10);
        let cardName = match[2].trim().replace(/\s+/g, " ");
        const basicLands = ["Plains", "Island", "Swamp", "Mountain", "Forest"];
        const snowLands = [
          "Snow-Covered Plains",
          "Snow-Covered Island",
          "Snow-Covered Swamp",
          "Snow-Covered Mountain",
          "Snow-Covered Forest",
        ];
        if (!basicLands.includes(cardName)) {
          const lowerCaseName = cardName.toLowerCase();
          const matchedSnowLand = snowLands.find(
            (snowName) => snowName.toLowerCase() === lowerCaseName
          );
          if (matchedSnowLand) {
            cardName = matchedSnowLand;
          }
        }

        if (!isNaN(quantity) && quantity > 0 && cardName) {
          parsedDeck[cardName] = (parsedDeck[cardName] || 0) + quantity;
        } else {
          errors.push(
            `Invalid format on line ${index + 1}: "${escapeHtml(trimmedLine)}"`
          );
        }
      } else {
        if (!headerRegex.test(trimmedLine) || /^\d+/.test(trimmedLine)) {
          errors.push(
            `Could not parse line ${index + 1}: "${escapeHtml(trimmedLine)}"`
          );
        }
      }
    });

    return { deck: parsedDeck, errors };
  }

  /**
   * Fetches card data (image URLs) from Scryfall for a list of card names/quantities.
   * Uses the /cards/collection endpoint for efficiency.
   * Returns a Promise that resolves with the data or rejects on error.
   * @param {{ [cardName: string]: number }} parsedQuantities - Object of card names and quantities.
   * @returns {Promise<{ importedDeckData: { [cardName: string]: { quantity: number, imageUrl: string, normalImageUrl: string } }, fetchErrors: string[] }>}
   */
  async function fetchCardDataForParsedDeck(parsedQuantities) {
    const importedDeckData = {};
    const fetchErrors = [];
    const cardNames = Object.keys(parsedQuantities);

    if (cardNames.length === 0) {
      return { importedDeckData, fetchErrors };
    }

    updateImportStatus("Fetching card data from Scryfall...", "info");
    $saveImportedDeckButton.prop("disabled", true); // Disable save while fetching

    // Prepare identifiers for Scryfall API
    const identifiers = cardNames.map((name) => ({ name }));
    const allFetches = []; // Array to hold promises for each chunk

    try {
      const chunkSize = 75;
      for (let i = 0; i < identifiers.length; i += chunkSize) {
        const chunk = identifiers.slice(i, i + chunkSize);
        await sleep(SCRYFALL_API_DELAY); // Politeness delay before each request

        // Create a promise for each chunk request
        const fetchPromise = new Promise((resolve, reject) => {
          // Store the jqXHR object
          importCardDataRequest = $.ajax({
            url: "https://api.scryfall.com/cards/collection",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ identifiers: chunk }),
            dataType: "json",
            timeout: 15000, // 15 second timeout per chunk
          })
            .done(function (data) {
              resolve({ data, chunk }); // Resolve with data and the request chunk
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
              if (textStatus !== "abort") {
                console.error("Chunk Fetch Error:", textStatus, errorThrown);
                reject({
                  // Reject with error details and chunk
                  status: jqXHR.status,
                  statusText: jqXHR.statusText,
                  error: errorThrown || textStatus,
                  chunk,
                });
              } else {
                console.log("Import card data fetch aborted.");
                // Don't reject on abort, just resolve with no data
                resolve({ data: { data: [], not_found: [] }, chunk });
              }
            })
            .always(function () {
              // Only nullify the request reference if this *specific* request finished
              if (
                importCardDataRequest &&
                importCardDataRequest.readyState === 4
              ) {
                importCardDataRequest = null;
              }
            });
        });
        allFetches.push(fetchPromise);
      } // End chunk loop

      // Wait for all chunk fetches to complete (resolve or reject)
      const results = await Promise.allSettled(allFetches);

      // Process results
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { data, chunk } = result.value;
          // Process found cards
          if (data.data && data.data.length > 0) {
            data.data.forEach((card) => {
              const cardName = card.name;
              const originalName = Object.keys(parsedQuantities).find(
                (reqName) => reqName.toLowerCase() === cardName.toLowerCase()
              );
              if (originalName && parsedQuantities[originalName]) {
                const smallImageUrl =
                  card.image_uris?.small || card.image_uris?.normal || "";
                const normalImageUrl = card.image_uris?.normal || smallImageUrl;
                importedDeckData[originalName] = {
                  quantity: parsedQuantities[originalName],
                  imageUrl: smallImageUrl,
                  normalImageUrl: normalImageUrl,
                };
              } else {
                console.warn(
                  `Scryfall returned card '${cardName}' not explicitly matched to request chunk.`
                );
              }
            });
          }
          // Record not found cards from this chunk
          if (data.not_found && data.not_found.length > 0) {
            data.not_found.forEach((notFound) => {
              const originalIdentifier = chunk.find(
                (id) => id.name?.toLowerCase() === notFound.name?.toLowerCase()
              );
              const originalName =
                originalIdentifier?.name || notFound.name || "Unknown";
              fetchErrors.push(`Card not found: "${escapeHtml(originalName)}"`);
            });
          }
        } else {
          // Handle rejected promises (fetch errors for a chunk)
          const { status, statusText, error, chunk } = result.reason;
          fetchErrors.push(
            `API Error (Chunk starting with ${escapeHtml(
              chunk[0]?.name
            )}): ${status} ${escapeHtml(error || statusText)}`
          );
        }
      });
    } catch (error) {
      // Catch errors not related to individual fetches (e.g., programming errors)
      console.error("Error processing fetchCardData:", error);
      fetchErrors.push(
        `Unexpected error during card data fetching: ${error.message}`
      );
    } finally {
      $saveImportedDeckButton.prop("disabled", false); // Re-enable save button
      importCardDataRequest = null; // Clear request reference after all processing
    }

    // Final check: ensure all originally requested cards were accounted for
    cardNames.forEach((originalName) => {
      if (
        !importedDeckData[originalName] &&
        !fetchErrors.some((err) =>
          err.includes(`"${escapeHtml(originalName)}"`)
        )
      ) {
        fetchErrors.push(`Card not found: "${escapeHtml(originalName)}"`);
      }
    });

    return { importedDeckData, fetchErrors };
  }

  /**
   * Handles the process of saving the imported deck.
   * Parses text, fetches card data, validates, and saves to local storage.
   */
  async function handleSaveImportedDeck() {
    if (isImporting) return; // Prevent double clicks
    isImporting = true;
    $saveImportedDeckButton.prop("disabled", true); // Disable button during processing
    updateImportStatus("Processing...", "info");

    const deckName = $importDeckNameInput.val().trim();
    const decklistText = $importDeckListTextarea.val();

    // --- Basic Validation ---
    if (!deckName) {
      updateImportStatus("Error: Deck name cannot be empty.", "error");
      isImporting = false;
      $saveImportedDeckButton.prop("disabled", false);
      return;
    }
    if (!decklistText.trim()) {
      updateImportStatus("Error: Decklist cannot be empty.", "error");
      isImporting = false;
      $saveImportedDeckButton.prop("disabled", false);
      return;
    }

    // --- Parse Decklist ---
    const { deck: parsedQuantities, errors: parseErrors } =
      parseDecklist(decklistText);

    if (parseErrors.length > 0) {
      updateImportStatus(
        `Error parsing decklist:\n${parseErrors.slice(0, 3).join("\n")}${
          parseErrors.length > 3 ? "\n..." : ""
        }`,
        "error"
      );
      isImporting = false;
      $saveImportedDeckButton.prop("disabled", false);
      return;
    }
    if (Object.keys(parsedQuantities).length === 0) {
      updateImportStatus(
        "Error: No valid card entries found in the decklist.",
        "error"
      );
      isImporting = false;
      $saveImportedDeckButton.prop("disabled", false);
      return;
    }

    // --- Fetch Card Data ---
    const { importedDeckData, fetchErrors } = await fetchCardDataForParsedDeck(
      parsedQuantities
    ); // Now async
    let statusMessages = [];
    const foundCardCount = Object.keys(importedDeckData).length;
    let totalCardsInDeck = 0;
    Object.values(importedDeckData).forEach(
      (card) => (totalCardsInDeck += card.quantity)
    );

    if (fetchErrors.length > 0) {
      statusMessages.push(
        `Could not find data for some cards:\n${fetchErrors
          .slice(0, 5) // Show more errors maybe
          .join("\n")}${fetchErrors.length > 5 ? "\n..." : ""}`
      );
    }
    if (foundCardCount === 0) {
      updateImportStatus(
        `Error: Failed to fetch data for any cards. Check spelling and format.\n${statusMessages.join(
          "\n" // Separate lines for readability
        )}`,
        "error"
      );
      isImporting = false;
      $saveImportedDeckButton.prop("disabled", false);
      return;
    }

    // --- Save to Local Storage ---
    const savedDecks = getSavedDecks();
    const safeDeckName = escapeHtml(deckName);

    if (savedDecks[deckName]) {
      if (
        !confirm(`A deck named "${safeDeckName}" already exists. Overwrite it?`)
      ) {
        updateImportStatus("Import cancelled.", "info");
        isImporting = false;
        $saveImportedDeckButton.prop("disabled", false);
        return;
      }
    }

    savedDecks[deckName] = importedDeckData; // Save the fetched data

    try {
      localStorage.setItem(MULTI_DECK_STORAGE_KEY, JSON.stringify(savedDecks));
      let successMsg = `Deck "${safeDeckName}" imported successfully with ${foundCardCount} unique cards (${totalCardsInDeck} total).`;
      if (statusMessages.length > 0) {
        successMsg += "\n" + statusMessages.join("\n"); // Add warnings about unfound cards
      }
      updateImportStatus(successMsg, "success");
      renderSavedDecksList(); // Update the list in the main UI

      setTimeout(hideImportDeckPopup, 4000); // Auto-close after showing success/warnings
    } catch (error) {
      console.error("Error saving imported deck:", error);
      updateImportStatus(
        "Error saving deck to local storage. It might be full.",
        "error"
      );
    } finally {
      // Ensure flag and button state are reset regardless of outcome
      isImporting = false;
      // Re-enable button *only* if popup isn't closing automatically
      if (!setTimeout) {
        $saveImportedDeckButton.prop("disabled", false);
      }
    }
  }

  /* --- Miscellaneous Actions (Coin Flip, Die Roll, Fullscreen) --- */

  /**
   * Simulates a coin flip and displays the result in a popup.
   */
  function flipCoin() {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    showResultPopup(`Coin: ${result}`);
    updateTestStatus(); // Update zone counts
  }

  /**
   * Simulates rolling a 6-sided die and displays the result in a popup.
   */
  function rollDie() {
    const result = Math.floor(Math.random() * 6) + 1;
    showResultPopup(`Dice Roll: ${result}`);
    updateTestStatus(); // Update zone counts
  }

  /**
   * Toggles fullscreen mode for the test area section.
   */
  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    $testAreaSection.toggleClass("fullscreen-mode", isFullscreen);
    $fullscreenTestAreaButton.text(
      isFullscreen ? "Exit Fullscreen" : "Fullscreen"
    );
    const $body = $("body");

    // Hide/show other elements and adjust body styles for fullscreen
    if (isFullscreen) {
      $body.css("overflow", "hidden"); // Prevent scrolling
      // Hide all direct children of body except necessary overlays/menus and the test area
      $body
        .children(
          ":not(.test-hand-section):not(#cardContextMenu):not(#scryOverlay):not(#cardViewPopupOverlay):not(#resultPopupOverlay):not(#importDeckPopupOverlay)"
        )
        .hide();
      // Ensure header is hidden
      $(".header-container").hide();
      // Force body to fill viewport
      $body.css({
        position: "fixed",
        width: "100%",
        height: "100%",
        top: "0",
        left: "0",
        margin: "0",
        padding: "0",
      });
    } else {
      // Restore normal body styles and element visibility
      $body.css("overflow", "");
      $body
        .children(
          ":not(.test-hand-section):not(#cardContextMenu):not(#scryOverlay):not(#cardViewPopupOverlay):not(#resultPopupOverlay):not(#importDeckPopupOverlay)"
        )
        .show(); // Restore display using .show()
      $(".header-container").show(); // Restore header
      $body.css({
        position: "",
        width: "",
        height: "",
        top: "",
        left: "",
        margin: "20px auto", // Restore original margin
        padding: "15px", // Restore original padding
      });
    }
    // Close any open popups/menus when toggling fullscreen
    hideContextMenu();
    hideCardViewPopup();
    hideResultPopup();
    hideImportDeckPopup(); // Also hide import popup on fullscreen toggle
  }

  /* --- Event Listeners Initialization --- */
  function initializeEventListeners() {
    /* Search Input & Results */
    $searchInput.on("input", function (event) {
      debouncedLiveSearch($(this).val().trim());
    });

    // Use delegation for search results as they are dynamic
    $searchResults.on("click", "li", function (event) {
      const $li = $(this);
      const cardName = $li.attr("data-cardname");
      if (cardName) {
        addCardToDeck(
          cardName,
          $li.attr("data-imageurl"),
          $li.attr("data-normalimageurl")
        );
      }
    });

    $searchInput.on("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        const $firstResult = $searchResults.find("li:first");
        if ($firstResult.length) {
          addCardToDeck(
            $firstResult.attr("data-cardname"),
            $firstResult.attr("data-imageurl"),
            $firstResult.attr("data-normalimageurl")
          );
        }
      }
    });

    /* Deck List Interactions (Event Delegation) */
    $deckList.on("click", ".delete-card-btn", function (event) {
      const $button = $(this);
      const cardName = $button.attr("data-cardname");
      if (cardName) {
        if (
          confirm(
            `Are you sure you want to remove "${escapeHtml(
              cardName
            )}" from the deck?`
          )
        ) {
          deleteCardFromDeck(cardName);
        }
      }
    });
    $deckList.on("click", ".card-image", function (event) {
      const normalSrc = $(this).attr("data-normal-src");
      if (normalSrc) {
        showCardViewPopup(normalSrc);
      }
    });

    $deckList.on("change", ".quantity-input", function (event) {
      const $input = $(this);
      const cardName = $input.attr("data-cardname");
      if (cardName) {
        updateCardQuantity(cardName, $input.val());
      }
    });

    /* Deck Action Buttons */
    $saveDeckButton.on("click", saveDeck);
    $importDeckButton.on("click", showImportDeckPopup);
    $deleteSavedDeckButton.on("click", deleteSavedDeck);
    $clearDeckButton.on("click", clearDeck);

    /* Saved Decks List (Event Delegation) */
    $savedDecksList.on("click", "li", function (event) {
      const $li = $(this);
      const deckName = $li.attr("data-deck-name");
      if (deckName && !$li.hasClass("no-decks")) {
        loadDeckByName(deckName);
      }
    });

    /* Test Area Buttons */
    $drawHandButton.on("click", drawTestHand);
    $drawNextCardButton.on("click", drawNextCard);
    $shuffleDeckButton.on("click", shuffleLibrary);
    $searchDeckButton.on("click", toggleDeckSearchArea);
    $closeSearchAreaButton.on("click", hideDeckSearchArea);
    $scryButton.on("click", handleScry);
    $flipCoinButton.on("click", flipCoin);
    $rollDieButton.on("click", rollDie);
    $untapAllButton.on("click", function () {
      let untappedCount = 0;
      for (const id in currentBattlefield) {
        if (
          currentBattlefield[id].zone === "general" &&
          currentBattlefield[id].isTapped
        ) {
          currentBattlefield[id].isTapped = false;
          untappedCount++;
        }
      }
      if (untappedCount > 0) {
        displayBattlefield();
        updateTestStatus(`Untapped ${untappedCount} card(s).`);
      }
      updateUntapAllButtonVisibility(); // updateUntapAllButtonVisibility handles the toggle
    });
    $fullscreenTestAreaButton.on("click", toggleFullscreen);

    /* Life Counter Buttons */
    $increaseLifeButton.on("click", increaseLife);
    $decreaseLifeButton.on("click", decreaseLife);

    /* Drag and Drop Zone Listeners */
    // Attach drag handlers using delegation where possible or direct binding
    $generalZone
      .add($graveyardZone)
      .add($exileZone) // Combine selectors
      .on("dragover", handleDragOver)
      .on("drop", handleDrop);

    // Hand reordering specific listeners
    $testHandContainer
      .on("dragover", handleHandDragOver)
      .on("dragleave", handleHandDragLeave)
      .on("drop", handleHandDrop);

    // Draggable elements need listeners attached when created/displayed
    // Use delegation from a static parent container for dynamically added cards
    $testHandContainer.on("dragstart", ".hand-card", handleHandDragStart);
    $testHandContainer.on("dragend", ".hand-card", handleDragEnd);
    $testHandContainer.on("click", ".hand-card", handlePlayCardFromHand); // Play card from hand listener

    $generalZone.on(
      "dragstart",
      ".battlefield-card",
      handleBattlefieldDragStart
    );
    $generalZone.on("dragend", ".battlefield-card", handleDragEnd);

    /* Theme Toggle */
    $themeToggle.on("change", toggleTheme);

    /* Context Menu Listener (Delegated to Document) */
    $(document).on("click", "#cardContextMenu li", handleContextMenuAction);

    /* Scry Choice Buttons (Delegated) */
    $scryCardContainer.on(
      "click",
      ".scry-choice-buttons button",
      handleScryChoice
    );

    /* Popup Close Buttons */
    $closeCardViewPopupButton.on("click", hideCardViewPopup);
    $closeResultPopupButton.on("click", hideResultPopup);
    $closeImportDeckPopupButton.on("click", hideImportDeckPopup);
    $saveImportedDeckButton.on("click", handleSaveImportedDeck);

    // Prevent clicks inside the import popup content from closing it via overlay click
    $importDeckPopupContent.on("click", function (event) {
      event.stopPropagation();
    });

    /* Global Listeners (Click outside, Double Click, Escape key, Scroll/Resize) */
    $(document).on("click", function (event) {
      const $target = $(event.target);

      // Close search results if clicking outside
      if (!$target.closest(".search-section").length) {
        $searchResults.empty().hide();
      }
      // Close context menu if clicking outside
      if (contextMenuVisible && !$target.closest("#cardContextMenu").length) {
        // Check if click was on a card, which would open a new menu anyway
        const isCard =
          $target.closest(
            ".battlefield-card, .side-zone-card, .hand-card, .scry-card-item, .library-search-card"
          ).length > 0;
        if (!isCard) {
          hideContextMenu();
        }
      }
      // Close library search if clicking outside
      if (
        $deckSearchArea.is(":visible") &&
        !$target.closest("#deckSearchArea").length &&
        !$target.is("#searchDeckButton") && // Don't close if clicking the toggle button
        !$target.closest("#closeSearchAreaButton").length &&
        !$target.closest("#cardContextMenu").length // Don't close if clicking the context menu itself
      ) {
        hideDeckSearchArea();
      }

      // Close popups if clicking directly on their overlay
      if ($target.is($cardViewPopupOverlay)) hideCardViewPopup();
      if ($target.is($resultPopupOverlay)) hideResultPopup();
      if ($target.is($importDeckPopupOverlay)) hideImportDeckPopup();
      if ($target.is($scryOverlay)) cancelScry(); // Allow cancelling scry by clicking overlay
    });

    // Context menu delegation
    $(document).on(
      "contextmenu",
      ".battlefield-card, .side-zone-card, .hand-card, .scry-card-item, .library-search-card",
      function (event) {
        if (contextMenuVisible) {
          hideContextMenu(); // Hide previous menu first
        }
        event.preventDefault();
        showContextMenu(event, this); // 'this' is the raw DOM element here
      }
    );

    // Double click delegation
    $(document).on(
      "dblclick",
      ".battlefield-card img, .side-zone-card img, .hand-card img, .scry-card-item img, .library-search-card img, .card-image",
      function (event) {
        const $targetCardImage = $(this);
        const normalSrc = $targetCardImage.attr("data-normal-src");
        if (normalSrc) {
          showCardViewPopup(normalSrc);
        }
      }
    );

    // Escape key listener
    $(document).on("keydown", function (event) {
      if (event.key === "Escape") {
        // Prioritize closing things on Escape key
        if (isFullscreen) toggleFullscreen();
        else if ($importDeckPopupOverlay.is(":visible")) hideImportDeckPopup();
        else if ($resultPopupOverlay.is(":visible")) hideResultPopup();
        else if (scryingState.active) cancelScry();
        else if ($cardViewPopupOverlay.is(":visible")) hideCardViewPopup();
        else if ($deckSearchArea.is(":visible")) hideDeckSearchArea();
        else if (contextMenuVisible) hideContextMenu();
      }
    });

    // Hide popups/menus on scroll/resize to prevent detachment
    $(window).on("scroll resize", function () {
      if (!isFullscreen) {
        // Don't hide menus if fullscreen as scroll/resize might be internal
        hideContextMenu();
        hideCardViewPopup();
        hideResultPopup();
        hideImportDeckPopup();
      }
    });
  }

  /* --- Initialization --- */
  loadTheme();
  renderDeck(); // Render empty deck initially
  renderSavedDecksList();
  updateCurrentDeckNameStatus(null);
  updateLifeDisplay(); // Initialize life display text
  hideResultPopup(); // Ensure popups are hidden on load
  hideImportDeckPopup();
  hideCardViewPopup();
  hideContextMenu();
  hideDeckSearchArea();
  initializeEventListeners();
}); // End of $(function() { ... });
