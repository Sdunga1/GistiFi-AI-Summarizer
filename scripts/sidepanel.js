// Side Panel Chat Interface JavaScript

class GistiFiChat {
  constructor() {
    this.currentOptions = {
      responseType: "brief",
      analysisType: "bigoh",
      customWordCount: 200,
    };
    this.isProcessing = false;
    this.currentTabId = null;
    this.youtubeService = null;

    this.init();
  }

  async init() {
    await this.getCurrentTab();
    this.setupEventListeners();
    this.checkApiStatus();
    this.setupCharCounter();
    this.setupCloseDetection();
    // Load mode-specific UI first so it doesn't overwrite restored chat
    this.checkLeetCodeMode();
    // Restore chat history after mode UI is settled
    await this.loadChatHistory();
    await this.initializeYouTubeService();

    // Set initial button state based on current mode
    this.toggleActionButtons(this.isLeetCodeModeActive());
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      this.currentTabId = tab?.id;
      return tab;
    } catch (error) {
      console.error("Error getting current tab:", error);
      return null;
    }
  }

  // LeetCode Mode functionality
  checkLeetCodeMode() {
    this.getCurrentTab().then((tab) => {
      if (tab && tab.url) {
        const isLeetCode = tab.url.includes("leetcode.com");
        this.toggleLeetCodeButton(isLeetCode);

        // Load the appropriate chat based on mode
        if (isLeetCode) {
          if (this.isLeetCodeModeActive()) {
            document.body.classList.add("leetcode-theme");
            this.showLeetCodeModeIndicator();
            this.loadChatHTML("leetcode");
          } else {
            document.body.classList.remove("leetcode-theme");
            this.loadChatHTML("regular");
          }
        }

        // Set button state based on actual mode, not just page type
        this.toggleActionButtons(this.isLeetCodeModeActive());
      }
    });
  }

  toggleLeetCodeButton(show) {
    const leetcodeBtn = document.getElementById("leetcode-mode-btn");
    if (leetcodeBtn) {
      leetcodeBtn.style.display = show ? "inline-flex" : "none";
    }
  }

  toggleActionButtons(isLeetCodeMode) {
    const resourcesBtn = document.querySelector('[data-action="resources"]');
    const debugBtn = document.querySelector('[data-action="debug-extract"]');
    const summarizeBtn = document.querySelector('[data-action="summarize"]');
    const askQuestionBtn = document.querySelector(
      '[data-action="ask-question"]'
    );

    if (isLeetCodeMode) {
      // Show LeetCode-specific buttons
      if (resourcesBtn) resourcesBtn.style.display = "inline-flex";
      if (debugBtn) debugBtn.style.display = "inline-flex";
      // Hide regular mode buttons
      if (summarizeBtn) summarizeBtn.style.display = "none";
      if (askQuestionBtn) askQuestionBtn.style.display = "none";
    } else {
      // Show regular mode buttons
      if (summarizeBtn) summarizeBtn.style.display = "inline-flex";
      if (askQuestionBtn) askQuestionBtn.style.display = "inline-flex";
      // Hide LeetCode-specific buttons
      if (resourcesBtn) resourcesBtn.style.display = "none";
      if (debugBtn) debugBtn.style.display = "none";
    }

    // Toggle expandable Guide Me interface
    this.toggleGuideMeInterface(isLeetCodeMode);

    // Toggle welcome messages
    this.toggleWelcomeMessages(isLeetCodeMode);

    // Update placeholder text
    this.updatePlaceholderText(isLeetCodeMode);

    // Update mode indicator
    this.updateModeIndicator(isLeetCodeMode);
  }

  toggleWelcomeMessages(isLeetCodeMode) {
    const regularWelcome = document.getElementById("regular-welcome");
    const leetcodeWelcome = document.getElementById("leetcode-welcome");

    if (isLeetCodeMode) {
      if (regularWelcome) regularWelcome.style.display = "none";
      if (leetcodeWelcome) leetcodeWelcome.style.display = "block";
    } else {
      if (regularWelcome) regularWelcome.style.display = "block";
      if (leetcodeWelcome) leetcodeWelcome.style.display = "none";
    }
  }

  updatePlaceholderText(isLeetCodeMode) {
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      if (isLeetCodeMode) {
        chatInput.placeholder =
          "Ask for guidance, paste code to analyze, or ask about resources...";
      } else {
        chatInput.placeholder = "Type your message or paste code here...";
      }
    }
  }

  toggleGuideMeInterface(isLeetCodeMode) {
    const guideMeExpandable = document.getElementById("guide-me-expandable");
    if (guideMeExpandable) {
      guideMeExpandable.style.display = isLeetCodeMode
        ? "inline-block"
        : "none";
    }
  }

  updateModeIndicator(isLeetCodeMode, currentTopic = null) {
    const modeIndicator = document.getElementById("mode-indicator");
    if (modeIndicator) {
      const modeText = modeIndicator.querySelector(".mode-text");
      if (modeText) {
        if (isLeetCodeMode) {
          modeIndicator.classList.add("leetcode-mode");
          if (currentTopic) {
            // Show current Guide Me topic
            modeText.textContent = currentTopic;
          } else {
            modeText.textContent = "LeetCode Mode";
          }
        } else {
          modeIndicator.classList.remove("leetcode-mode");
          modeText.textContent = "Regular Mode";
        }
      }
    }
  }

  setupGuideMeExpandable() {
    const guideMeTrigger = document.querySelector(".guide-me-trigger");
    const guideMeOptions = document.getElementById("guide-me-options");

    if (guideMeTrigger && guideMeOptions) {
      // Toggle expandable options when trigger is clicked
      guideMeTrigger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isExpanded = guideMeOptions.classList.contains("expanded");

        if (isExpanded) {
          guideMeOptions.classList.remove("expanded");
        } else {
          guideMeOptions.classList.add("expanded");
        }
      });

      // Handle option selection
      const options = guideMeOptions.querySelectorAll(".guide-me-option");
      options.forEach((option) => {
        option.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const featureId = option.getAttribute("data-feature");
          if (featureId) {
            // Close the options panel
            guideMeOptions.classList.remove("expanded");

            // Start Guide Me mode with selected feature
            this.startGuideMeWithFeature(featureId);
          }
        });
      });

      // Close options when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !guideMeTrigger.contains(e.target) &&
          !guideMeOptions.contains(e.target)
        ) {
          guideMeOptions.classList.remove("expanded");
        }
      });
    }
  }

  async startGuideMeWithFeature(featureId) {
    try {
      // Start Guide Me mode
      await this.promptGuideMe();

      // Directly explore the selected feature
      if (this.guideMeSession && this.guideMePrompts) {
        await this.exploreFeature(featureId);
      }
    } catch (error) {
      console.error("Error starting Guide Me with feature:", error);
      this.addMessage(
        "❌ Error starting Guide Me mode. Please try again.",
        "bot",
        "error"
      );
    }
  }

  animateGuideIcon() {
    const guideIcon = document.querySelector(".guide-icon");
    if (guideIcon) {
      // Add a temporary class for enhanced animation
      guideIcon.classList.add("guide-icon-clicked");

      // Remove the class after animation completes
      setTimeout(() => {
        guideIcon.classList.remove("guide-icon-clicked");
      }, 600);
    }
  }

  async activateLeetCodeMode() {
    const leetcodeBtn = document.getElementById("leetcode-mode-btn");

    if (leetcodeBtn) {
      // Update button state
      leetcodeBtn.classList.add("active");
      leetcodeBtn.innerHTML =
        '<img src="https://img.icons8.com/?size=100&id=9L16NypUzu38&format=png&color=000000" alt="LeetCode" class="leetcode-icon" width="16" height="16"> ✅ LeetCode Mode';

      // Store mode state
      localStorage.setItem("gistifi-leetcode-mode", "true");

      // Apply LeetCode theme to the panel
      document.body.classList.add("leetcode-theme");

      // 1) Append status in current (regular) chat and persist its HTML snapshot
      this.addStatusMessage("LeetCode Mode: ACTIVATED");
      await this.saveCurrentChatHTML("regular");

      // 2) Switch to LeetCode chat: load if exists, else start fresh with welcome
      const loaded = await this.loadChatHTML("leetcode");
      if (!loaded) {
        this.clearChatFully();
        // The welcome message is now handled by toggleWelcomeMessages
        this.toggleWelcomeMessages(true);
        await this.saveCurrentChatHTML("leetcode");
      }

      // Update button state and UI for LeetCode mode
      this.toggleActionButtons(true);

      console.log("LeetCode Mode activated");
    }
  }

  async deactivateLeetCodeMode() {
    const leetcodeBtn = document.getElementById("leetcode-mode-btn");

    if (leetcodeBtn) {
      // Update button state
      leetcodeBtn.classList.remove("active");
      leetcodeBtn.innerHTML =
        '<img src="https://img.icons8.com/?size=100&id=9L16NypUzu38&format=png&color=000000" alt="LeetCode" class="leetcode-icon" width="16" height="16"> LeetCode Mode';

      // Remove mode state
      localStorage.removeItem("gistifi-leetcode-mode");

      // Remove theme
      document.body.classList.remove("leetcode-theme");

      // 1) Save current LeetCode chat HTML snapshot
      await this.saveCurrentChatHTML("leetcode");

      // 2) Restore regular chat HTML snapshot
      const restored = await this.loadChatHTML("regular");
      if (!restored) {
        // Fallback: if no snapshot, keep current DOM as-is
      }

      // 3) Append deactivated status and persist regular snapshot
      this.addStatusMessage("LeetCode Mode: DEACTIVATED");
      await this.saveCurrentChatHTML("regular");

      // Update button state and UI for regular mode
      this.toggleActionButtons(false);

      console.log("LeetCode Mode deactivated");
    }
  }

  showLeetCodeModeIndicator() {
    const leetcodeBtn = document.getElementById("leetcode-mode-btn");

    if (leetcodeBtn) {
      leetcodeBtn.classList.add("active");
      leetcodeBtn.innerHTML =
        '<img src="https://img.icons8.com/?size=100&id=9L16NypUzu38&format=png&color=000000" alt="LeetCode" class="leetcode-icon" width="16" height="16"> ✅ LeetCode Mode';
      document.body.classList.add("leetcode-theme");

      // Update button state for LeetCode mode
      this.toggleActionButtons(true);
    }
  }

  isLeetCodeModeActive() {
    return localStorage.getItem("gistifi-leetcode-mode") === "true";
  }

  addStatusMessage(text) {
    const messagesContainer = document.getElementById("chat-messages");
    const status = document.createElement("div");
    status.className = "status-message";
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    // Mark as deactivated to switch dot to red
    if (/deactivated/i.test(text)) {
      status.classList.add("deactivated");
    }
    status.innerHTML = `<span class="status-dot"></span> ${text} <span class="status-time">${time}</span>`;
    messagesContainer.appendChild(status);
  }

  clearChatFully() {
    const messagesContainer = document.getElementById("chat-messages");

    // Store welcome messages before clearing
    const regularWelcome = document.getElementById("regular-welcome");
    const leetcodeWelcome = document.getElementById("leetcode-welcome");

    // Clear all messages
    messagesContainer.innerHTML = "";

    // Restore the appropriate welcome message based on current mode
    if (this.isLeetCodeModeActive()) {
      if (leetcodeWelcome) {
        messagesContainer.appendChild(leetcodeWelcome.cloneNode(true));
      }
    } else {
      if (regularWelcome) {
        messagesContainer.appendChild(regularWelcome.cloneNode(true));
      }
    }

    // Reset Guide Me session if active
    if (this.guideMeSession && this.guideMeSession.isActive()) {
      this.guideMeSession.resetSession();
    }

    if (this.currentTabId) {
      chrome.storage.local.remove(`chat_history_${this.currentTabId}`);
    }
  }

  // Save current chat container HTML for a given channel ("regular" | "leetcode")
  async saveCurrentChatHTML(channel) {
    try {
      if (!this.currentTabId) return;
      const key = `chat_html_${channel}_${this.currentTabId}`;
      const container = document.getElementById("chat-messages");
      await chrome.storage.local.set({ [key]: container.innerHTML });
    } catch (e) {
      console.warn("Failed to save chat HTML", channel, e);
    }
  }

  // Load chat container HTML for a given channel, returns true if loaded
  async loadChatHTML(channel) {
    try {
      if (!this.currentTabId) return false;
      const key = `chat_html_${channel}_${this.currentTabId}`;
      const result = await chrome.storage.local.get([key]);
      const html = result[key];
      if (html) {
        const container = document.getElementById("chat-messages");
        container.innerHTML = html;
        // Scroll to latest message on restore
        container.scrollTop = container.scrollHeight;
        return true;
      }
      return false;
    } catch (e) {
      console.warn("Failed to load chat HTML", channel, e);
      return false;
    }
  }

  async backupCurrentChatHistory() {
    try {
      if (!this.currentTabId) return;
      const messagesContainer = document.getElementById("chat-messages");
      const messages = Array.from(messagesContainer.children).map((msg) => {
        const bubble = msg.querySelector(".message-bubble");
        return {
          content: bubble ? bubble.innerHTML : "",
          sender: msg.classList.contains("user-message") ? "user" : "bot",
          time: msg.querySelector(".message-time")?.textContent || "",
        };
      });
      await chrome.storage.local.set({
        [`chat_history_backup_${this.currentTabId}`]: messages,
      });
    } catch (e) {
      console.warn("Failed to backup chat history", e);
    }
  }

  async restoreOriginalChatFromBackup() {
    try {
      if (!this.currentTabId) return;
      const key = `chat_history_backup_${this.currentTabId}`;
      const result = await chrome.storage.local.get([key]);
      const backup = result[key];
      const messagesContainer = document.getElementById("chat-messages");
      messagesContainer.innerHTML = "";
      if (backup && Array.isArray(backup) && backup.length) {
        backup.forEach((msg) => {
          this.addMessageFromHistory(msg.content, msg.sender, msg.time);
        });
        // Promote backup to active chat history and remove backup
        await chrome.storage.local.set({
          [`chat_history_${this.currentTabId}`]: backup,
        });
        await chrome.storage.local.remove(key);
      }
    } catch (e) {
      console.warn("Failed to restore chat history from backup", e);
    }
  }

  setupEventListeners() {
    // Chat input handling
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");

    chatInput.addEventListener("keydown", this.handleInputKeydown.bind(this));
    chatInput.addEventListener("input", this.handleInputChange.bind(this));
    sendBtn.addEventListener("click", this.handleSendMessage.bind(this));

    // Quick action buttons
    document.querySelectorAll(".quick-action-btn").forEach((btn) => {
      btn.addEventListener("click", this.handleQuickAction.bind(this));
    });

    // Add enhanced animation for guide me button
    const guideMeBtn = document.querySelector('[data-action="guide-me"]');
    if (guideMeBtn) {
      guideMeBtn.addEventListener("click", this.animateGuideIcon.bind(this));
    }

    // Setup expandable Guide Me interface
    this.setupGuideMeExpandable();

    // Header buttons
    document
      .getElementById("settings-btn")
      .addEventListener("click", this.openSettings.bind(this));
    document
      .getElementById("clear-chat-btn")
      .addEventListener("click", this.clearChat.bind(this));

    // Options modal
    document
      .getElementById("attach-btn")
      .addEventListener("click", this.openOptionsModal.bind(this));
    document.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", this.closeOptionsModal.bind(this));
    });
    document
      .getElementById("apply-options")
      .addEventListener("click", this.applyOptions.bind(this));

    // Summary type change
    document
      .getElementById("response-type")
      .addEventListener("change", this.handleResponseTypeChange.bind(this));
  }

  setupCharCounter() {
    const chatInput = document.getElementById("chat-input");
    const charCount = document.getElementById("char-count");

    chatInput.addEventListener("input", () => {
      const count = chatInput.value.length;
      charCount.textContent = count;

      if (count > 4500) {
        charCount.style.color = "var(--error-color)";
      } else if (count > 4000) {
        charCount.style.color = "var(--warning-color)";
      } else {
        charCount.style.color = "var(--text-muted)";
      }
    });
  }

  async checkApiStatus() {
    const statusDot = document.querySelector(".status-dot");
    const statusText = document.getElementById("api-status-text");

    try {
      const result = await chrome.storage.sync.get(["geminiApiKey"]);
      if (result.geminiApiKey) {
        statusDot.className = "status-dot";
        statusText.textContent = "Ready";
      } else {
        statusDot.className = "status-dot error";
        statusText.textContent = "API Key Required";
      }
    } catch (error) {
      statusDot.className = "status-dot error";
      statusText.textContent = "Error";
    }
  }

  handleInputKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.handleSendMessage();
    }
  }

  handleInputChange(event) {
    const textarea = event.target;
    // Auto-resize textarea
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }

  async handleSendMessage() {
    const chatInput = document.getElementById("chat-input");
    const message = chatInput.value.trim();

    if (!message || this.isProcessing) return;

    // Clear input
    chatInput.value = "";
    chatInput.style.height = "auto";
    document.getElementById("char-count").textContent = "0";

    // Add user message
    this.addMessage(message, "user");

    // Process message
    await this.processMessage(message);
  }

  async handleQuickAction(event) {
    const action = event.target.dataset.action;

    switch (action) {
      case "summarize":
        await this.summarizePage();
        break;
      case "analyze-code":
        if (this.isLeetCodeModeActive()) {
          await this.analyzeCurrentLeetCodeCode();
        } else {
          this.promptCodeAnalysis();
        }
        break;
      case "ask-question":
        this.promptQuestion();
        break;
      case "guide-me":
        this.promptGuideMe();
        break;
      case "resources":
        this.showResources();
        break;
      case "debug-extract":
        await this.debugProblemExtraction();
        break;
      case "leetcode-mode":
        if (this.isLeetCodeModeActive()) {
          await this.deactivateLeetCodeMode();
        } else {
          await this.activateLeetCodeMode();
        }
        break;
      case "guide-me-trigger":
        // Reset dynamic island to show LeetCode Mode when Guide Me is clicked
        this.updateModeIndicator(true);
        break;
    }
  }

  async processMessage(message) {
    this.showLoading(true);
    this.isProcessing = true;

    try {
      console.log("Processing message:", message);
      console.log(
        "Guide Me session active:",
        this.guideMeSession && this.guideMeSession.isSessionActive()
      );

      // Check if we're in an active Guide Me session
      if (this.guideMeSession && this.guideMeSession.isSessionActive()) {
        console.log("Handling Guide Me conversation");
        await this.handleGuideMeConversation(message);
        return;
      }

      // Check if it's code (simple heuristic)
      if (this.isCodeContent(message)) {
        console.log("Message is code, analyzing...");
        await this.analyzeCode(message);
      } else if (
        message.toLowerCase().includes("summarize") ||
        message.toLowerCase().includes("summary")
      ) {
        console.log("Message contains summarize, calling summarizePage");
        await this.summarizePage();
      } else if (
        message.toLowerCase().includes("guide") ||
        message.toLowerCase().includes("help")
      ) {
        console.log("Message contains guide/help, calling promptGuideMe");
        if (this.isLeetCodeModeActive()) {
          this.promptGuideMe();
        } else {
          this.addMessage(
            "I can help you summarize this page or analyze code. Try using the quick action buttons or type 'summarize this page' for summaries!",
            "bot"
          );
        }
      } else if (
        // Only trigger resources if it's a direct command, not a question
        message.toLowerCase().includes("show resources") ||
        message.toLowerCase().includes("display resources") ||
        message.toLowerCase().includes("open resources") ||
        message.toLowerCase().startsWith("resources")
      ) {
        console.log(
          "Message is a direct resources command, calling showResources"
        );
        if (this.isLeetCodeModeActive()) {
          this.showResources();
        } else {
          this.addMessage(
            "I can help you summarize this page or analyze code. Try using the quick action buttons or type 'summarize this page' for summaries!",
            "bot"
          );
        }
      } else {
        // Always send to LLM for normal conversation
        console.log(
          "Message doesn't match any keywords, sending to LLM for chat"
        );
        await this.sendToLLMForChat(message);
      }
    } catch (error) {
      console.error("Error in processMessage:", error);
      this.addMessage(`Error: ${error.message}`, "bot", "error");
    } finally {
      this.showLoading(false);
      this.isProcessing = false;
    }
  }

  async handleGuideMeConversation(message) {
    try {
      // Handle special commands
      if (message.toLowerCase() === "reset") {
        this.guideMeSession.resetSession();
        this.addMessage(
          "🔄 Guide Me session has been reset. Click 'Guide Me' again to start a new session!",
          "bot"
        );
        return;
      }

      if (message.toLowerCase() === "status") {
        const status = this.guideMeSession.getSessionStatus();
        this.addMessage(this.formatSessionStatus(status), "bot");
        return;
      }

      // Users can select topics directly from Guide Me button - no need for "next" commands

      // Check if user wants to end session
      if (
        message.toLowerCase().includes("end") ||
        message.toLowerCase().includes("finish")
      ) {
        this.endGuideMeSession();
        return;
      }

      // Continue conversation with LLM using the new system
      try {
        const context = this.guideMeSession.buildLLMContext();
        const systemPrompt = this.guideMePrompts.buildConversationPrompt(
          this.guideMeSession.currentFocus,
          context
        );

        const response = await this.sendToLLM(systemPrompt, message);

        if (response) {
          this.addMessage(response, "bot");

          // Add messages to session history
          this.guideMeSession.addMessage("user", message);
          this.guideMeSession.addMessage("assistant", response);
        } else {
          this.addMessage(
            "❌ No response generated. Please try again.",
            "bot",
            "error"
          );
        }
      } catch (llmError) {
        console.error("LLM Error:", llmError);

        if (llmError.message.includes("API key")) {
          this.addMessage(
            "🔑 **API Key Required**: Please set your Gemini API key in the extension settings to use Guide Me mode.",
            "bot",
            "error"
          );
        } else if (llmError.message.includes("API request failed")) {
          this.addMessage(
            "🌐 **Network Error**: Unable to connect to AI service. Please check your internet connection and try again.",
            "bot",
            "error"
          );
        } else {
          this.addMessage(
            `❌ **AI Service Error**: ${llmError.message}. Please try again later.`,
            "bot",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Guide Me conversation error:", error);
      this.addMessage(
        `I encountered an error while guiding you: ${error.message}. Let's continue from where we left off.`,
        "bot",
        "error"
      );
    }
  }

  formatSessionStatus(status) {
    if (!status.isActive) {
      return "No active Guide Me session";
    }

    return (
      `**Active Guide Me Session** 📊<br>` +
      `• Problem: ${status.problemTitle}<br>` +
      `• Current Focus: ${status.currentFocus || "None"}<br>` +
      `• Topics Explored: ${status.exploredTopics.length}/4<br>` +
      `• Messages: ${status.totalMessages}<br>` +
      `• Duration: ${status.sessionDuration} minutes<br><br>` +
      `Type "reset" to start over or "status" to see this again.`
    );
  }

  isCodeContent(text) {
    // Simple heuristics to detect code
    const codeIndicators = [
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /def\s+\w+\s*\(/,
      /\{[\s\S]*\}/,
      /for\s*\(.*\)\s*\{/,
      /if\s*\(.*\)\s*\{/,
    ];

    return (
      codeIndicators.some((pattern) => pattern.test(text)) ||
      text.split("\n").length > 3
    );
  }

  async summarizePage() {
    try {
      // Update dynamic island to show current action
      this.updateModeIndicator(false, "Summarize Page");

      // Get page content
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "GET_ARTICLE_TEXT",
      });

      if (!response || !response.text) {
        this.addMessage(
          "Sorry, I couldn't extract text from this page. Please try refreshing the page.",
          "bot",
          "error"
        );
        return;
      }

      // Get API key
      const { geminiApiKey } = await chrome.storage.sync.get(["geminiApiKey"]);
      if (!geminiApiKey) {
        this.addMessage(
          "Please set your Gemini API key in settings first.",
          "bot",
          "error"
        );
        return;
      }

      // Generate summary
      const summary = await this.getResponseFromGemini(
        response.text,
        this.currentOptions.responseType,
        geminiApiKey
      );
      this.addMessage(summary, "bot");

      // Save to storage
      await chrome.storage.local.set({ [`summary_${tab.id}`]: summary });
    } catch (error) {
      console.error("Summarization error:", error);
      this.addMessage(
        `Error generating summary: ${error.message}`,
        "bot",
        "error"
      );
    }
  }

  promptQuestion() {
    // Update dynamic island to show current action
    this.updateModeIndicator(false, "Ask Question");

    const chatInput = document.getElementById("chat-input");
    chatInput.value = "Ask me anything about this page...";
    chatInput.focus();
    chatInput.select();
  }

  async analyzeCode(code) {
    try {
      // Get API key
      const { geminiApiKey } = await chrome.storage.sync.get(["geminiApiKey"]);
      if (!geminiApiKey) {
        this.addMessage(
          "Please set your Gemini API key in settings first.",
          "bot",
          "error"
        );
        return;
      }

      const prompt = this.getCodeAnalysisPrompt(
        code,
        this.currentOptions.analysisType
      );
      const analysis = await this.getResponseFromGemini(
        prompt,
        "detailed",
        geminiApiKey
      );

      this.addMessage(analysis, "bot", "code");
    } catch (error) {
      console.error("Code analysis error:", error);
      this.addMessage(`Error analyzing code: ${error.message}`, "bot", "error");
    }
  }

  // Analyze currently open LeetCode code without asking user to paste
  async analyzeCurrentLeetCodeCode() {
    try {
      this.updateModeIndicator(true, "Analyze Code");
      this.showLoading(true);

      const problemInfo = await this.getLeetCodeProblemInfo();
      const userCode = (problemInfo?.userCode || "").trim();
      const lang = await this.getLeetCodeProgrammingLanguage();

      const { geminiApiKey } = await chrome.storage.sync.get(["geminiApiKey"]);
      if (!geminiApiKey) {
        this.addMessage(
          "🔑 **API Key Required**: Please set your Gemini API key in settings to analyze code.",
          "bot",
          "error"
        );
        return;
      }

      // Single, unified prompt: classify status and always return complexity buckets.
      const systemPrompt = [
        "You are an expert reviewer for LeetCode solutions.",
        "Analyze the user's code for the given problem and classify status as exactly one of:",
        "- template_only (only signature/placeholder like pass/return 0/TODO/empty body)",
        "- incomplete (some logic but missing essential handling/edge cases)",
        "- incorrect (appears wrong for constraints/edge cases)",
        "- correct (appears correct and handles edge cases)",
        "Return ONLY JSON with fields:",
        '{"status":"template_only|incomplete|incorrect|correct","reason":"...","time_bucket":"O(1)|O(log n)|O(n)|O(n log n)|O(n^2)|O(n^3)|O(2^n)|O(n!)|O(k·n)","space_bucket":"O(1)|O(log n)|O(n)|O(n log n)|O(n^2)","n_symbol":"n","n_max":NUMBER,"hints":"...optional when not correct"}',
        "Rules:",
        "- If status is template_only or incomplete or incorrect: time_bucket and space_bucket MUST reflect the anticipated complexity of a typical correct approach to this problem, not the current code.",
        "- If status is correct: buckets reflect this code's complexity.",
        "- Assume worst-case and infer n_max from constraints when possible.",
        "Output JSON only, no extra text.",
      ].join("\n");

      const userMessage = [
        `Problem: ${problemInfo.title} (${problemInfo.difficulty})`,
        `Constraints: ${(problemInfo.constraints || []).join("; ")}`,
        `Language: ${lang}`,
        "User Code:",
        userCode || "(no code visible)",
      ].join("\n\n");

      const raw = await this.sendToLLM(systemPrompt, userMessage);
      let parsed;
      try {
        const jsonText = (raw || "").match(/\{[\s\S]*\}/)?.[0] || "";
        parsed = JSON.parse(jsonText);
      } catch {
        this.addMessage(
          "❌ Couldn't parse analysis. Please try again.",
          "bot",
          "error"
        );
        return;
      }

      const nMax = Math.min(Number(parsed?.n_max) || 1000, 1000000);
      const nSymbol = parsed?.n_symbol || "n";
      const timeSvg = this.renderComplexitySVG(
        parsed?.time_bucket || "O(n)",
        nMax,
        nSymbol,
        "Time Complexity"
      );
      const spaceSvg = this.renderComplexitySVG(
        parsed?.space_bucket || "O(1)",
        nMax,
        nSymbol,
        "Space Complexity"
      );

      let html = `<div style=\"margin-bottom:12px\">`;
      let verdict;
      switch (parsed?.status) {
        case "correct":
          verdict = "✅ Correct";
          break;
        case "incorrect":
          verdict = "⚠️ Likely Incorrect";
          break;
        case "incomplete":
          verdict = "🧩 Incomplete";
          break;
        case "template_only":
          verdict = "ℹ️ No code detected";
          break;
        default:
          verdict = "ℹ️ Analysis";
      }
      html += `<div style=\"font-weight:600;margin-bottom:6px\">${verdict}</div>`;
      if (parsed?.reason)
        html += `<div style=\"color:#ccc;margin-bottom:10px\">${this.escapeHtml(
          parsed.reason
        )}</div>`;
      html += `<div style=\"display:grid; gap:12px;\">${timeSvg}${spaceSvg}</div>`;
      html += `<div style=\"color:#999; font-size:12px; margin-top:8px;\">Assumptions: worst-case, asymptotic growth. Scale estimated from constraints.</div>`;
      if (parsed?.status !== "correct" && parsed?.hints) {
        html += `<div style=\"margin-top:10px; padding:10px; border-radius:8px; background: rgba(255, 255, 255, 0.05);\"><strong>Hint:</strong> ${this.escapeHtml(
          parsed.hints
        )}<br><em>Tip:</em> Try Stuck Mode for step-by-step help.</div>`;
      }
      if (parsed?.status === "correct") {
        html += `<div style=\"margin-top:10px; color:#bfbfbf; font-size:13px;\">Want a deeper walkthrough? Open <strong>Guide Me → Analyze Complexity</strong> for step-by-step intuition.</div>`;
      }
      html += `</div>`;

      this.addMessage(html, "bot", "html");
    } catch (e) {
      console.error("analyzeCurrentLeetCodeCode error", e);
      this.addMessage(`❌ Error analyzing code: ${e.message}`, "bot", "error");
    } finally {
      this.showLoading(false);
    }
  }

  escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  renderComplexitySVG(bucket, nMax, nSymbol, title) {
    const w = 360,
      h = 200,
      pad = 36;
    const plotW = w - pad * 2,
      plotH = h - pad * 2;
    const samples = 40;
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const logN = (x) => Math.log(1 + x);
    const norm = (arr) => {
      const mx = Math.max(...arr.map((p) => p.y)) || 1;
      return arr.map((p) => ({ x: p.x, y: p.y / mx }));
    };
    const gen = (fn) => {
      const pts = [];
      for (let i = 0; i <= samples; i++) {
        const x = (i / samples) * nMax;
        pts.push({ x, y: fn(x) });
      }
      return norm(pts);
    };

    const funcs = {
      "O(1)": (x) => 1,
      "O(log n)": (x) => logN(x),
      "O(n)": (x) => x,
      "O(n log n)": (x) => x * logN(x),
      "O(n^2)": (x) => (x * x) / Math.max(1, nMax),
      "O(n^3)": (x) => (x * x * x) / Math.max(1, nMax * nMax),
      "O(2^n)": (x) => Math.pow(2, x / Math.max(1, nMax / 10)),
      "O(n!)": (x) => Math.pow(x / Math.max(1, nMax), 5),
      "O(k·n)": (x) => x,
    };
    const primary = funcs[bucket] ? bucket : "O(n)";

    const refBuckets = [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n log n)",
      "O(n^2)",
      "O(n^3)",
    ];
    const toPath = (pts) =>
      pts
        .map((p, i) => {
          const px = pad + (p.x / nMax) * plotW;
          const py = pad + (1 - clamp(p.y, 0, 1)) * plotH;
          return `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`;
        })
        .join(" ");

    const refPaths = refBuckets
      .filter((b) => b !== primary && funcs[b])
      .map((b) => {
        const pts = gen(funcs[b]);
        return `<path d="${toPath(
          pts
        )}" stroke="#666" stroke-width="1" fill="none" opacity="0.25"/>`;
      })
      .join("");

    const mainPts = gen(funcs[primary]);
    const mainPath = `<path d="${toPath(
      mainPts
    )}" stroke="#a855f7" stroke-width="2.5" fill="none"/>`;

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="background:#121212;border-radius:12px;border:1px solid #2a2f3a;">
        <text x="${w / 2}" y="${
      pad - 10
    }" text-anchor="middle" fill="#e5e7eb" font-size="14" font-weight="600">${title}</text>
        <g stroke="#3a3f4b" stroke-width="1">
          <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}"/>
          <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}"/>
        </g>
        <text x="${w - pad}" y="${
      h - pad + 18
    }" text-anchor="end" fill="#9aa0a6" font-size="11">${nSymbol}</text>
        <text x="${
          pad - 6
        }" y="${pad}" text-anchor="end" fill="#9aa0a6" font-size="11">Ops</text>
        ${refPaths}
        ${mainPath}
        <text x="${w / 2}" y="${
      pad + 18
    }" text-anchor="middle" fill="#c084fc" font-size="16" font-weight="700">${primary}</text>
      </svg>
    `;
  }

  // Heuristic to detect template-only code (empty body, pass/return placeholders)
  isLikelyTemplateCode(code, lang) {
    const c = (code || "").trim();
    if (c.length < 20) return true;
    const lower = (lang || "").toLowerCase();
    // Common placeholders across languages
    const patterns = [
      /return\s+0\s*;?$/m,
      /return\s+null\s*;?$/m,
      /return\s+None\s*$/m,
      /pass\s*$/m,
      /TODO/i,
      /write\s+your\s+code/i,
    ];
    if (patterns.some((p) => p.test(c))) return true;
    // Very small number of non-whitespace lines
    const nonEmptyLines = c.split(/\n/).filter((l) => l.trim().length > 0);
    if (nonEmptyLines.length <= 3) return true;
    return false;
  }

  getCodeAnalysisPrompt(code, type) {
    const promptMap = {
      bigoh: `Analyze the time and space complexity of this code. Return only:

Time Complexity: O(...)
Space Complexity: O(...)

Code:
${code}`,
      detailed: `Analyze this code in two paragraphs:

1. Time Complexity: Explain the time complexity with reasoning
2. Space Complexity: Explain the space complexity with reasoning

Code:
${code}`,
      suggestions: `Analyze this code and provide performance improvement suggestions:

1. Current complexity analysis
2. Potential optimizations
3. Best practices recommendations

Code:
${code}`,
    };

    return promptMap[type] || promptMap.bigoh;
  }

  async getResponseFromGemini(text, type, apiKey) {
    const maxLength = 30000;
    const processedText =
      text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

    const promptMap = {
      brief: `Provide a brief response in 2-4 sentences:\n\n${processedText}`,
      detailed: `Provide a detailed response in well-structured paragraphs:\n\n${processedText}`,
      bullets: `Provide a response in 5-7 bullet points:\n\n${processedText}`,
      custom: `Provide a response in approximately ${this.currentOptions.customWordCount} words:\n\n${processedText}`,
    };

    const prompt = promptMap[type] || promptMap.brief;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated"
    );
  }

  addMessage(content, sender, type = "normal") {
    // Ensure styles for enhanced UI elements
    this.ensureThinkingStyles();
    this.ensureCodeCardStyles();
    const messagesContainer = document.getElementById("chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let avatarContent = "";
    if (sender === "bot") {
      avatarContent = '<img src="../assets/icon.png" alt="GistiFi">';
    } else {
      avatarContent = "You";
    }

    let messageClass = "message-bubble";
    if (type === "error") messageClass += " error-message";
    if (type === "code") messageClass += " code-message";

    messageDiv.innerHTML = `
      <div class="message-avatar">${avatarContent}</div>
      <div class="message-content">
        <div class="${messageClass}">
          ${this.formatMessage(content, type)}
        </div>
        <div class="message-time">${time}</div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Save to chat history
    this.saveChatHistory();
    // Also snapshot current HTML per channel so mode-specific reload restores correctly
    try {
      const channel = this.isLeetCodeModeActive() ? "leetcode" : "regular";
      this.saveCurrentChatHTML(channel);
    } catch (e) {
      console.warn("Failed to snapshot chat HTML after message", e);
    }
    // Wire up copy buttons for any code cards in this message
    try {
      messageDiv.querySelectorAll(".code-card .copy-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const card = btn.closest(".code-card");
          const codeEl = card?.querySelector("pre code");
          // Prefer exact raw text if available
          const rawB64 = codeEl?.getAttribute("data-raw-b64");
          let codeText = "";
          if (rawB64) {
            try {
              codeText = decodeURIComponent(escape(atob(rawB64)));
            } catch (e) {
              codeText = codeEl ? codeEl.innerText : "";
            }
          } else {
            codeText = codeEl ? codeEl.innerText : "";
          }
          if (codeText) {
            navigator.clipboard.writeText(codeText).then(
              () => {
                const original = btn.textContent;
                btn.textContent = "Copied";
                btn.classList.add("copied");
                setTimeout(() => {
                  btn.textContent = original;
                  btn.classList.remove("copied");
                }, 1200);
              },
              () => {
                btn.textContent = "Copy failed";
                setTimeout(() => (btn.textContent = "Copy"), 1200);
              }
            );
          }
        });
      });
    } catch (e) {
      console.warn("Failed to bind copy buttons", e);
    }
  }

  formatMessage(content, type) {
    if (type === "html") {
      // Return HTML content directly without processing
      return content;
    }

    // If content contains fenced code blocks, render them as code cards
    const hasFenced = /```[\s\S]*?```/.test(content);
    if (hasFenced || type === "code") {
      return this.renderCodeCards(content);
    }

    // Convert newlines to <br> and handle basic formatting
    return content
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
  }

  renderCodeCards(text) {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let html = "";
    let match;

    while ((match = regex.exec(text)) !== null) {
      let before = text
        .slice(lastIndex, match.index)
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");

      const lang = (match[1] || "code").toLowerCase();
      // If the previous line is exactly the language label (e.g., "cpp"), drop it
      const parts = before.split("<br>");
      if (
        parts.length &&
        parts[parts.length - 1].trim().toLowerCase() === lang
      ) {
        parts.pop();
        before = parts.join("<br>");
      }
      html += before;
      const rawCode = match[2];
      const codeEscaped = rawCode
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      // No syntax highlighting for now; display plain escaped code
      const highlighted = codeEscaped;
      const rawB64 = btoa(unescape(encodeURIComponent(rawCode)));

      html += `
        <div class="code-card">
          <div class="code-card-header">
            <span class="lang">${lang}</span>
            <button class="copy-btn" type="button">Copy</button>
          </div>
          <pre><code class="language-${lang}" data-raw-b64="${rawB64}">${highlighted}</code></pre>
        </div>
      `;

      lastIndex = regex.lastIndex;
    }

    // Append any trailing text after last code block
    const tail = text
      .slice(lastIndex)
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
    html += tail;
    return html;
  }

  ensureCodeCardStyles() {
    if (document.getElementById("gistifi-codecard-style")) return;
    const style = document.createElement("style");
    style.id = "gistifi-codecard-style";
    style.textContent = `
      .code-card { background: #0f1115; border: 1px solid #2a2f3a; border-radius: 10px; overflow: hidden; margin: 10px 0; }
      .code-card-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #12151c; border-bottom: 1px solid #2a2f3a; }
      .code-card-header .lang { font-size: 12px; color: #9aa0a6; text-transform: uppercase; letter-spacing: 0.04em; }
      .code-card-header .copy-btn { font-size: 12px; background: linear-gradient(135deg,rgb(168, 199, 229) 0%,rgb(32, 113, 199) 100%); color: #0b141a; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: transform .12s ease, opacity .2s ease; font-weight: 600; }
      .code-card-header .copy-btn:hover { opacity: 0.95; transform: translateY(-1px); }
      .code-card-header .copy-btn.copied { background: linear-gradient(135deg,rgb(248, 223, 98) 0%,rgb(244, 174, 21) 100%); color: #1a1a1a; }
      .code-card pre { margin: 0; padding: 12px; overflow: auto; font-size: 12px; line-height: 1.55; }
      .code-card pre code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #e6edf3; }
      .token.comment { color: #8b949e; }
      .token.keyword { color: #ff7b72; }
      .token.string { color: #a5d6ff; }
      .token.number { color: #79c0ff; }
      .token.function { color: #d2a8ff; }
      .token.type { color: #ffa657; }
    `;
    document.head.appendChild(style);
  }

  highlightEscapedCode(code, lang) {
    const lower = (lang || "").toLowerCase();
    const isCpp = ["cpp", "c++", "cc", "c"].includes(lower);
    const isJs = ["js", "javascript", "ts", "typescript"].includes(lower);
    const isPy = ["py", "python"].includes(lower);

    let result = code;

    if (isPy) {
      result = result.replace(
        /(^|<br>)\s*#.*/g,
        (m) => `<span class="token comment">${m}</span>`
      );
    }
    if (isCpp || isJs) {
      result = result
        .replace(
          /\/\/.*?(?=<br>|$)/g,
          (m) => `<span class="token comment">${m}</span>`
        )
        .replace(
          /\/\*[\s\S]*?\*\//g,
          (m) => `<span class=\"token comment\">${m}</span>`
        );
    }

    result = result
      .replace(
        /&quot;[\s\S]*?&quot;/g,
        (m) => `<span class="token string">${m}</span>`
      )
      .replace(/'[^']*'/g, (m) => `<span class="token string">${m}</span>`);

    result = result.replace(
      /(?<![\w_])(\d+(?:\.\d+)?)(?![\w_])/g,
      `<span class="token number">$1</span>`
    );

    const kw = isPy
      ? [
          "def",
          "class",
          "return",
          "if",
          "elif",
          "else",
          "for",
          "while",
          "in",
          "and",
          "or",
          "not",
          "import",
          "from",
          "as",
          "None",
          "True",
          "False",
          "try",
          "except",
          "with",
          "pass",
          "break",
          "continue",
          "lambda",
        ]
      : [
          "auto",
          "bool",
          "break",
          "case",
          "catch",
          "char",
          "class",
          "const",
          "continue",
          "default",
          "delete",
          "do",
          "double",
          "else",
          "enum",
          "explicit",
          "extern",
          "false",
          "float",
          "for",
          "friend",
          "goto",
          "if",
          "inline",
          "int",
          "long",
          "namespace",
          "new",
          "operator",
          "private",
          "protected",
          "public",
          "register",
          "return",
          "short",
          "signed",
          "sizeof",
          "static",
          "struct",
          "switch",
          "template",
          "this",
          "throw",
          "true",
          "try",
          "typedef",
          "typename",
          "union",
          "unsigned",
          "virtual",
          "void",
          "volatile",
          "while",
          "consteval",
          "constexpr",
          "constinit",
          "let",
          "var",
          "function",
          "import",
          "export",
          "from",
          "as",
        ];
    const kwRegex = new RegExp(`(?<![\\w_])(${kw.join("|")})(?![\\w_])`, "g");
    result = result.replace(kwRegex, `<span class="token keyword">$1</span>`);

    result = result.replace(
      /(?<![\w_\.])([a-zA-Z_][\w_]*)\s*(?=\()/g,
      `<span class="token function">$1</span>`
    );

    if (isCpp || lower === "ts" || lower === "typescript") {
      result = result.replace(
        /(?<![\w_])(string|int|long|float|double|bool|void|size_t|std::\w+|vector|map|set)(?![\w_])/g,
        `<span class="token type">$1</span>`
      );
    }

    return result;
  }

  promptCodeAnalysis() {
    // Update dynamic island to show current action
    this.updateModeIndicator(true, "Analyze Code");

    const chatInput = document.getElementById("chat-input");
    chatInput.value = "Paste your code here for analysis...";
    chatInput.focus();
    chatInput.select();
  }

  /**
   * Add settings button to chat
   */
  addSettingsButton() {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "settings-button-container";
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: center;
      margin: 15px 0;
    `;

    const button = document.createElement("button");
    button.className = "settings-btn";
    button.innerHTML = "⚙️ Open Settings";
    button.style.cssText = `
      padding: 12px 24px;
      border: 2px solid #007bff;
      border-radius: 8px;
      background: #007bff;
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
    `;

    button.addEventListener("mouseenter", () => {
      button.style.background = "#0056b3";
      button.style.borderColor = "#0056b3";
    });

    button.addEventListener("mouseleave", () => {
      button.style.background = "#007bff";
      button.style.borderColor = "#007bff";
    });

    button.addEventListener("click", () => {
      this.openSettings();
    });

    buttonContainer.appendChild(button);

    // Add the button to the chat
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      chatContainer.appendChild(buttonContainer);
    }
  }

  /**
   * Send message to LLM for normal chat conversation
   */
  async sendToLLMForChat(userMessage) {
    try {
      console.log("sendToLLMForChat called with message:", userMessage);

      // Get Gemini API key
      const { geminiApiKey } = await chrome.storage.sync.get(["geminiApiKey"]);
      if (!geminiApiKey) {
        console.log("No API key found");
        this.addMessage(
          "🔑 **API Key Required**: Please set your Gemini API key in the extension settings to use chat mode.",
          "bot",
          "error"
        );
        return;
      }

      // Build context-aware system prompt
      let systemPrompt = "You are GistiFi, a helpful AI coding assistant. ";

      if (this.isLeetCodeModeActive()) {
        // Get current problem context if available
        let problemContext = "";
        try {
          const problemInfo = await this.getLeetCodeProblemInfo();
          if (problemInfo && problemInfo.title) {
            problemContext = `\n\nCurrent Context: You're helping with LeetCode problem "${problemInfo.title}" (${problemInfo.difficulty}). The user is in the Resources section and can access:\n- YouTube video solutions\n- LeetCode resources (explore cards, discuss, problems)\n- Learning materials (GeeksforGeeks, HackerRank, etc.)\n- Books and courses\n- Practice tips\n\nYou should help explain resources, suggest features like Guide Me mode or code analysis, and answer questions about the current problem.`;
          }
        } catch (error) {
          console.log("Could not get problem context:", error);
        }

        systemPrompt += `You're in LeetCode mode helping with coding problems.${problemContext}\n\nBe helpful, suggest exploring other features like Guide Me mode or code complexity analysis, and maintain conversation context.`;
      } else {
        systemPrompt +=
          "You're in regular mode helping with general web page content. Be helpful and suggest using the available features.";
      }

      // Send to LLM
      const response = await this.sendToLLM(systemPrompt, userMessage);

      if (response) {
        this.addMessage(response, "bot");
      } else {
        this.addMessage(
          "❌ No response generated. Please try again.",
          "bot",
          "error"
        );
      }
    } catch (error) {
      console.error("Error in chat mode:", error);

      if (error.message.includes("API key")) {
        this.addMessage(
          "🔑 **API Key Required**: Please set your Gemini API key in the extension settings to use chat mode.",
          "bot",
          "error"
        );
      } else if (error.message.includes("API request failed")) {
        this.addMessage(
          "🌐 **Network Error**: Unable to connect to AI service. Please check your internet connection and try again.",
          "bot",
          "error"
        );
      } else {
        this.addMessage(
          `❌ **AI Service Error**: ${error.message}. Please try again later.`,
          "bot",
          "error"
        );
      }
    }
  }

  /**
   * Send message to LLM for Guide Me mode
   */
  async sendToLLM(systemPrompt, userMessage) {
    try {
      // Get Gemini API key
      const { geminiApiKey } = await chrome.storage.sync.get(["geminiApiKey"]);
      if (!geminiApiKey) {
        throw new Error(
          "Please set your Gemini API key in settings first to use Guide Me mode."
        );
      }

      // Build the complete prompt
      const completePrompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`;

      // Send to Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: completePrompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
              topP: 0.8,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API request failed");
      }

      const data = await response.json();
      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response generated";

      // Clean up the response
      return responseText.trim();
    } catch (error) {
      console.error("Error sending to LLM:", error);
      throw error;
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  clearChat() {
    const messagesContainer = document.getElementById("chat-messages");

    // Store welcome messages before clearing
    const regularWelcome = document.getElementById("regular-welcome");
    const leetcodeWelcome = document.getElementById("leetcode-welcome");

    // Clear all messages
    messagesContainer.innerHTML = "";

    // Restore the appropriate welcome message based on current mode
    if (this.isLeetCodeModeActive()) {
      if (leetcodeWelcome) {
        messagesContainer.appendChild(leetcodeWelcome.cloneNode(true));
      }
    } else {
      if (regularWelcome) {
        messagesContainer.appendChild(regularWelcome.cloneNode(true));
      }
    }

    // Clear chat history
    if (this.currentTabId) {
      chrome.storage.local.remove(`chat_history_${this.currentTabId}`);
    }
  }

  openOptionsModal() {
    document.getElementById("options-modal").classList.remove("hidden");
  }

  closeOptionsModal() {
    document.getElementById("options-modal").classList.add("hidden");
  }

  handleResponseTypeChange() {
    const responseType = document.getElementById("response-type").value;
    const customLengthGroup = document.getElementById("custom-length-group");

    if (responseType === "custom") {
      customLengthGroup.style.display = "block";
    } else {
      customLengthGroup.style.display = "none";
    }
  }

  applyOptions() {
    this.currentOptions = {
      responseType: document.getElementById("response-type").value,
      analysisType: document.getElementById("analysis-type").value,
      customWordCount:
        parseInt(document.getElementById("custom-word-count").value) || 200,
    };

    this.closeOptionsModal();
    this.addMessage(
      "Response options updated! Your next requests will use these settings.",
      "bot"
    );
  }

  showLoading(show) {
    // Fancy thinking animation inside the chat instead of a blocking overlay
    if (show) {
      this.ensureThinkingStyles();
      if (!this.thinkingMessageEl) {
        const messagesContainer = document.getElementById("chat-messages");
        const wrapper = document.createElement("div");
        wrapper.className = "message bot-message";
        wrapper.innerHTML = `
          <div class="message-avatar"><img src="../assets/icon.png" alt="GistiFi"></div>
          <div class="message-content">
            <div class="message-bubble thinking-bubble">
              <span class="thinking-dot"></span>
              <span class="thinking-dot"></span>
              <span class="thinking-dot"></span>
              <span class="thinking-dot"></span>
            </div>
            <div class="message-time">&nbsp;</div>
          </div>
        `;
        this.thinkingMessageEl = wrapper;
        messagesContainer.appendChild(wrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    } else {
      if (this.thinkingMessageEl && this.thinkingMessageEl.parentNode) {
        this.thinkingMessageEl.parentNode.removeChild(this.thinkingMessageEl);
      }
      this.thinkingMessageEl = null;
    }
  }

  ensureThinkingStyles() {
    if (document.getElementById("gistifi-thinking-style")) return;
    const style = document.createElement("style");
    style.id = "gistifi-thinking-style";
    style.textContent = `
      @keyframes gistifi-bounce {
        0%, 80%, 100% { transform: translateY(1px) scale(0.7); opacity: 0.5; }
        40% { transform: translateY(-2px) scale(1); opacity: 0.95; }
      }
      @keyframes gistifi-shimmer {
        0% { background-position: -80px 0; }
        100% { background-position: 80px 0; }
      }
      .thinking-bubble { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 12px; background: linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%); background-size: 160px 100%; animation: gistifi-shimmer 1.6s linear infinite; }
      .thinking-dot {
        width: 4px; height: 4px; border-radius: 50%; background: #b6bcc2;
        display: inline-block; animation: gistifi-bounce 1.2s infinite ease-in-out both;
      }
      .thinking-dot:nth-child(1) { animation-delay: -0.27s; }
      .thinking-dot:nth-child(2) { animation-delay: -0.18s; }
      .thinking-dot:nth-child(3) { animation-delay: -0.09s; }
      .thinking-dot:nth-child(4) { animation-delay: 0s; }
    `;
    document.head.appendChild(style);
  }

  async saveChatHistory() {
    if (!this.currentTabId) return;

    const messagesContainer = document.getElementById("chat-messages");
    const messages = Array.from(messagesContainer.children).map((msg) => ({
      content: msg.querySelector(".message-bubble").innerHTML,
      sender: msg.classList.contains("user-message") ? "user" : "bot",
      time: msg.querySelector(".message-time").textContent,
    }));

    await chrome.storage.local.set({
      [`chat_history_${this.currentTabId}`]: messages,
    });
  }

  async loadChatHistory() {
    if (!this.currentTabId) return;

    try {
      const result = await chrome.storage.local.get([
        `chat_history_${this.currentTabId}`,
      ]);
      const history = result[`chat_history_${this.currentTabId}`];

      if (history && history.length > 0) {
        // More than just welcome message
        const messagesContainer = document.getElementById("chat-messages");
        messagesContainer.innerHTML = ""; // Clear welcome message

        history.forEach((msg) => {
          this.addMessageFromHistory(msg.content, msg.sender, msg.time);
        });
        // Scroll to latest message after restore
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }

  addMessageFromHistory(content, sender, time) {
    const messagesContainer = document.getElementById("chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    let avatarContent = "";
    if (sender === "bot") {
      avatarContent = '<img src="../assets/icon.png" alt="GistiFi">';
    } else {
      avatarContent = "You";
    }

    messageDiv.innerHTML = `
      <div class="message-avatar">${avatarContent}</div>
      <div class="message-content">
        <div class="message-bubble">${content}</div>
        <div class="message-time">${time}</div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
  }

  setupCloseDetection() {
    // Detect when the side panel is closed by listening for beforeunload
    window.addEventListener("beforeunload", () => {
      // Persist current chat HTML snapshot for active channel before closing
      try {
        const channel = this.isLeetCodeModeActive() ? "leetcode" : "regular";
        this.saveCurrentChatHTML(channel);
      } catch (e) {
        console.warn("Failed to save chat HTML on unload", e);
      }
      // Notify background and content script that side panel is closing
      if (this.currentTabId) {
        try {
          // Update background state
          chrome.runtime.sendMessage({
            type: "SIDE_PANEL_STATE_CHANGED",
            tabId: this.currentTabId,
            isOpen: false,
          });

          // Notify content script
          chrome.tabs.sendMessage(this.currentTabId, {
            type: "SIDE_PANEL_CLOSED",
          });
        } catch (error) {
          console.log("Could not notify of side panel close");
        }
      }
    });

    // Also detect when the document becomes hidden (side panel closed)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.currentTabId) {
        // Persist snapshot when panel becomes hidden
        try {
          const channel = this.isLeetCodeModeActive() ? "leetcode" : "regular";
          this.saveCurrentChatHTML(channel);
        } catch (e) {
          console.warn("Failed to save chat HTML on hide", e);
        }
        try {
          // Update background state
          chrome.runtime.sendMessage({
            type: "SIDE_PANEL_STATE_CHANGED",
            tabId: this.currentTabId,
            isOpen: false,
          });

          // Notify content script
          chrome.tabs.sendMessage(this.currentTabId, {
            type: "SIDE_PANEL_CLOSED",
          });
        } catch (error) {
          console.log("Could not notify of side panel close");
        }
      }
    });
  }

  async promptGuideMe() {
    try {
      // Check if API key is set
      const { geminiApiKey } = await chrome.storage.sync.get(["geminiApiKey"]);
      if (!geminiApiKey) {
        this.addMessage(
          "🔑 **API Key Required**: Please set your Gemini API key in the extension settings to use Guide Me mode.\n\n" +
            "Click the button below to open settings:",
          "bot",
          "error"
        );

        // Add settings button
        this.addSettingsButton();
        return;
      }

      // Get current problem info
      const problemInfo = await this.getLeetCodeProblemInfo();

      if (!problemInfo || !problemInfo.title) {
        this.addMessage(
          "❌ Could not detect a LeetCode problem. Please make sure you're on a LeetCode problem page.",
          "bot",
          "error"
        );
        return;
      }

      // Initialize Guide Me components
      if (!this.guideMePrompts) {
        this.guideMePrompts = new GuideMePrompts();
      }

      // Start Guide Me session
      this.guideMeSession = new GuideMeSession(
        problemInfo,
        problemInfo.userCode || ""
      );
      this.guideMeSession.startSession();

      // No welcome message needed - user already selected a topic
      // The dynamic island will show the current mode
    } catch (error) {
      console.error("Error starting Guide Me:", error);
      this.addMessage(
        "❌ Error starting Guide Me mode. Please try again.",
        "bot",
        "error"
      );
    }
  }

  async debugProblemExtraction() {
    this.addMessage("🔍 **Debug: Testing Problem Extraction**", "bot");

    try {
      const problemInfo = await this.getLeetCodeProblemInfo();

      this.addMessage(
        `**Extraction Results:**<br>` +
          `• Title: ${problemInfo.title}<br>` +
          `• Difficulty: ${problemInfo.difficulty}<br>` +
          `• Category: ${problemInfo.category}<br>` +
          `• Problem Statement: ${
            problemInfo.problemStatement
              ? "Found (" + problemInfo.problemStatement.length + " chars)"
              : "Not found"
          }<br>` +
          `• Examples: ${
            problemInfo.examples ? problemInfo.examples.length : 0
          } found<br>` +
          `• Constraints: ${
            problemInfo.constraints ? problemInfo.constraints.length : 0
          } found<br>` +
          `• URL: ${problemInfo.url}<br><br>` +
          `Check the browser console for detailed extraction logs.`,
        "bot"
      );

      // Also log to console for debugging
      console.log("Debug extraction complete:", problemInfo);
    } catch (error) {
      this.addMessage(`❌ **Debug Error:** ${error.message}`, "bot", "error");
      console.error("Debug extraction error:", error);
    }
  }

  async getLeetCodeProblemInfo() {
    try {
      // Try to get problem info from the current page
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab && tab.url && tab.url.includes("leetcode.com")) {
        // Send message to content script to extract problem info
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: "GET_LEETCODE_PROBLEM_INFO",
        });

        if (response && response.problemInfo) {
          console.log(
            "Successfully got problem info:",
            response.problemInfo.title
          );
          return response.problemInfo;
        } else {
          console.log("No problem info in response");
        }
      } else {
        console.log("Not a LeetCode page or no tab found");
      }

      // Fallback to default info
      console.log("Using fallback problem info");
      return {
        title: "Current LeetCode Problem",
        difficulty: "Unknown",
        category: "Algorithm",
        problemStatement: "",
        examples: [],
        constraints: [],
        url: tab ? tab.url : window.location.href,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting LeetCode problem info:", error);
      return {
        title: "Current LeetCode Problem",
        difficulty: "Unknown",
        category: "Algorithm",
        problemStatement: "",
        examples: [],
        constraints: [],
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async showResources() {
    // Update dynamic island to show current action
    this.updateModeIndicator(true, "Resources");

    // Check if we're on a LeetCode problem page
    const currentTab = await this.getCurrentTab();
    const isProblemPage =
      currentTab && currentTab.url && currentTab.url.includes("/problems/");

    if (!isProblemPage) {
      this.addMessage(
        `⚠️ **Not a LeetCode Problem Page**\n\n` +
          `To access problem-specific resources (including YouTube videos), please navigate to a LeetCode problem page.\n\n` +
          `**Current page:** ${currentTab?.url || "Unknown"}\n\n` +
          `**Required format:** \`https://leetcode.com/problems/[problem-name]/\`\n\n` +
          `Please go to a LeetCode problem page and try again! 📚`,
        "bot"
      );
      return;
    }

    // Extract base problem URL (remove /description/ or other suffixes)
    const problemMatch = currentTab.url.match(
      /leetcode\.com\/problems\/([^\/]+)/
    );
    if (!problemMatch) {
      this.addMessage(
        `❌ **Invalid LeetCode URL**\n\n` +
          `Could not extract problem name from URL.\n\n` +
          `**Current page:** ${currentTab?.url || "Unknown"}`,
        "bot"
      );
      return;
    }

    // Use the base problem URL for all operations
    const problemName = problemMatch[1];
    const baseProblemUrl = `https://leetcode.com/problems/${problemName}/`;

    // Start with basic resources message
    let resourcesMessage = `
      <div style="margin-bottom: 24px; text-align: center;">
        <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 12px; font-weight: 600;">
          📚 Resources & Learning Materials
        </h2>
        <p style="color: #cccccc; font-size: 16px; line-height: 1.5;">
          I've gathered some helpful resources for "${problemName
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())}".<br>
          These include video explanations, related problems, and learning materials to deepen your understanding.
        </p>
      </div>
    `;

    // Try to get YouTube videos if available
    let youtubeVideos = [];
    console.log("YouTube service status:", this.youtubeService?.getStatus());

    if (this.youtubeService && this.youtubeService.isAvailable()) {
      console.log("YouTube service is available, searching for videos...");
      try {
        // Try to get problem info from Guide Me session or current page
        let problemTitle = "LeetCode Problem";
        let difficulty = "";

        if (this.guideMeSession && this.guideMeSession.problemInfo) {
          problemTitle = this.guideMeSession.problemInfo.title;
          difficulty = this.guideMeSession.problemInfo.difficulty;
          console.log("Using Guide Me session info:", {
            problemTitle,
            difficulty,
          });
        } else {
          // Extract from current page
          // Use the already extracted problem name
          problemTitle = problemName
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          console.log("Using problem title:", problemTitle);
        }

        // Try to get programming language from LeetCode UI
        let programmingLanguage = "";
        try {
          programmingLanguage = await this.getLeetCodeProgrammingLanguage();
          console.log("Detected programming language:", programmingLanguage);
        } catch (error) {
          console.log("Could not detect programming language:", error);
        }

        console.log("Searching YouTube with:", {
          problemTitle,
          difficulty,
          programmingLanguage,
        });
        youtubeVideos = await this.youtubeService.searchLeetCodeVideos(
          problemTitle,
          difficulty,
          programmingLanguage,
          true // We've already validated it's a problem page
        );
        console.log("YouTube search results:", youtubeVideos);
      } catch (error) {
        console.log("YouTube videos unavailable:", error);
      }
    } else {
      console.log(
        "YouTube service not available. Status:",
        this.youtubeService?.getStatus()
      );
    }

    // Add YouTube videos if available
    if (youtubeVideos.length > 0) {
      console.log("Adding YouTube videos to resources:", youtubeVideos.length);
      resourcesMessage += `
        <div style="margin-bottom: 16px;">
          <h3 style="color: #ffffff; font-size: 20px; margin-bottom: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">🎥</span> Video Solutions
          </h3>
          <p style="color: #cccccc; font-size: 14px; margin-bottom: 16px;">
            Watch detailed explanations and step-by-step solutions from top educators:
          </p>
        </div>
      `;

      // Create HTML content for videos to embed in chat
      let videosHTML = "";
      youtubeVideos.forEach((video, index) => {
        videosHTML += `
            <a href="${
              video.url
            }" target="_blank" style="text-decoration: none; display: block;">
              <div class="youtube-video-card" style="margin: 12px 0; padding: 16px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border: 1px solid #404040; border-radius: 12px; display: flex; gap: 16px; align-items: flex-start; transition: all 0.3s ease; cursor: pointer;">
                <div style="position: relative; width: 160px; height: 90px; flex-shrink: 0; overflow: hidden; border-radius: 8px;">
                  <img src="${video.thumbnail}" alt="${
          video.title
        }" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
                  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 60, 60, 0.9); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; opacity: 0.9; transition: opacity 0.3s ease;">▶️</div>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #ffffff; line-height: 1.4;">${
                    video.title
                  }</h4>
                  <p style="margin: 0 0 12px 0; font-size: 14px; color: #cccccc; font-weight: 500;">📺 ${
                    video.channelTitle
                  }</p>
                  <div style="display: flex; gap: 16px; margin-bottom: 16px; font-size: 12px; color: #888888;">
                    <span>👁️ ${this.formatNumber(video.viewCount)}</span>
                    <span>👍 ${this.formatNumber(video.likeCount)}</span>
                    <span>📅 ${video.duration}</span>
                  </div>
                </div>
              </div>
            </a>
          `;
      });

      // Add the videos HTML to the message
      resourcesMessage += videosHTML;
    } else if (this.youtubeService && !this.youtubeService.isAvailable()) {
      console.log("YouTube service not available, showing API key message");
      resourcesMessage += `
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 12px; text-align: center;">
          <h3 style="color: #ffffff; font-size: 20px; margin-bottom: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 24px;">🎥</span> Video Solutions
          </h3>
          <p style="color: #cccccc; font-size: 14px; line-height: 1.5;">
            To see video solutions, please add your YouTube API key in settings.<br>
            This will enable personalized video recommendations for each problem.
          </p>
          <button onclick="document.getElementById('settings-btn').click()" style="margin-top: 12px; background: linear-gradient(135deg, #ff3c3c 0%, #d62828 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;">
            Configure YouTube API
          </button>
        </div>
      `;
    } else if (
      youtubeVideos.length === 0 &&
      this.youtubeService &&
      this.youtubeService.isAvailable()
    ) {
      console.log("YouTube service available but no videos found");
      resourcesMessage += `
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 12px; text-align: center;">
          <h3 style="color: #ffffff; font-size: 20px; margin-bottom: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 24px;">🎥</span> Video Solutions
          </h3>
          <p style="color: #cccccc; font-size: 14px; line-height: 1.5;">
            No video solutions found for this problem at the moment.<br>
            Try checking back later or explore the other learning resources below.
          </p>
        </div>
      `;
    }

    // Add other resources with modern UI
    resourcesMessage += `
      <div style="margin-top: 24px;">
        <div style="background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; color: white; font-size: 18px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🔗</span> LeetCode Resources
          </h3>
          <div style="display: grid; gap: 8px;">
            <a href="https://leetcode.com/explore/" target="_blank" class="resource-link" style="color: white; text-decoration: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
              <span style="font-size: 16px;">📘</span> LeetCode Explore Cards
            </a>
            <a href="https://leetcode.com/discuss/" target="_blank" class="resource-link" style="color: white; text-decoration: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
              <span style="font-size: 16px;">💬</span> LeetCode Discuss
            </a>
            <a href="https://leetcode.com/problemset/all/" target="_blank" class="resource-link" style="color: white; text-decoration: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
              <span style="font-size: 16px;">📝</span> LeetCode Problems
            </a>
            <a href="${baseProblemUrl}solutions/" target="_blank" class="resource-link" style="color: white; text-decoration: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
              <span style="font-size: 16px;">🏆</span> View Top Solutions & Discussions
            </a>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; color: white; font-size: 18px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">💡</span> Practice Tips
          </h3>
          <div style="display: grid; gap: 8px; color: white;">
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
              • Start with Easy problems and gradually increase difficulty
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
              • Focus on understanding patterns rather than memorizing solutions
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
              • Practice explaining your solutions out loud
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
              • Review and optimize your solutions
            </div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; color: white; font-size: 18px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
            <span style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">📖</span> Learning Materials
            </span>
            <span class="dropdown-icon" style="font-size: 16px; transition: transform 0.3s ease;">▶</span>
          </h3>
          <div id="learning-materials" class="expandable-section" style="display: none; grid; gap: 8px;">
            <a href="https://www.geeksforgeeks.org/" target="_blank" class="resource-link" style="color: white; text-decoration: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
              <span style="font-size: 16px;">🌟</span> GeeksforGeeks
            </a>
            <a href="https://www.hackerrank.com/" target="_blank" class="resource-link" style="color: white; text-decoration: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
              <span style="font-size: 16px;">💻</span> HackerRank
            </a>
            <a href="https://www.algoexpert.io/" target="_blank" class="resource-link" style="color: white; text-decoration: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
              <span style="font-size: 16px;">🧠</span> AlgoExpert
            </a>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; color: white; font-size: 18px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
            <span style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">📚</span> Books & Courses
            </span>
            <span class="dropdown-icon" style="font-size: 16px; transition: transform 0.3s ease;">▶</span>
          </h3>
          <div id="books-courses" class="expandable-section" style="display: none; grid; gap: 8px;">
            <div style="color: white; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">📗</span> "Cracking the Coding Interview" by Gayle McDowell
            </div>
            <div style="color: white; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">📘</span> "Introduction to Algorithms" (CLRS)
            </div>
            <a href="https://leetcode.com/subscribe/" target="_blank" class="resource-link" style="color: white; text-decoration: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
              <span style="font-size: 16px;">⭐</span> LeetCode Premium
            </a>
          </div>
        </div>


      </div>

      <div style="text-align: center; margin-top: 24px; font-size: 16px;">Happy learning! 🚀</div>
    `;

    this.addMessage(resourcesMessage, "bot", "html");

    // Add the toggle functionality script
    this.addToggleScript();
  }

  /**
   * Get the currently selected programming language from LeetCode UI
   */
  async getLeetCodeProgrammingLanguage() {
    try {
      // Send message to content script to get the current language
      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        type: "GET_LEETCODE_LANGUAGE",
      });

      if (response && response.language) {
        return response.language;
      }

      return "";
    } catch (error) {
      console.log("Error getting LeetCode language:", error);
      return "";
    }
  }

  /**
   * Initialize YouTube service
   */
  async initializeYouTubeService() {
    try {
      console.log("Initializing YouTube service...");
      console.log(
        "YouTubeService available:",
        typeof YouTubeService !== "undefined"
      );

      if (typeof YouTubeService !== "undefined") {
        this.youtubeService = new YouTubeService();
        console.log("YouTubeService instance created");

        const initialized = await this.youtubeService.initialize();
        console.log("YouTube service initialization result:", initialized);

        const status = this.youtubeService.getStatus();
        console.log("YouTube service status:", status);

        if (initialized) {
          console.log("✅ YouTube service initialized successfully");
        } else {
          console.log("❌ YouTube service initialization failed");
        }
      } else {
        console.log("❌ YouTubeService class not found");
      }
    } catch (error) {
      console.error("Error initializing YouTube service:", error);
    }
  }

  /**
   * Format large numbers for display
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  /**
   * Show Guide Me feature selection buttons
   */
  showGuideMeFeatures() {
    if (!this.guideMeSession) return;

    const availableFeatures = this.guideMeSession.getAvailableFeatures();

    if (availableFeatures.length === 0) {
      this.addMessage(
        "🎉 All topics have been explored! Check the Resources section for more learning materials.",
        "bot"
      );
      return;
    }

    // Create clean welcome message with feature selection
    const problemInfo = this.guideMeSession.problemInfo;
    let message = `**Guide Me Mode** - ${problemInfo.title} (${problemInfo.difficulty})\n\n`;
    message += `I'm here to help you understand this problem step by step. Choose what you'd like to explore:\n\n`;

    availableFeatures.forEach((feature) => {
      message += `**${feature.label}**\n`;
      message += `${feature.description}\n\n`;
    });

    this.addMessage(message, "bot");

    // Add feature selection buttons to the UI
    this.addFeatureSelectionButtons(availableFeatures);
  }

  /**
   * Add feature selection buttons to the UI
   */
  addFeatureSelectionButtons(features) {
    // Create a container for the buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "guide-me-features";

    features.forEach((feature) => {
      const button = document.createElement("button");
      button.className = "guide-me-feature-btn";
      button.innerHTML = `${feature.label}`;

      button.addEventListener("click", () => {
        this.exploreFeature(feature.id);
        buttonContainer.remove(); // Remove buttons after selection
      });

      buttonContainer.appendChild(button);
    });

    // Add the buttons to the chat
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      chatContainer.appendChild(buttonContainer);
    }
  }

  /**
   * Explore a specific Guide Me feature
   */
  async exploreFeature(featureId) {
    if (!this.guideMeSession || !this.guideMePrompts) {
      this.addMessage(
        "❌ Guide Me session not initialized. Please try again.",
        "bot",
        "error"
      );
      return;
    }

    try {
      // Set current focus
      this.guideMeSession.setCurrentFocus(featureId);

      // Update dynamic island to show current topic
      const feature = this.guideMeSession.getFeature(featureId);
      this.updateModeIndicator(true, feature.label);

      // Show exploration message with integrated conversation prompt
      this.addMessage(
        `🔍 **${feature.label}**\n\n` +
          `Let me help you understand this aspect of **${this.guideMeSession.problemInfo.title}**...\n\n` +
          `💬 I'm here to help! Ask questions or select another topic from the Guide Me button above.`,
        "bot"
      );

      // Build system prompt for this feature
      const context = this.guideMeSession.buildLLMContext();
      const systemPrompt = this.guideMePrompts.buildFeaturePrompt(
        featureId,
        context
      );

      // Send to LLM
      try {
        const response = await this.sendToLLM(
          systemPrompt,
          `I want to explore: ${feature.label}`
        );

        if (response) {
          // Add LLM response
          this.addMessage(response, "bot");

          // Update session state
          this.guideMeSession.addExploredTopic(featureId);

          // Start conversation mode for this feature
          this.startFeatureConversation(featureId);
        } else {
          this.addMessage(
            "❌ No response generated from AI. Please try again.",
            "bot",
            "error"
          );
        }
      } catch (llmError) {
        console.error("LLM Error:", llmError);

        if (llmError.message.includes("API key")) {
          this.addMessage(
            "🔑 **API Key Required**: Please set your Gemini API key in the extension settings to use Guide Me mode.",
            "bot",
            "error"
          );
        } else if (llmError.message.includes("API request failed")) {
          this.addMessage(
            "🌐 **Network Error**: Unable to connect to AI service. Please check your internet connection and try again.",
            "bot",
            "error"
          );
        } else {
          this.addMessage(
            `❌ **AI Service Error**: ${llmError.message}. Please try again later.`,
            "bot",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Error exploring feature:", error);
      this.addMessage(
        "❌ Error exploring feature. Please try again.",
        "bot",
        "error"
      );
    }
  }

  /**
   * Start conversation mode for a specific feature
   */
  startFeatureConversation(featureId) {
    if (!this.guideMeSession) return;

    // Set conversation mode
    this.guideMeSession.setConversationMode(featureId);

    // Update input placeholder to be more focused
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      chatInput.placeholder =
        "Ask questions or share your thoughts about this topic...";
    }
  }

  // moveToNextTopic method removed - users can select topics directly from Guide Me button

  /**
   * End Guide Me session
   */
  endGuideMeSession() {
    if (!this.guideMeSession) return;

    const summary = this.guideMeSession.completeSession();
    this.addMessage(
      `🎉 **Guide Me Session Complete!**\n\n` +
        `Great work! You've explored aspects of **${summary.title}**.\n\n` +
        `**Session Summary:**\n` +
        `• Topics explored: ${summary.totalTopics}/4\n` +
        `• Session duration: ${summary.sessionDuration} minutes\n\n` +
        `**Next Steps:**\n` +
        `📚 Check the **Resources** section for additional learning materials\n` +
        `💻 Try implementing a solution to practice what you've learned\n` +
        `🔄 Select another topic from the Guide Me button above\n\n` +
        `Keep practicing and good luck with your interviews! 🚀`,
      "bot"
    );

    // Reset conversation mode
    this.guideMeSession.setConversationMode(null);

    // Reset dynamic island to show LeetCode Mode
    this.updateModeIndicator(true);

    // Reset input placeholder
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      chatInput.placeholder = "Type your message...";
    }
  }

  /**
   * Add toggle functionality for expandable sections
   */
  addToggleScript() {
    // Add event listeners to the expandable sections
    setTimeout(() => {
      // Find the sections by ID and get their previous sibling (the h3 header)
      const learningMaterialsSection =
        document.getElementById("learning-materials");
      const booksCoursesSection = document.getElementById("books-courses");

      if (learningMaterialsSection) {
        const learningMaterialsHeader =
          learningMaterialsSection.previousElementSibling;
        if (learningMaterialsHeader) {
          learningMaterialsHeader.onclick = () =>
            this.toggleSection("learning-materials");
        }
      }

      if (booksCoursesSection) {
        const booksCoursesHeader = booksCoursesSection.previousElementSibling;
        if (booksCoursesHeader) {
          booksCoursesHeader.onclick = () =>
            this.toggleSection("books-courses");
        }
      }
    }, 100);
  }

  /**
   * Toggle section expansion
   */
  toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const icon = section.previousElementSibling.querySelector(".dropdown-icon");

    if (section.style.display === "none") {
      section.style.display = "grid";
      icon.style.transform = "rotate(0deg)";
      icon.textContent = "▼";
    } else {
      section.style.display = "none";
      icon.style.transform = "rotate(-90deg)";
      icon.textContent = "▶";
    }
  }

  /**
   * Show next steps after exploring a feature (legacy method - now replaced)
   */
  showNextSteps(featureId) {
    if (!this.guideMeSession) return;

    // Check if session should end
    if (this.guideMeSession.shouldEndSession()) {
      const summary = this.guideMeSession.completeSession();
      this.addMessage(
        `🎉 **Guide Me Session Complete!**\n\n` +
          `Great work! You've explored all aspects of **${summary.title}**.\n\n` +
          `**Session Summary:**\n` +
          `• Topics explored: ${summary.totalTopics}/4\n` +
          `• Session duration: ${summary.sessionDuration} minutes\n\n` +
          `**Next Steps:**\n` +
          `📚 Check the **Resources** section for additional learning materials\n` +
          `💻 Try implementing a solution to practice what you've learned\n` +
          `🔄 Select another topic from the Guide Me button above\n\n` +
          `Keep practicing and good luck with your interviews! 🚀`,
        "bot"
      );
      return;
    }

    // Show available features
    const availableFeatures = this.guideMeSession.getAvailableFeatures();

    if (availableFeatures.length > 0) {
      let message = `**What would you like to explore?**\n\n`;

      availableFeatures.forEach((feature) => {
        message += `${feature.icon} **${feature.label}**\n`;
        message += `   ${feature.description}\n\n`;
      });

      this.addMessage(message, "bot");

      // Add next feature selection buttons
      this.addFeatureSelectionButtons(availableFeatures);
    } else {
      this.addMessage(
        "🎉 All topics explored! Check the Resources section for more learning materials.",
        "bot"
      );
    }
  }
}

// Initialize chat when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GistiFiChat();
});
