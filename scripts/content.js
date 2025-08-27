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

        if (req.type === "GET_LEETCODE_PROBLEM_INFO") {
          // Use the new LeetCodeProblemExtractor class
          if (typeof LeetCodeProblemExtractor !== "undefined") {
            const extractor = new LeetCodeProblemExtractor();
            const problemInfo = extractor.extractProblemInfo();
            console.log("Content script extracted problem info:", problemInfo);
            sendResponse({ problemInfo: problemInfo });
          } else {
            // Fallback to old method
            const problemInfo = extractLeetCodeProblemInfo();
            console.log(
              "Content script extracted problem info (fallback):",
              problemInfo
            );
            sendResponse({ problemInfo: problemInfo });
          }
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

// Enhanced LeetCode Problem Extractor
class LeetCodeProblemExtractor {
  constructor() {
    this.selectors = {
      // Problem title selectors - updated for current LeetCode
      title: [
        '[data-cy="question-title"]',
        ".mr-2.text-label-1",
        "h1",
        ".title__3Vvk",
        ".text-2xl.font-medium.text-label-1",
        '[class*="title"]',
        // Additional selectors for newer LeetCode versions
        ".text-3xl.font-bold.text-label-1",
        ".text-2xl.font-semibold.text-label-1",
        '[data-testid="question-title"]',
      ],

      // Difficulty selectors
      difficulty: [
        "[diff]",
        ".difficulty-label",
        ".css-1wcei0o",
        '[class*="difficulty"]',
        ".text-difficulty-easy",
        ".text-difficulty-medium",
        ".text-difficulty-hard",
        // Additional selectors
        "[data-difficulty]",
        ".text-green-s",
        ".text-yellow-s",
        ".text-red-s",
      ],

      // Problem content selectors
      problemContent: [
        '[data-cy="question-content"]',
        ".content__1YWB",
        ".question-content__JfgR",
        '[class*="content"]',
        ".description__24sA",
        // Additional selectors
        '[data-testid="question-content"]',
        ".question-content",
        ".problem-description",
      ],

      // Tag/category selectors - updated for current LeetCode structure
      tags: [
        // Primary selectors based on current LeetCode HTML structure
        'a[href^="/tag/"]',
        ".bg-fill-secondary.text-text-secondary",
        '[class*="bg-fill-secondary"]',
        // Legacy selectors as fallbacks
        ".tag__2PqS",
        ".tag__1G08",
        '[class*="tag"]',
        ".topic-tag__1jni",
        '[data-testid="topic-tag"]',
        ".topic-tag",
        ".problem-tag",
      ],

      // Constraints selectors
      constraints: [
        "pre",
        ".example-block__1ap4",
        '[class*="constraint"]',
        // Additional selectors
        ".constraints",
        ".problem-constraints",
      ],

      // Examples selectors
      examples: [
        ".example-block__1ap4",
        '[class*="example"]',
        ".example__1FpR",
        // Additional selectors
        ".examples",
        ".problem-examples",
      ],
    };
  }

  extractProblemInfo() {
    try {
      console.log("Starting LeetCode problem extraction...");

      const problemInfo = {
        title: this.extractTitle(),
        difficulty: this.extractDifficulty(),
        category: this.extractCategory(),
        problemStatement: this.extractProblemStatement(),
        examples: this.extractExamples(),
        constraints: this.extractConstraints(),
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      console.log("Extracted LeetCode problem info:", problemInfo);
      return problemInfo;
    } catch (error) {
      console.error("Error extracting LeetCode problem info:", error);
      return this.getFallbackInfo();
    }
  }

  extractTitle() {
    console.log("Extracting title...");
    for (const selector of this.selectors.title) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const title = element.textContent.trim();
        console.log("Found title with selector:", selector, "Title:", title);
        return title;
      }
    }
    console.log("No title found with any selector");
    return "Current LeetCode Problem";
  }

  extractDifficulty() {
    console.log("Extracting difficulty...");
    for (const selector of this.selectors.difficulty) {
      const element = document.querySelector(selector);
      if (element) {
        // Check for diff attribute first
        const diffAttr = element.getAttribute("diff");
        if (diffAttr) {
          console.log("Found difficulty with diff attribute:", diffAttr);
          return this.normalizeDifficulty(diffAttr);
        }

        // Check text content
        const text = element.textContent.trim();
        if (text) {
          console.log("Found difficulty with text:", text);
          return this.normalizeDifficulty(text);
        }

        // Check for difficulty classes
        const classes = element.className;
        if (classes.includes("easy")) return "Easy";
        if (classes.includes("medium")) return "Medium";
        if (classes.includes("hard")) return "Hard";
      }
    }
    console.log("No difficulty found with any selector");
    return "Unknown";
  }

  extractCategory() {
    console.log("Extracting category...");
    const tags = [];

    // Try the new specific selectors first (based on the HTML structure you provided)
    const newSelectors = [
      // Target the topic tags within the complex nested structure
      'a[href^="/tag/"]',
      // Alternative selectors for topic tags
      ".bg-fill-secondary.text-text-secondary",
      '[class*="bg-fill-secondary"]',
      // Fallback to general tag selectors
      ".tag__2PqS",
      ".tag__1G08",
      '[class*="tag"]',
      ".topic-tag__1jni",
      '[data-testid="topic-tag"]',
      ".topic-tag",
      ".problem-tag",
    ];

    for (const selector of newSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const tagText = element.textContent.trim();
        if (tagText && !tags.includes(tagText) && tagText.length > 0) {
          // Filter out very short or invalid tags
          if (tagText.length > 1 && !tagText.includes("\n")) {
            tags.push(tagText);
            console.log(
              "Found topic tag:",
              tagText,
              "with selector:",
              selector
            );
          }
        }
      });
    }

    const category = tags.length > 0 ? tags.join(", ") : "Algorithm";
    console.log("Found category:", category);
    return category;
  }

  extractProblemStatement() {
    console.log("Extracting problem statement...");
    for (const selector of this.selectors.problemContent) {
      const element = document.querySelector(selector);
      if (element) {
        // Remove code blocks and examples to get clean problem statement
        const clone = element.cloneNode(true);

        // Remove code blocks
        const codeBlocks = clone.querySelectorAll("pre, code");
        codeBlocks.forEach((block) => block.remove());

        // Remove example blocks
        const exampleBlocks = clone.querySelectorAll('[class*="example"]');
        exampleBlocks.forEach((block) => block.remove());

        const text = clone.textContent.trim();
        if (text) {
          console.log("Found problem statement with selector:", selector);
          return this.cleanText(text);
        }
      }
    }
    console.log("No problem statement found with any selector");
    return "";
  }

  extractExamples() {
    console.log("Extracting examples...");
    const examples = [];

    for (const selector of this.selectors.examples) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const exampleText = element.textContent.trim();
        if (exampleText) {
          examples.push(this.cleanText(exampleText));
        }
      });
    }

    console.log("Found examples:", examples.length);
    return examples;
  }

  extractConstraints() {
    console.log("Extracting constraints...");
    const constraints = [];

    for (const selector of this.selectors.constraints) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const constraintText = element.textContent.trim();
        if (constraintText && this.isConstraint(constraintText)) {
          constraints.push(this.cleanText(constraintText));
        }
      });
    }

    console.log("Found constraints:", constraints.length);
    return constraints;
  }

  isConstraint(text) {
    const constraintKeywords = [
      "constraints",
      "1 <=",
      "0 <=",
      "<= 10^",
      "array",
      "string",
      "integer",
      "length",
      "size",
      "range",
      "guaranteed",
    ];

    return constraintKeywords.some((keyword) =>
      text.toLowerCase().includes(keyword)
    );
  }

  cleanText(text) {
    return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
  }

  normalizeDifficulty(difficulty) {
    const normalized = difficulty.toLowerCase();
    if (normalized.includes("easy")) return "Easy";
    if (normalized.includes("medium")) return "Medium";
    if (normalized.includes("hard")) return "Hard";
    return difficulty;
  }

  getFallbackInfo() {
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

  isLeetCodeProblemPage() {
    return window.location.href.includes("leetcode.com/problems/");
  }

  getProblemId() {
    const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
    return match ? match[1] : null;
  }
}

// Fallback function for backward compatibility
function extractLeetCodeProblemInfo() {
  const extractor = new LeetCodeProblemExtractor();
  return extractor.extractProblemInfo();
}
