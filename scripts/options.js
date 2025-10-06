document.addEventListener('DOMContentLoaded', () => {
  const geminiInput = document.getElementById('api-key');
  const youtubeInput = document.getElementById('youtube-api-key');
  const successMsg = document.getElementById('success-message');
  const errorMsg = document.getElementById('error-message');

  // Load saved API keys
  chrome.storage.sync.get(
    ['geminiApiKey', 'youtubeApiKey', 'geminiModel', 'freeTierHint'],
    ({ geminiApiKey, youtubeApiKey, geminiModel, freeTierHint }) => {
      if (geminiApiKey) geminiInput.value = geminiApiKey;
      if (youtubeApiKey) youtubeInput.value = youtubeApiKey;
      const modelSelect = document.getElementById('model-select');
      const freeTierCb = document.getElementById('free-tier-hint');
      if (modelSelect && geminiModel) modelSelect.value = geminiModel;
      if (freeTierCb) freeTierCb.checked = !!freeTierHint;
    }
  );

  // Password toggle functionality
  function setupPasswordToggle(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);

    toggle.addEventListener('click', () => {
      if (input.type === 'password') {
        input.type = 'text';
        // Update SVG to show "eye with slash" (hidden state)
        const eyeIcon = toggle.querySelector('.eye-icon');
        eyeIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        `;
      } else {
        input.type = 'password';
        // Update SVG to show normal eye (visible state)
        const eyeIcon = toggle.querySelector('.eye-icon');
        eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        `;
      }
    });
  }

  // Setup password toggles
  setupPasswordToggle('api-key', 'toggle-gemini');
  setupPasswordToggle('youtube-api-key', 'toggle-youtube');

  document.getElementById('save-button').addEventListener('click', () => {
    const geminiKey = geminiInput.value.trim();
    const youtubeKey = youtubeInput.value.trim();
    const modelSelect = document.getElementById('model-select');
    const freeTierCb = document.getElementById('free-tier-hint');

    if (!geminiKey) {
      errorMsg.style.display = 'block';
      successMsg.style.display = 'none';
      return;
    }

    // Save settings
    chrome.storage.sync.set(
      {
        geminiApiKey: geminiKey,
        youtubeApiKey: youtubeKey,
        geminiModel: modelSelect
          ? modelSelect.value
          : 'models/gemini-2.0-flash',
        freeTierHint: freeTierCb ? freeTierCb.checked : false,
      },
      () => {
        chrome.action.setPopup({ popup: '../html/reloadPrompt.html' }, () => {
          successMsg.style.display = 'block';
          errorMsg.style.display = 'none';
          setTimeout(() => window.close(), 1000);
        });
      }
    );
  });
});
