/**
 * Guide Me System Prompts
 * Provides focused, context-aware prompts for different Guide Me features
 */

class GuideMePrompts {
  constructor() {
    this.basePrompt = this.getBasePrompt();
    this.featurePrompts = this.getFeaturePrompts();
  }

  /**
   * Get the base system prompt
   */
  getBasePrompt() {
    return `You are an expert coding interview mentor helping a student understand a LeetCode problem.

IMPORTANT RULES:
1. ONLY reference information explicitly provided in the problem context
2. If you're unsure about any detail, ask the user to clarify rather than making assumptions
3. Keep responses concise (2-3 sentences maximum)
4. Be encouraging and mentor-like in your tone
5. Focus on the specific topic requested
6. Always end with a clear next step or question

TONE: Be encouraging, patient, and guide the student to discover answers rather than just telling them.`;
  }

  /**
   * Get feature-specific prompts
   */
  getFeaturePrompts() {
    return {
      intuition: {
        title: "🧠 Understanding the Approach",
        focus:
          "Explain the core reasoning and data structure choices for this specific problem",
        instructions:
          "Help the user understand WHY this approach works, not just what it is. Use the problem constraints and examples to justify choices.",
      },

      edgeCases: {
        title: "⚠️ Handling Edge Cases",
        focus:
          "Identify problem-specific edge cases based on constraints and provide general handling tips",
        instructions:
          "Base your edge case identification on the actual constraints provided. Give general tips for handling similar scenarios in interviews.",
      },

      complexity: {
        title: "📊 Analyzing Complexity",
        focus:
          "Analyze required time/space complexity based on the problem constraints",
        instructions:
          "Use the constraint ranges to determine what complexity will pass the test cases. Explain why certain approaches won't work.",
      },

      followUps: {
        title: "🔗 Preparing for Follow-ups",
        focus:
          "Suggest follow-up questions an interviewer might ask and connect to related concepts",
        instructions:
          "Base follow-up questions on the problem type and constraints. Suggest related concepts to study.",
      },
    };
  }

  /**
   * Build the complete system prompt for a specific feature
   */
  buildFeaturePrompt(featureId, context) {
    const feature = this.featurePrompts[featureId];
    if (!feature) {
      throw new Error(`Unknown feature: ${featureId}`);
    }

    const problemContext = this.formatProblemContext(context.problem);
    const sessionContext = this.formatSessionContext(context);

    return `${this.basePrompt}

${feature.title}
${feature.focus}

${feature.instructions}

PROBLEM CONTEXT:
${problemContext}

SESSION CONTEXT:
${sessionContext}

RESPONSE FORMAT:
1. Brief explanation (1-2 sentences)
2. Specific to this problem
3. Clear next step or question

Remember: Only reference information explicitly provided above.`;
  }

  /**
   * Format problem context for the prompt
   */
  formatProblemContext(problem) {
    let context = `- Title: ${problem.title || "Unknown"}
- Difficulty: ${problem.difficulty || "Unknown"}
- Problem Statement: ${problem.problemStatement || "Not provided"}`;

    if (problem.constraints && problem.constraints.length > 0) {
      context += `\n- Constraints: ${problem.constraints.join(", ")}`;
    }

    if (problem.examples && problem.examples.length > 0) {
      context += `\n- Examples: ${problem.examples.length} provided`;
    }

    if (problem.category) {
      context += `\n- Category: ${problem.category}`;
    }

    return context;
  }

  /**
   * Format session context for the prompt
   */
  formatSessionContext(context) {
    let sessionInfo = `- Topics Explored: ${
      context.explored.length > 0 ? context.explored.join(", ") : "None"
    }`;

    if (context.currentFocus) {
      sessionInfo += `\n- Current Focus: ${context.currentFocus}`;
    }

    if (context.sessionDuration > 0) {
      sessionInfo += `\n- Session Duration: ${context.sessionDuration} minutes`;
    }

    if (context.userCode && context.userCode.length > 0) {
      sessionInfo += `\n- User Code: ${context.userCode.length} characters`;
    }

    return sessionInfo;
  }

  /**
   * Get a welcome message for starting Guide Me
   */
  getWelcomeMessage(problemInfo) {
    return `🎯 **Guide Me Mode Activated!**

I'm here to help you understand **${problemInfo.title}** (${problemInfo.difficulty}).

Choose what you'd like to explore:

🧠 **Understand the approach** - Learn the core reasoning and data structure choices
⚠️ **Handle edge cases** - Identify problem-specific edge cases and handling strategies  
📊 **Analyze complexity** - Understand time/space complexity requirements
🔗 **Prepare for follow-ups** - Get ready for interview follow-up questions

What would you like to start with?`;
  }

  /**
   * Get a completion message when all features are explored
   */
  getCompletionMessage(sessionSummary) {
    return `🎉 **Guide Me Session Complete!**

Great work! You've explored all aspects of **${sessionSummary.title}**.

**Session Summary:**
• Topics explored: ${sessionSummary.topicsExplored}/4
• Session duration: ${sessionSummary.sessionDuration} minutes
• Problem difficulty: ${sessionSummary.difficulty}

**Next Steps:**
📚 Check the **Resources** section for additional learning materials
💻 Try implementing a solution to practice what you've learned
🔄 Start a new Guide Me session with another problem

Keep practicing and good luck with your interviews! 🚀`;
  }

  /**
   * Get a feature exploration message
   */
  getFeatureExplorationMessage(featureId, context) {
    const feature = this.featurePrompts[featureId];
    const problemTitle = context.problem.title || "this problem";

    return `🔍 **Exploring: ${feature.title}**

Let me help you understand ${feature.focus.toLowerCase()} for **${problemTitle}**.

${feature.instructions}

Let me analyze the problem and provide focused guidance...`;
  }

  /**
   * Get a follow-up question prompt
   */
  getFollowUpPrompt(featureId, context) {
    const availableFeatures =
      context.explored.length < 4
        ? context.explored.filter((f) => f !== featureId)
        : [];

    if (availableFeatures.length === 0) {
      return `Would you like me to help you with anything else about this problem, or are you ready to check the Resources section?`;
    }

    const nextFeature = availableFeatures[0];
    const feature = this.featurePrompts[nextFeature];

    return `Great! Now that we've covered ${this.featurePrompts[
      featureId
    ].title.toLowerCase()}, would you like to explore **${feature.title.toLowerCase()}** next?`;
  }

  /**
   * Build conversation prompt for ongoing discussions
   */
  buildConversationPrompt(featureId, context) {
    const feature = this.featurePrompts[featureId];
    if (!feature) {
      throw new Error(`Unknown feature: ${featureId}`);
    }

    const problemContext = this.formatProblemContext(context.problem);
    const sessionContext = this.formatSessionContext(context);

    return `${this.basePrompt}

CONTINUING CONVERSATION ABOUT: ${feature.title}
${feature.focus}

${feature.instructions}

PROBLEM CONTEXT:
${problemContext}

SESSION CONTEXT:
${sessionContext}

CONVERSATION INSTRUCTIONS:
- Continue the discussion about this specific topic
- Answer questions, provide clarifications, and give examples
- Keep responses focused and relevant to the current topic
- Encourage the user to think through concepts
- When the user seems ready, suggest moving to the next topic

Remember: Only reference information explicitly provided above. Keep responses concise and helpful.`;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = GuideMePrompts;
} else {
  // Browser environment
  window.GuideMePrompts = GuideMePrompts;
}
