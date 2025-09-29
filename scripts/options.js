document.addEventListener("DOMContentLoaded", () => {
  const geminiInput = document.getElementById("api-key");
  const youtubeInput = document.getElementById("youtube-api-key");
  const successMsg = document.getElementById("success-message");
  const errorMsg = document.getElementById("error-message");

  // Load saved API keys
  chrome.storage.sync.get(
    ["geminiApiKey", "youtubeApiKey", "geminiModel", "freeTierHint"],
    ({ geminiApiKey, youtubeApiKey, geminiModel, freeTierHint }) => {
      if (geminiApiKey) geminiInput.value = geminiApiKey;
      if (youtubeApiKey) youtubeInput.value = youtubeApiKey;
      const modelSelect = document.getElementById("model-select");
      const freeTierCb = document.getElementById("free-tier-hint");
      if (modelSelect && geminiModel) modelSelect.value = geminiModel;
      if (freeTierCb) freeTierCb.checked = !!freeTierHint;
    }
  );

  // Password toggle functionality
  function setupPasswordToggle(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);

    toggle.addEventListener("click", () => {
      if (input.type === "password") {
        input.type = "text";
        toggle.querySelector(".eye-icon").textContent = "🙈";
      } else {
        input.type = "password";
        toggle.querySelector(".eye-icon").textContent = "👁️";
      }
    });
  }

  // Setup password toggles
  setupPasswordToggle("api-key", "toggle-gemini");
  setupPasswordToggle("youtube-api-key", "toggle-youtube");

  document.getElementById("save-button").addEventListener("click", () => {
    const geminiKey = geminiInput.value.trim();
    const youtubeKey = youtubeInput.value.trim();
    const modelSelect = document.getElementById("model-select");
    const freeTierCb = document.getElementById("free-tier-hint");

    if (!geminiKey) {
      errorMsg.style.display = "block";
      successMsg.style.display = "none";
      return;
    }

    // Save both API keys (YouTube can be empty)
    chrome.storage.sync.set(
      {
        geminiApiKey: geminiKey,
        youtubeApiKey: youtubeKey,
        geminiModel: modelSelect ? modelSelect.value : "models/gemini-2.0-flash",
        freeTierHint: freeTierCb ? freeTierCb.checked : false,
      },
      () => {
        chrome.action.setPopup({ popup: "../html/reloadPrompt.html" }, () => {
          successMsg.style.display = "block";
          errorMsg.style.display = "none";
          setTimeout(() => window.close(), 1000);
        });
      }
    );
  });
});
