document.getElementById("proceed-btn").addEventListener("click", () => {
  document.body.innerHTML = `
      <div class="done-container">
        <div class="checkmark">&#10003;</div>
        <p class="done-text">Reloading...</p>
      </div>
    `;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    const tabId = tab.id;

    const stored = await chrome.storage.local.get("handledTabs");
    const handledTabs = stored.handledTabs || {};
    handledTabs[tabId] = true;
    await chrome.storage.local.set({ handledTabs });

    chrome.action.setPopup({ tabId, popup: "popup.html" }, () => {
      chrome.tabs.reload(tabId, () => {
        setTimeout(() => {
          window.close();
        }, 1000);
      });
    });
  });
});

document.getElementById("cancel-btn").addEventListener("click", () => {
  window.close();
});
