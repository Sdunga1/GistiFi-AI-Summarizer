// Check if extension context is still valid
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (error) {
    return false;
  }
}

// Extract main content from the page
function extractPageContent() {
  const content = document.body.innerText || document.body.textContent || "";
  return content.trim();
}

// Function to highlight important elements on the page
function highlightPageContent() {
  const elements = document.querySelectorAll("h1, h2, h3, p, li");
  elements.forEach((el) => {
    el.style.backgroundColor = "#ffffcc";
    el.style.border = "1px solid #ffcc00";
  });

  setTimeout(() => {
    elements.forEach((el) => {
      el.style.backgroundColor = "";
      el.style.border = "";
    });
  }, 3000);
}

// Create and inject floating action button
function createFloatingButton() {
  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    console.log(
      "Extension context invalidated, skipping floating button creation"
    );
    return;
  }

  // Check if button already exists
  if (document.getElementById("gistifi-fab")) return;

  // Create button container
  const fabContainer = document.createElement("div");
  fabContainer.className = "gistifi-fab-container";

  // Create button
  const fab = document.createElement("button");
  fab.id = "gistifi-fab";
  fab.className = "gistifi-fab";

  try {
    fab.innerHTML = `
      <img class="gistifi-fab-icon" src="${chrome.runtime.getURL(
        "assets/icon.png"
      )}" alt="GistiFi">
      <div class="gistifi-fab-tooltip">Open GistiFi AI Chat</div>
    `;
  } catch (error) {
    console.log(
      "Error creating floating button, extension context may be invalidated:",
      error
    );
    return;
  }

  // Click handler
  async function handleButtonClick(e) {
    if (!isExtensionContextValid()) {
      console.log("Extension context invalid during button click");
      fab.remove();
      return;
    }

    // Visual feedback
    fab.style.transform = "scale(0.95)";
    setTimeout(() => {
      fab.style.transform = "";
    }, 150);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "TOGGLE_SIDE_PANEL",
      });

      if (response) {
        if (response.success) {
          if (response.action === "opened") {
            console.log("Side panel opened successfully");
            // Only hide button if we're confident the side panel opened
            setTimeout(() => {
              fab.style.display = "none";
            }, 100); // Small delay to ensure side panel actually opens
          } else if (response.action === "already_open") {
            console.log("Side panel is already open");
          }
        } else {
          if (response.action === "show_notification") {
            showClickExtensionNotification();
            console.log("Showing notification to click extension icon");
          } else {
            console.warn(
              "Side panel toggle response:",
              response.message || response.error || "Unknown response"
            );
          }
        }
      } else {
        console.warn("No response received from background script");
      }
    } catch (error) {
      console.log("Failed to toggle side panel:", error.message);
      if (error.message.includes("Extension context invalidated")) {
        fab.remove();
      }
    }
  }

  // Function to show temporary tooltip message
  function showTooltipMessage(message) {
    const tooltip = fab.querySelector(".gistifi-fab-tooltip");
    if (tooltip) {
      const originalText = tooltip.textContent;
      tooltip.textContent = message;
      tooltip.style.opacity = "1";
      setTimeout(() => {
        tooltip.textContent = originalText;
      }, 3000);
    }
  }

  // Function to show notification to click extension icon
  function showClickExtensionNotification() {
    showTooltipMessage("Click the extension icon to open chat panel");
  }

  // Add click handler
  fab.addEventListener("click", handleButtonClick);

  // Append to body
  fabContainer.appendChild(fab);
  document.body.appendChild(fabContainer);
}

// Initialize floating button when page loads
function initializeGistiFi() {
  if (!isExtensionContextValid()) {
    console.log("Extension context invalid, skipping initialization");
    return;
  }

  // Create floating button after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createFloatingButton);
  } else {
    createFloatingButton();
  }
}

// Only set up message listener if extension context is valid
function setupMessageListener() {
  if (!isExtensionContextValid()) {
    return;
  }

  try {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      try {
        if (req.type === "GET_ARTICLE_TEXT") {
          const content = extractPageContent();
          sendResponse({ content: content });
          return true;
        }

        if (req.type === "HIGHLIGHT_PAGE_CONTENT") {
          highlightPageContent();
          sendResponse({ success: true });
          return true;
        }

        if (req.type === "SIDE_PANEL_OPENED") {
          const fab = document.getElementById("gistifi-fab");
          if (fab) {
            fab.style.display = "none";
          }
          sendResponse({ success: true });
          return true;
        }

        if (req.type === "SIDE_PANEL_CLOSED") {
          const fab = document.getElementById("gistifi-fab");
          if (fab) {
            fab.style.display = "flex";
          }
          sendResponse({ success: true });
          return true;
        }
      } catch (error) {
        console.log("Error handling message:", error);
        sendResponse({ success: false, error: error.message });
      }
    });
  } catch (error) {
    console.log("Error setting up message listener:", error);
  }
}

// Clean up any existing floating buttons from previous extension loads
function cleanupOldButtons() {
  try {
    const existingButtons = document.querySelectorAll("#gistifi-fab");
    existingButtons.forEach((button) => button.remove());
  } catch (error) {
    console.log("Error cleaning up old buttons:", error);
  }
}

// Only initialize if extension context is valid
if (isExtensionContextValid()) {
  cleanupOldButtons();
  initializeGistiFi();
  setupMessageListener();
} else {
  console.log("GistiFi extension context is invalid, skipping initialization");
  cleanupOldButtons();
}
