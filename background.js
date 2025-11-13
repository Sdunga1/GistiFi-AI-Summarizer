// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({ url: "./html/options.html" });
    }
  });
});

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  // Open the side panel
  await chrome.sidePanel.open({ tabId: tab.id });

  // Update state
  sidePanelState.set(tab.id, true);

  // Notify content script that side panel is opened
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SIDE_PANEL_OPENED" });
  } catch (error) {
    console.log("Could not notify content script of side panel opened");
  }
});

// Store side panel state per tab
const sidePanelState = new Map();
let lastActiveTabId = null;

const isLeetCodeUrl = (url = "") => typeof url === "string" && url.includes("leetcode.com");

const getTabById = async (tabId) => {
  try {
    return await chrome.tabs.get(tabId);
  } catch (error) {
    return null;
  }
};

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_SIDE_PANEL") {
    (async () => {
      try {
        const tabId = sender.tab?.id;
        if (tabId) {
          const isOpen = sidePanelState.get(tabId) || false;

          if (isOpen) {
            // Side panel is open, we can't close it programmatically
            // But we can set it to show a "close" message
            sendResponse({
              success: true,
              action: "already_open",
              message: "Side panel is already open",
            });
          } else {
            // Side panel is closed, open it
            try {
              await chrome.sidePanel.open({ tabId: tabId });
              sidePanelState.set(tabId, true);
              sendResponse({
                success: true,
                action: "opened",
                message: "Side panel opened",
              });
            } catch (error) {
              console.error(
                "Could not open side panel directly:",
                error.message || error
              );

              // Check if it's a user gesture error
              if (error.message && error.message.includes("user gesture")) {
                sendResponse({
                  success: false,
                  action: "show_notification",
                  message: "Please click the extension icon to open chat panel",
                  error: "User gesture required",
                });
              } else {
                // Some other error, but try the notification fallback
                sendResponse({
                  success: false,
                  action: "show_notification",
                  message: "Please click the extension icon to open chat panel",
                  error: error.message || "Unknown error opening side panel",
                });
              }
            }
          }
        } else {
          sendResponse({ success: false, error: "No tab found" });
        }
      } catch (error) {
        console.error("Error handling side panel toggle:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Will respond asynchronously
  }

  if (message.type === "SIDE_PANEL_STATE_CHANGED") {
    // Update the stored state
    const { tabId, isOpen } = message;
    if (tabId) {
      sidePanelState.set(tabId, isOpen);
      console.log(
        `Side panel state updated for tab ${tabId}: ${
          isOpen ? "open" : "closed"
        }`
      );
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "GET_SIDE_PANEL_STATE") {
    const tabId = message.tabId || sender.tab?.id;
    const isOpen = tabId ? sidePanelState.get(tabId) || false : false;
    sendResponse({ success: true, isOpen });
    return true;
  }
});

const notifySidePanelAboutTabChange = async ({
  tabId,
  previousTabId = null,
  reason = "activated",
}) => {
  const tab = await getTabById(tabId);
  const url = tab?.url || "";
  const onLeetCode = isLeetCodeUrl(url);

  chrome.runtime
    .sendMessage({
      type: "ACTIVE_TAB_CHANGED",
      tabId,
      previousTabId,
      url,
      isLeetCode: onLeetCode,
      reason,
    })
    .catch(() => {});

  if (!onLeetCode) {
    const targetTabId =
      typeof previousTabId === "number" && sidePanelState.get(previousTabId)
        ? previousTabId
        : sidePanelState.get(tabId)
        ? tabId
        : null;

    if (targetTabId !== null) {
      sidePanelState.set(targetTabId, false);

      chrome.runtime
        .sendMessage({
          type: "FORCE_CLOSE_SIDE_PANEL",
          tabId: targetTabId,
          reason,
        })
        .catch(() => {});

      chrome.tabs
        .sendMessage(targetTabId, { type: "SIDE_PANEL_CLOSED" })
        .catch(() => {});
    }
  }
};

const handleActiveTabActivated = async (tabId) => {
  const previousTabId =
    typeof lastActiveTabId === "number" && lastActiveTabId !== tabId
      ? lastActiveTabId
      : null;

  if (previousTabId !== null && sidePanelState.get(previousTabId)) {
    sidePanelState.set(previousTabId, false);

    chrome.tabs
      .sendMessage(previousTabId, { type: "SIDE_PANEL_CLOSED" })
      .catch(() => {});

    chrome.runtime
      .sendMessage({
        type: "FORCE_CLOSE_SIDE_PANEL",
        tabId: previousTabId,
        reason: "tab-switched",
      })
      .catch(() => {});
  }

  await notifySidePanelAboutTabChange({
    tabId,
    previousTabId,
    reason: "activated",
  });

  lastActiveTabId = tabId;
};

const handleTabNavigation = async (tabId, changeInfo, tab) => {
  if (!tab || !tab.active) {
    return;
  }

  const url = changeInfo.url || tab.url || "";
  if (!url) {
    return;
  }

  const onLeetCode = isLeetCodeUrl(url);

  await notifySidePanelAboutTabChange({
    tabId,
    previousTabId: tabId,
    reason: onLeetCode ? "navigation-into-leetcode" : "navigation-away",
  });
};

chrome.tabs.onActivated.addListener(({ tabId }) => {
  handleActiveTabActivated(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    handleTabNavigation(tabId, changeInfo, tab);
  }
});

// Clean up storage when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get("handledTabs", (stored) => {
    const handledTabs = stored.handledTabs || {};
    delete handledTabs[tabId];
    chrome.storage.local.set({ handledTabs });
    chrome.storage.local.remove("summary_" + tabId);
    chrome.storage.local.remove("chat_history_" + tabId);
  });
});

// Handle side panel availability
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
