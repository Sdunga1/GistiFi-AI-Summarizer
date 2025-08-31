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

CORE PRINCIPLES:
1. Show user's code when they ask for it
2. Use their actual code and problem context
3. Respond naturally to whatever they ask
4. Give hints when they're struggling
5. Be a helpful mentor, not a rigid bot

TONE: Be encouraging, focused, and conversational. Guide naturally without being overwhelming.

APPROACH: Trust your knowledge and respond naturally to whatever the user asks. Don't follow rigid scripts - just be helpful!`;
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
          "1. Ask 1-2 focused questions about their understanding\n" +
          "2. Validate their response with direct feedback\n" +
          "3. Guide them to understand the approach naturally\n" +
          "4. Use their code and problem constraints for context",
      },

      edgeCases: {
        title: "⚠️ Handling Edge Cases",
        focus:
          "Identify problem-specific edge cases based on constraints and provide general handling tips",
        instructions:
          "1. Ask 1-2 focused questions about edge cases they can identify\n" +
          "2. Validate their response with direct feedback\n" +
          "3. Guide them to understand all relevant edge cases\n" +
          "4. Use problem constraints and their code for context",
      },

      complexity: {
        title: "📊 Analyzing Complexity",
        focus:
          "Analyze time/space complexity based on user's code and problem constraints",
        instructions:
          "1. Show user's code when they ask for it\n" +
          "2. Help them understand complexity based on their actual code\n" +
          "3. Give hints when they're struggling\n" +
          "4. Respond naturally to whatever they ask",
      },

      followUps: {
        title: "🔗 Preparing for Follow-ups",
        focus:
          "Suggest follow-up questions an interviewer might ask and connect to related concepts",
        instructions:
          "1. Ask 1-2 focused questions about what they think interviewers might ask\n" +
          "2. Validate their response with direct feedback\n" +
          "3. Guide them to understand common follow-up questions\n" +
          "4. Connect to related concepts and study areas",
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
1. Ask 1-2 focused questions about user's understanding
2. Validate their response with direct feedback
3. Guide them to the correct answer naturally
4. Provide specific insights based on their code + constraints
5. Keep it conversational and focused

Remember: Max 2-3 questions total, then provide insights and guidance.`;
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
      sessionInfo += `\n\nUser's Current Code:\n\`\`\`\n${context.userCode}\n\`\`\``;
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
- Continue the discussion about this specific topic naturally
- Answer questions and provide clarifications
- Give concrete examples and insights
- Keep responses focused and relevant
- Validate user responses with direct feedback
- Guide to correct answers without overwhelming

Remember: Keep it conversational and focused. Max 2-3 questions total.`;
  }

  // Complexity graphs removed - focusing on natural conversation instead
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = GuideMePrompts;
} else {
  // Browser environment
  window.GuideMePrompts = GuideMePrompts;
}
