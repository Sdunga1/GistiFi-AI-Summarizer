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
async function createFloatingButton() {
  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    console.log(
      "Extension context invalidated, skipping floating button creation"
    );
    return;
  }

  // Check if button already exists
  if (document.getElementById("gistifi-fab")) return;

  // Check if side panel is open before creating button
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_SIDE_PANEL_STATE",
    });
    if (response && response.isOpen) {
      console.log("Side panel is open, skipping button creation");
      return;
    }
  } catch (error) {
    console.log("Error checking side panel state:", error);
  }

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
async function initializeGistiFi() {
  if (!isExtensionContextValid()) {
    console.log("Extension context invalid, skipping initialization");
    return;
  }

  // Create floating button after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      createFloatingButton().catch((error) => {
        console.log("Error creating floating button:", error);
      });
    });
  } else {
    try {
      await createFloatingButton();
    } catch (error) {
      console.log("Error creating floating button:", error);
    }
  }
}

// Only set up message listener if extension context is valid
function setupMessageListener() {
  if (!isExtensionContextValid()) {
    return;
  }

  try {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      // Handle async operations
      const handleAsync = async () => {
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
              console.log(
                "Content script extracted problem info:",
                problemInfo
              );
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
            const fabContainer = document.querySelector(
              ".gistifi-fab-container"
            );
            if (fabContainer) {
              fabContainer.style.opacity = "0";
              setTimeout(() => {
                fabContainer.style.display = "none";
              }, 300); // Match transition duration
            }
            sendResponse({ success: true });
            return true;
          }

          if (req.type === "SIDE_PANEL_CLOSED") {
            // Remove any existing button
            const existingContainer = document.querySelector(
              ".gistifi-fab-container"
            );
            if (existingContainer) {
              existingContainer.remove();
            }

            // Create a new button
            createFloatingButton();

            sendResponse({ success: true });
            return true;
          }

          if (req.type === "GET_LEETCODE_LANGUAGE") {
            const language = this.extractLeetCodeLanguage();
            sendResponse({ language: language });
            return true;
          }
        } catch (error) {
          console.log("Error handling message:", error);
          sendResponse({ success: false, error: error.message });
        }
      };

      // Execute async handler for async operations
      if (req.type === "GET_TOP_SOLUTIONS") {
        handleAsync();
        return true;
      }

      // Handle synchronous operations
      try {
        if (req.type === "GET_ARTICLE_TEXT") {
          const content = extractPageContent();
          sendResponse({ content: content });
          return true;
        }

        if (req.type === "GET_LEETCODE_PROBLEM_INFO") {
          if (typeof LeetCodeProblemExtractor !== "undefined") {
            const extractor = new LeetCodeProblemExtractor();
            const problemInfo = extractor.extractProblemInfo();
            console.log("Content script extracted problem info:", problemInfo);
            sendResponse({ problemInfo: problemInfo });
          } else {
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
          const fabContainer = document.querySelector(".gistifi-fab-container");
          if (fabContainer) {
            fabContainer.style.opacity = "0";
            setTimeout(() => {
              fabContainer.style.display = "none";
            }, 300); // Match transition duration
          }
          sendResponse({ success: true });
          return true;
        }

        if (req.type === "SIDE_PANEL_CLOSED") {
          // Remove any existing button
          const existingContainer = document.querySelector(
            ".gistifi-fab-container"
          );
          if (existingContainer) {
            existingContainer.remove();
          }

          // Create a new button
          createFloatingButton();

          sendResponse({ success: true });
          return true;
        }

        if (req.type === "GET_LEETCODE_LANGUAGE") {
          const language = this.extractLeetCodeLanguage();
          sendResponse({ language: language });
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

// Handle tab visibility changes
document.addEventListener("visibilitychange", async () => {
  if (!document.hidden) {
    // Tab became visible, check side panel state
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_SIDE_PANEL_STATE",
      });
      if (response && response.isOpen) {
        // Side panel is open, remove floating button
        const fabContainer = document.querySelector(".gistifi-fab-container");
        if (fabContainer) {
          fabContainer.remove();
        }
      } else {
        // Side panel is closed, ensure button exists
        if (!document.querySelector(".gistifi-fab-container")) {
          createFloatingButton();
        }
      }
    } catch (error) {
      console.log("Error checking side panel state:", error);
    }
  }
});

// Only initialize if extension context is valid
if (isExtensionContextValid()) {
  cleanupOldButtons();
  initializeGistiFi();
  setupMessageListener();
} else {
  console.log("GistiFi extension context is invalid, skipping initialization");
  cleanupOldButtons();
}

// LeetCode Problem Extractor - embedded in content script for direct access
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

      // Problem content selectors - updated for current LeetCode structure
      problemContent: [
        // Primary selector for current LeetCode
        'div[data-track-load="description_content"]',
        // Legacy selectors as fallbacks
        '[data-cy="question-content"]',
        ".content__1YWB",
        ".question-content__JfgR",
        '[class*="content"]',
        ".description__24sA",
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
        similarQuestions: this.extractSimilarQuestions(),
        userCode: this.extractUserCode(),
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

    // Target the exact topics section structure from the HTML you provided
    const topicSelectors = [
      // Primary: Look for the topics container with the specific class structure
      'div.mt-2.flex.flex-wrap.gap-1.pl-7 a[href^="/tag/"]',
      // Alternative: Look for any topic tags with the specific styling
      'a.bg-fill-secondary.text-text-secondary[href^="/tag/"]',
      // Fallback: Any link that starts with /tag/
      'a[href^="/tag/"]',
    ];

    for (const selector of topicSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const tagText = element.textContent.trim();
        if (tagText && !tags.includes(tagText) && tagText.length > 0) {
          // Only include actual topic tags (not navigation or UI elements)
          if (
            tagText.length > 1 &&
            !tagText.includes("\n") &&
            !tagText.includes("Topics") &&
            !tagText.includes("Companies") &&
            !tagText.includes("My Lists") &&
            !tagText.includes("Notebook") &&
            !tagText.includes("Submissions") &&
            !tagText.includes("Progress") &&
            !tagText.includes("Points") &&
            !tagText.includes("C++") &&
            !tagText.includes("Auto") &&
            !tagText.includes("K") &&
            !tagText.includes("770")
          ) {
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

      // If we found tags with this selector, break (don't try fallbacks)
      if (tags.length > 0) {
        break;
      }
    }

    const category = tags.length > 0 ? tags.join(", ") : "Algorithm";
    console.log("Found category:", category);
    return category;
  }

  extractProblemStatement() {
    console.log("Extracting problem statement...");

    // Primary selector for the main content container
    const mainContentSelector = 'div[data-track-load="description_content"]';
    const element = document.querySelector(mainContentSelector);

    if (element) {
      console.log("Found main content container");

      // Clone the element to work with
      const clone = element.cloneNode(true);

      // Remove examples section (everything after "Example 1:")
      const exampleStart = clone.querySelector("p strong.example");
      if (exampleStart) {
        let currentNode = exampleStart.parentElement;
        while (currentNode && currentNode.nextSibling) {
          currentNode.nextSibling.remove();
        }
        currentNode.remove(); // Remove the example paragraph itself
      }

      // Remove constraints section (everything after "Constraints:")
      const constraintsStart = clone.querySelector("p strong:not(.example)");
      if (
        constraintsStart &&
        constraintsStart.textContent.includes("Constraints")
      ) {
        let currentNode = constraintsStart.parentElement;
        while (currentNode && currentNode.nextSibling) {
          currentNode.nextSibling.remove();
        }
        currentNode.remove(); // Remove the constraints paragraph itself
      }

      // Get the clean problem statement
      const text = clone.textContent.trim();
      if (text) {
        console.log(
          "Extracted problem statement:",
          text.substring(0, 100) + "..."
        );
        return this.cleanText(text);
      }
    }

    // Fallback to old selectors
    for (const selector of this.selectors.problemContent) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text) {
          console.log(
            "Found problem statement with fallback selector:",
            selector
          );
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

    // Primary selector for the main content container
    const mainContentSelector = 'div[data-track-load="description_content"]';
    const element = document.querySelector(mainContentSelector);

    if (element) {
      console.log("Found main content container for examples");

      // Find all example sections
      const exampleElements = element.querySelectorAll("p strong.example");

      exampleElements.forEach((exampleHeader, index) => {
        const exampleSection = this.extractExampleSection(exampleHeader);
        if (exampleSection) {
          examples.push(exampleSection);
          console.log(
            `Extracted example ${index + 1}:`,
            exampleSection.substring(0, 100) + "..."
          );
        }
      });
    }

    // Fallback to old selectors if no examples found
    if (examples.length === 0) {
      for (const selector of this.selectors.examples) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          const exampleText = element.textContent.trim();
          if (exampleText) {
            examples.push(this.cleanText(exampleText));
          }
        });
      }
    }

    console.log("Found examples:", examples.length);
    return examples;
  }

  extractExampleSection(exampleHeader) {
    try {
      // Get the example header text
      const headerText = exampleHeader.textContent.trim();

      // Find the pre block that follows this example header
      let currentNode = exampleHeader.parentElement;
      let exampleContent = "";

      // Look for the pre block that contains the example
      while (currentNode && currentNode.nextSibling) {
        if (currentNode.nextSibling.tagName === "PRE") {
          const preContent = currentNode.nextSibling.textContent.trim();
          exampleContent = `${headerText}\n${preContent}`;
          break;
        }
        currentNode = currentNode.nextSibling;
      }

      return exampleContent || headerText;
    } catch (error) {
      console.error("Error extracting example section:", error);
      return exampleHeader.textContent.trim();
    }
  }

  extractConstraints() {
    console.log("Extracting constraints...");
    const constraints = [];

    // Primary selector for the main content container
    const mainContentSelector = 'div[data-track-load="description_content"]';
    const element = document.querySelector(mainContentSelector);

    if (element) {
      console.log("Found main content container for constraints");

      // Find the constraints section
      const constraintsHeader = Array.from(
        element.querySelectorAll("p strong")
      ).find((strong) => strong.textContent.includes("Constraints"));

      if (constraintsHeader) {
        console.log("Found constraints header");

        // Get the constraints list that follows
        let currentNode = constraintsHeader.parentElement;
        let constraintsList = [];

        // Look for the ul/li elements that contain the constraints
        while (currentNode && currentNode.nextSibling) {
          if (currentNode.nextSibling.tagName === "UL") {
            const listItems = currentNode.nextSibling.querySelectorAll("li");
            listItems.forEach((li) => {
              const constraintText = li.textContent.trim();
              if (constraintText) {
                constraintsList.push(constraintText);
                console.log("Found constraint:", constraintText);
              }
            });
            break;
          }
          currentNode = currentNode.nextSibling;
        }

        if (constraintsList.length > 0) {
          constraints.push(...constraintsList);
        }
      }
    }

    // Fallback to old selectors if no constraints found
    if (constraints.length === 0) {
      for (const selector of this.selectors.constraints) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          const constraintText = element.textContent.trim();
          if (constraintText && this.isConstraint(constraintText)) {
            constraints.push(this.cleanText(constraintText));
          }
        });
      }
    }

    console.log("Found constraints:", constraints.length);
    return constraints;
  }

  extractSimilarQuestions() {
    console.log("Extracting similar questions...");
    const similarQuestions = [];

    // Look for the "Similar Questions" section
    const similarQuestionsSection = Array.from(
      document.querySelectorAll("div.text-body")
    ).find((div) => div.textContent.includes("Similar Questions"));

    if (similarQuestionsSection) {
      console.log("Found similar questions section");

      // Navigate to the container that holds the similar questions
      const container = similarQuestionsSection.closest("div.flex.flex-col");
      if (container) {
        // Find all similar question links
        const questionLinks = container.querySelectorAll(
          'a[href^="/problems/"]'
        );

        questionLinks.forEach((link, index) => {
          const questionTitle = link.textContent.trim();
          const questionUrl = link.href;

          // Get the difficulty if available
          const difficultyElement = link
            .closest("div.flex.w-full")
            .querySelector(".text-yellow, .text-green-s, .text-red-s");
          const difficulty = difficultyElement
            ? difficultyElement.textContent.trim()
            : "Unknown";

          if (questionTitle && questionTitle.length > 0) {
            const similarQuestion = {
              title: questionTitle,
              url: questionUrl,
              difficulty: difficulty,
            };

            similarQuestions.push(similarQuestion);
            console.log(
              `Found similar question ${index + 1}:`,
              questionTitle,
              `(${difficulty})`
            );
          }
        });
      }
    }

    console.log("Found similar questions:", similarQuestions.length);
    return similarQuestions;
  }

  extractUserCode() {
    console.log("Extracting user code...");
    let userCode = "";

    // Look for Monaco editor content
    const monacoEditor = document.querySelector(
      ".view-lines.monaco-mouse-cursor-text"
    );

    if (monacoEditor) {
      console.log("Found Monaco editor");

      // Extract all lines of code
      const codeLines = monacoEditor.querySelectorAll(".view-line");
      const codeArray = [];

      codeLines.forEach((line, index) => {
        const lineText = line.textContent || "";
        if (lineText.trim()) {
          codeArray.push(lineText);
        }
      });

      userCode = codeArray.join("\n");
      console.log("Extracted user code:", userCode.substring(0, 100) + "...");
    } else {
      // Fallback: Look for other code editor structures
      const fallbackSelectors = [
        "pre code",
        ".code-editor",
        '[class*="editor"]',
        '[class*="code"]',
        'textarea[class*="code"]',
      ];

      for (const selector of fallbackSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          userCode = element.textContent || element.value || "";
          if (userCode.trim()) {
            console.log("Found user code with fallback selector:", selector);
            break;
          }
        }
      }
    }

    console.log("User code length:", userCode.length);
    return userCode;
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
      similarQuestions: [],
      userCode: "",
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

  /**
   * Extract the currently selected programming language from LeetCode UI
   */
  extractLeetCodeLanguage() {
    try {
      // Look for language selector in the editor area
      const languageSelectors = [
        // Common language selector patterns
        'select[data-cy="language-selector"] option[selected]',
        'select[data-testid="language-selector"] option[selected]',
        'select[class*="language"] option[selected]',
        // Look for language display elements
        '[data-cy="language-display"]',
        '[data-testid="language-display"]',
        ".language-display",
        // Look for language in code editor headers
        ".editor-header .language",
        ".code-editor-header .language",
        // Fallback: look for any element containing language names
        '[class*="language"]',
        "[data-language]",
      ];

      for (const selector of languageSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text =
            element.textContent || element.getAttribute("data-language") || "";
          const language = this.normalizeLanguage(text);
          if (language) {
            console.log("Found LeetCode language:", language);
            return language;
          }
        }
      }

      // If no language found, return empty string
      console.log("No LeetCode language detected");
      return "";
    } catch (error) {
      console.error("Error extracting LeetCode language:", error);
      return "";
    }
  }

  /**
   * Normalize language names to standard format
   */

  normalizeLanguage(languageText) {
    if (!languageText) return "";

    const normalized = languageText.toLowerCase().trim();

    // Map common variations to standard names
    if (normalized.includes("cpp") || normalized.includes("c++")) return "C++";
    if (normalized.includes("python") || normalized.includes("py"))
      return "Python";
    if (normalized.includes("java")) return "Java";
    if (normalized.includes("javascript") || normalized.includes("js"))
      return "JavaScript";
    if (normalized.includes("typescript") || normalized.includes("ts"))
      return "TypeScript";
    if (normalized.includes("go")) return "Go";
    if (normalized.includes("rust")) return "Rust";
    if (normalized.includes("kotlin")) return "Kotlin";
    if (normalized.includes("swift")) return "Swift";
    if (normalized.includes("php")) return "PHP";
    if (normalized.includes("ruby")) return "Ruby";
    if (normalized.includes("scala")) return "Scala";

    return "";
  }
}

// Fallback function for backward compatibility
function extractLeetCodeProblemInfo() {
  const extractor = new LeetCodeProblemExtractor();
  return extractor.extractProblemInfo();
}
