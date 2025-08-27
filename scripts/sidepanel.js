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

    this.init();
  }

  async init() {
    await this.getCurrentTab();
    this.setupEventListeners();
    this.checkApiStatus();
    this.loadChatHistory();
    this.setupCharCounter();
    this.setupCloseDetection();
    this.checkLeetCodeMode();

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
    const guideMeBtn = document.querySelector('[data-action="guide-me"]');
    const resourcesBtn = document.querySelector('[data-action="resources"]');
    const debugBtn = document.querySelector('[data-action="debug-extract"]');
    const summarizeBtn = document.querySelector('[data-action="summarize"]');
    const askQuestionBtn = document.querySelector(
      '[data-action="ask-question"]'
    );

    if (isLeetCodeMode) {
      // Show LeetCode-specific buttons
      if (guideMeBtn) guideMeBtn.style.display = "inline-flex";
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
      if (guideMeBtn) guideMeBtn.style.display = "none";
      if (resourcesBtn) resourcesBtn.style.display = "none";
      if (debugBtn) debugBtn.style.display = "none";
    }

    // Toggle welcome messages
    this.toggleWelcomeMessages(isLeetCodeMode);

    // Update placeholder text
    this.updatePlaceholderText(isLeetCodeMode);
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
        this.promptCodeAnalysis();
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
    }
  }

  async processMessage(message) {
    this.showLoading(true);
    this.isProcessing = true;

    try {
      // Check if we're in an active Guide Me session
      if (this.guideMeSession && this.guideMeSession.isActive()) {
        await this.handleGuideMeConversation(message);
        return;
      }

      // Check if it's code (simple heuristic)
      if (this.isCodeContent(message)) {
        await this.analyzeCode(message);
      } else if (
        message.toLowerCase().includes("summarize") ||
        message.toLowerCase().includes("summary")
      ) {
        await this.summarizePage();
      } else if (
        message.toLowerCase().includes("guide") ||
        message.toLowerCase().includes("help")
      ) {
        if (this.isLeetCodeModeActive()) {
          this.promptGuideMe();
        } else {
          this.addMessage(
            "I can help you summarize this page or analyze code. Try using the quick action buttons or type 'summarize this page' for summaries!",
            "bot"
          );
        }
      } else if (
        message.toLowerCase().includes("resources") ||
        message.toLowerCase().includes("resource")
      ) {
        if (this.isLeetCodeModeActive()) {
          this.showResources();
        } else {
          this.addMessage(
            "I can help you summarize this page or analyze code. Try using the quick action buttons or type 'summarize this page' for summaries!",
            "bot"
          );
        }
      } else {
        // General AI response based on mode
        if (this.isLeetCodeModeActive()) {
          this.addMessage(
            "I can help you get guided through LeetCode problems, analyze code, or find resources. Try using the quick action buttons or ask me for guidance!",
            "bot"
          );
        } else {
          this.addMessage(
            "I can help you summarize this page or analyze code. Try using the quick action buttons or type 'summarize this page' for summaries!",
            "bot"
          );
        }
      }
    } catch (error) {
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

      // Get API key
      const { geminiApiKey } = await chrome.storage.sync.get(["geminiApiKey"]);
      if (!geminiApiKey) {
        this.addMessage(
          "Please set your Gemini API key in settings first to use Guide Me mode.",
          "bot",
          "error"
        );
        return;
      }

      // Add user message to session
      this.guideMeSession.addMessage("user", message);

      // Prepare the conversation context for the LLM
      const conversationContext =
        this.guideMeSession.buildConversationContext();

      // Send to Gemini with the system prompt
      const response = await this.getGuideMeResponse(
        conversationContext,
        geminiApiKey
      );

      // Add bot response to history
      this.addMessage(response, "bot");

      // Add bot response to session
      this.guideMeSession.addMessage("assistant", response);

      // Check if we should transition to next phase or end session
      this.updateGuideMePhase(message, response);
    } catch (error) {
      console.error("Guide Me conversation error:", error);
      this.addMessage(
        `I encountered an error while guiding you: ${error.message}. Let's continue from where we left off.`,
        "bot",
        "error"
      );
    }
  }

  async getGuideMeResponse(context, apiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: context }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
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
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm here to guide you. What would you like to work on first?"
    );
  }

  containsHint(response) {
    const hintKeywords = [
      "hint",
      "think about",
      "consider",
      "try",
      "approach",
      "strategy",
      "method",
    ];
    return hintKeywords.some((keyword) =>
      response.toLowerCase().includes(keyword)
    );
  }

  updateGuideMePhase(userMessage, botResponse) {
    if (!this.guideMeSession || !this.guideMeSession.isActive()) return;

    const session = this.guideMeSession.getCurrentSession();

    // Simple phase detection based on conversation content
    if (session.currentPhase === "introduction") {
      if (
        userMessage.toLowerCase().includes("understand") ||
        userMessage.toLowerCase().includes("problem")
      ) {
        this.guideMeSession.updatePhase(
          "problem_understanding",
          "User wants to understand the problem"
        );
      }
    } else if (session.currentPhase === "problem_understanding") {
      if (
        userMessage.toLowerCase().includes("approach") ||
        userMessage.toLowerCase().includes("solution")
      ) {
        this.guideMeSession.updatePhase(
          "approach_discussion",
          "User wants to discuss approaches"
        );
      }
    } else if (session.currentPhase === "approach_discussion") {
      if (
        userMessage.toLowerCase().includes("code") ||
        userMessage.toLowerCase().includes("implement")
      ) {
        this.guideMeSession.updatePhase(
          "implementation",
          "User wants to implement solution"
        );
      }
    } else if (session.currentPhase === "implementation") {
      if (
        userMessage.toLowerCase().includes("test") ||
        userMessage.toLowerCase().includes("optimize")
      ) {
        this.guideMeSession.updatePhase(
          "testing_optimization",
          "User wants to test and optimize"
        );
      }
    } else if (session.currentPhase === "testing_optimization") {
      if (
        userMessage.toLowerCase().includes("feedback") ||
        userMessage.toLowerCase().includes("done")
      ) {
        this.guideMeSession.updatePhase(
          "feedback_next_steps",
          "User wants feedback"
        );
        this.completeGuideMeSession();
      }
    }

    // Update hint count if the bot response contains hints
    if (this.containsHint(botResponse)) {
      this.guideMeSession.incrementHints();
    }

    // Check if session should end
    if (this.guideMeSession.shouldEndSession()) {
      this.completeGuideMeSession();
    }
  }

  completeGuideMeSession() {
    if (!this.guideMeSession || !this.guideMeSession.isActive()) return;

    const sessionSummary = this.guideMeSession.completeSession();

    this.addMessage(
      `🎉 **Great job completing this problem!** 🌟<br><br>` +
        `**Session Summary:**<br>` +
        `• Problem: ${sessionSummary.problem}<br>` +
        `• Difficulty: ${sessionSummary.difficulty}<br>` +
        `• Phase Completed: ${sessionSummary.finalPhase}<br>` +
        `• Hints Used: ${sessionSummary.hintsUsed}/${this.guideMeSession.maxHints}<br>` +
        `• Total Messages: ${sessionSummary.totalMessages}<br>` +
        `• Session Duration: ${sessionSummary.duration} minutes<br><br>` +
        `**Next Steps:**<br>` +
        `• Practice related problems in the same category<br>` +
        `• Review time/space complexity concepts<br>` +
        `• Click the "📚 Resources" button to learn more!<br><br>` +
        `Would you like to try another problem or explore resources?`,
      "bot"
    );
  }

  formatSessionStatus(status) {
    if (!status.active) {
      return status.message;
    }

    return (
      `**Active Guide Me Session** 📊<br>` +
      `• Problem: ${status.problem}<br>` +
      `• Current Phase: ${status.currentPhase
        .replace("_", " ")
        .toUpperCase()}<br>` +
      `• Hints Used: ${status.hintsUsed}<br>` +
      `• Messages: ${status.messages}<br>` +
      `• Duration: ${status.duration}<br>` +
      `• Started: ${status.startTime}<br><br>` +
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
  }

  formatMessage(content, type) {
    if (type === "code") {
      // If content looks like code analysis, format it nicely
      if (
        content.includes("Time Complexity") &&
        content.includes("Space Complexity")
      ) {
        return `<pre>${content}</pre>`;
      }
    }

    // Convert newlines to <br> and handle basic formatting
    return content
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
  }

  promptCodeAnalysis() {
    const chatInput = document.getElementById("chat-input");
    chatInput.value = "Paste your code here for analysis...";
    chatInput.focus();
    chatInput.select();
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
    const overlay = document.getElementById("loading-overlay");
    if (show) {
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
    }
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

      if (history && history.length > 1) {
        // More than just welcome message
        const messagesContainer = document.getElementById("chat-messages");
        messagesContainer.innerHTML = ""; // Clear welcome message

        history.forEach((msg) => {
          this.addMessageFromHistory(msg.content, msg.sender, msg.time);
        });
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

  promptGuideMe() {
    // First, get the problem statement from the current LeetCode page
    this.getLeetCodeProblemInfo().then((problemInfo) => {
      // Initialize the Guide Me system
      if (!this.guideMePrompts) {
        this.guideMePrompts = new GuideMePrompts();
      }
      if (!this.guideMeSession) {
        this.guideMeSession = new GuideMeSessionManager();
      }

      const systemPrompt =
        this.guideMePrompts.getGuideMeSystemPrompt(problemInfo);

      this.addMessage(
        `I'm here to guide you through this LeetCode problem - **${
          problemInfo.title || "Current Problem"
        }**! 🧭<br><br>` +
          `I can help you with:<br>` +
          `• Understanding the problem statement<br>` +
          `• Breaking down the approach<br>` +
          `• Step-by-step solution walkthrough<br>` +
          `• Time and space complexity analysis<br>` +
          `• Common pitfalls to avoid<br><br>` +
          `What specific aspect would you like me to help you with?<br><br>` +
          `💡 **Pro Tip**: I'll guide you through the interview process step-by-step, helping you think through the problem like a real coding interview!`,
        "bot"
      );

      // Start a new Guide Me session
      this.guideMeSession.startSession(problemInfo, systemPrompt);
    });
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
      console.log("Getting LeetCode problem info...");

      // Try to get problem info from the current page
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      console.log("Current tab:", tab);

      if (tab && tab.url && tab.url.includes("leetcode.com")) {
        console.log(
          "LeetCode page detected, sending message to content script..."
        );

        // Send message to content script to extract problem info
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: "GET_LEETCODE_PROBLEM_INFO",
        });

        console.log("Response from content script:", response);

        if (response && response.problemInfo) {
          console.log("Successfully got problem info:", response.problemInfo);
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

  showResources() {
    this.addMessage(
      "Here are some helpful resources for this problem: 📚<br><br>" +
        "• <strong>Problem Discussion:</strong> Check the Discuss tab for community solutions<br>" +
        "• <strong>Related Topics:</strong> Review similar problems and concepts<br>" +
        "• <strong>Practice Problems:</strong> Try similar difficulty problems<br>" +
        "• <strong>Learning Paths:</strong> Follow structured learning sequences<br>" +
        "• <strong>Video Solutions:</strong> Watch step-by-step explanations<br><br>" +
        "Would you like me to help you find specific resources or explain any concepts?",
      "bot"
    );
  }
}

// Initialize chat when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GistiFiChat();
});
