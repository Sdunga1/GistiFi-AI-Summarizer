/**
 * LeetCode Problem Extractor Module
 * Extracts problem information from the current LeetCode page
 */

class LeetCodeProblemExtractor {
  constructor() {
    this.selectors = {
      // Problem title selectors
      title: [
        '[data-cy="question-title"]',
        ".mr-2.text-label-1",
        "h1",
        ".title__3Vvk",
        ".text-2xl.font-medium.text-label-1",
        '[class*="title"]',
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
      ],

      // Problem content selectors
      problemContent: [
        '[data-cy="question-content"]',
        ".content__1YWB",
        ".question-content__JfgR",
        '[class*="content"]',
        ".description__24sA",
      ],

      // Tag/category selectors
      tags: [".tag__2PqS", ".tag__1G08", '[class*="tag"]', ".topic-tag__1jni"],

      // Constraints selectors
      constraints: ["pre", ".example-block__1ap4", '[class*="constraint"]'],

      // Examples selectors
      examples: [
        ".example-block__1ap4",
        '[class*="example"]',
        ".example__1FpR",
      ],
    };
  }

  /**
   * Extract all problem information from the current page
   */
  extractProblemInfo() {
    try {
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

  /**
   * Extract problem title
   */
  extractTitle() {
    for (const selector of this.selectors.title) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    return "Current LeetCode Problem";
  }

  /**
   * Extract problem difficulty
   */
  extractDifficulty() {
    for (const selector of this.selectors.difficulty) {
      const element = document.querySelector(selector);
      if (element) {
        // Check for diff attribute first
        const diffAttr = element.getAttribute("diff");
        if (diffAttr) {
          return this.normalizeDifficulty(diffAttr);
        }

        // Check text content
        const text = element.textContent.trim();
        if (text) {
          return this.normalizeDifficulty(text);
        }

        // Check for difficulty classes
        const classes = element.className;
        if (classes.includes("easy")) return "Easy";
        if (classes.includes("medium")) return "Medium";
        if (classes.includes("hard")) return "Hard";
      }
    }
    return "Unknown";
  }

  /**
   * Extract problem category/tags
   */
  extractCategory() {
    const tags = [];

    for (const selector of this.selectors.tags) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const tagText = element.textContent.trim();
        if (tagText && !tags.includes(tagText)) {
          tags.push(tagText);
        }
      });
    }

    return tags.length > 0 ? tags.join(", ") : "Algorithm";
  }

  /**
   * Extract problem statement
   */
  extractProblemStatement() {
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
          return this.cleanText(text);
        }
      }
    }
    return "";
  }

  /**
   * Extract examples
   */
  extractExamples() {
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

    return examples;
  }

  /**
   * Extract constraints
   */
  extractConstraints() {
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

    return constraints;
  }

  /**
   * Check if text looks like a constraint
   */
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

  /**
   * Clean and normalize text
   */
  cleanText(text) {
    return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
  }

  /**
   * Normalize difficulty text
   */
  normalizeDifficulty(difficulty) {
    const normalized = difficulty.toLowerCase();
    if (normalized.includes("easy")) return "Easy";
    if (normalized.includes("medium")) return "Medium";
    if (normalized.includes("hard")) return "Hard";
    return difficulty;
  }

  /**
   * Get fallback info when extraction fails
   */
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

  /**
   * Check if current page is a LeetCode problem page
   */
  isLeetCodeProblemPage() {
    return window.location.href.includes("leetcode.com/problems/");
  }

  /**
   * Get problem ID from URL
   */
  getProblemId() {
    const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
    return match ? match[1] : null;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = LeetCodeProblemExtractor;
} else {
  // Browser environment
  window.LeetCodeProblemExtractor = LeetCodeProblemExtractor;
}
