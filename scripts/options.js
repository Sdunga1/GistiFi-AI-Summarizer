document.addEventListener("DOMContentLoaded", () => {
  const apiInput = document.getElementById("api-key");
  const successMsg = document.getElementById("success-message");
  const errorMsg = document.getElementById("error-message");

  chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
    if (geminiApiKey) apiInput.value = geminiApiKey;
  });

  document.getElementById("save-button").addEventListener("click", () => {
    const apiKey = apiInput.value.trim();
    if (!apiKey) {
      errorMsg.style.display = "block";
      successMsg.style.display = "none";
      return;
    }

    chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
      chrome.action.setPopup({ popup: "../html/reloadPrompt.html" }, () => {
        successMsg.style.display = "block";
        errorMsg.style.display = "none";
        setTimeout(() => window.close(), 1000);
      });
    });
  });
});
