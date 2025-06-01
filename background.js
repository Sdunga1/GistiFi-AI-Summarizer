chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({ url: "./html/options.html" });
    }
  });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  const stored = await chrome.storage.local.get("handledTabs");
  const handledTabs = stored.handledTabs || {};

  if (handledTabs[tabId]) {
    chrome.action.setPopup({ tabId, popup: "./html/popup.html" });
  } else {
    chrome.action.setPopup({ tabId, popup: "./html/reloadPrompt.html" });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    const stored = await chrome.storage.local.get("handledTabs");
    const handledTabs = stored.handledTabs || {};

    if (handledTabs[tabId]) {
      chrome.action.setPopup({ tabId, popup: "./html/popup.html" });
    } else {
      chrome.action.setPopup({ tabId, popup: "./html/reloadPrompt.html" });
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get("handledTabs", (stored) => {
    const handledTabs = stored.handledTabs || {};
    delete handledTabs[tabId];
    chrome.storage.local.set({ handledTabs });
    chrome.storage.local.remove("summary_" + tabId);
  });
});
