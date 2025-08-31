/**
 * Guide Me Session Manager
 * Manages the state and flow of a Guide Me interview session
 */

class GuideMeSession {
  constructor(problemInfo, userCode) {
    this.problemInfo = problemInfo;
    this.userCode = userCode;
    this.exploredTopics = [];
    this.currentFocus = null;
    this.conversationHistory = [];
    this.userInsights = {};
    this.sessionStartTime = new Date();
    this.isActive = false;
  }

  /**
   * Start a new Guide Me session
   */
  startSession() {
    this.isActive = true;
    this.sessionStartTime = new Date();
    console.log("Guide Me session started for:", this.problemInfo.title);
    return this.getSessionStatus();
  }

  /**
   * Set the current focus topic
   */
  setCurrentFocus(topicId) {
    this.currentFocus = topicId;
    console.log("Guide Me focus set to:", topicId);
  }

  /**
   * Set conversation mode for a specific feature
   */
  setConversationMode(featureId) {
    this.conversationMode = featureId;
    console.log("Guide Me conversation mode set to:", featureId);
  }

  /**
   * Add a topic to explored topics
   */
  addExploredTopic(topicId) {
    if (!this.exploredTopics.includes(topicId)) {
      this.exploredTopics.push(topicId);
      console.log("Added topic to explored:", topicId);
    }
  }

  /**
   * Add user insight for a topic
   */
  addUserInsight(topic, insight) {
    this.userInsights[topic] = insight;
    console.log("User insight added for", topic, ":", insight);
  }

  /**
   * Add message to conversation history
   */
  addMessage(role, content, timestamp = new Date()) {
    this.conversationHistory.push({
      role,
      content,
      timestamp,
    });
  }

  /**
   * Get the current session status
   */
  getSessionStatus() {
    return {
      isActive: this.isActive,
      problemTitle: this.problemInfo.title,
      exploredTopics: this.exploredTopics,
      currentFocus: this.currentFocus,
      sessionDuration: this.getSessionDuration(),
      totalMessages: this.conversationHistory.length,
    };
  }

  /**
   * Get session duration in minutes
   */
  getSessionDuration() {
    if (!this.sessionStartTime) return 0;
    const duration = new Date() - this.sessionStartTime;
    return Math.round(duration / 60000); // Convert to minutes
  }

  /**
   * Build context for LLM interactions
   */
  buildLLMContext() {
    return {
      problem: this.problemInfo,
      userCode: this.userCode,
      explored: this.exploredTopics,
      currentFocus: this.currentFocus,
      userInsights: this.userInsights,
      sessionDuration: this.getSessionDuration(),
    };
  }

  /**
   * Get available features that haven't been explored
   */
  getAvailableFeatures() {
    const allFeatures = [
      {
        id: "intuition",
        label: "Understand the approach",
        icon: "🧠",
        description: "Learn the core reasoning and data structure choices",
      },
      {
        id: "edgeCases",
        label: "Handle edge cases",
        icon: "⚠️",
        description:
          "Identify problem-specific edge cases and handling strategies",
      },
      {
        id: "complexity",
        label: "Analyze complexity",
        icon: "📊",
        description: "Understand time/space complexity requirements",
      },
      {
        id: "followUps",
        label: "Prepare for follow-ups",
        icon: "🔗",
        description: "Get ready for interview follow-up questions",
      },
    ];

    return allFeatures.filter(
      (feature) => !this.exploredTopics.includes(feature.id)
    );
  }

  /**
   * Get feature by ID
   */
  getFeature(featureId) {
    const allFeatures = [
      { id: "intuition", label: "Understand the approach", icon: "🧠" },
      { id: "edgeCases", label: "Handle edge cases", icon: "⚠️" },
      { id: "complexity", label: "Analyze complexity", icon: "📊" },
      { id: "followUps", label: "Prepare for follow-ups", icon: "🔗" },
    ];

    return allFeatures.find((f) => f.id === featureId);
  }

  /**
   * Check if session should end
   */
  shouldEndSession() {
    // End if all topics explored
    if (this.exploredTopics.length >= 4) return true;

    // End if session is too long (more than 30 minutes)
    if (this.getSessionDuration() > 30) return true;

    return false;
  }

  /**
   * Check if session is active
   */
  isSessionActive() {
    return this.isActive === true;
  }

  /**
   * Complete the session
   */
  completeSession() {
    this.isActive = false;
    const summary = {
      totalTopics: this.exploredTopics.length,
      sessionDuration: this.getSessionDuration(),
      exploredTopics: this.exploredTopics,
      recommendations: this.generateRecommendations(),
    };

    console.log("Guide Me session completed:", summary);
    return summary;
  }

  /**
   * Generate recommendations based on session
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.exploredTopics.length < 2) {
      recommendations.push(
        "Consider exploring more aspects of the problem to get a comprehensive understanding"
      );
    }

    if (this.userCode && this.userCode.length < 50) {
      recommendations.push(
        "Try implementing a solution to get hands-on practice"
      );
    }

    recommendations.push(
      "Check the Resources section for additional learning materials"
    );

    return recommendations;
  }

  /**
   * Reset the session
   */
  resetSession() {
    this.exploredTopics = [];
    this.currentFocus = null;
    this.conversationHistory = [];
    this.userInsights = {};
    this.isActive = false;
    console.log("Guide Me session reset");
  }

  /**
   * Get session summary for display
   */
  getSessionSummary() {
    return {
      title: this.problemInfo.title,
      difficulty: this.problemInfo.difficulty,
      topicsExplored: this.exploredTopics.length,
      sessionDuration: this.getSessionDuration(),
      currentFocus: this.currentFocus,
      nextSteps: this.getNextSteps(),
    };
  }

  /**
   * Get suggested next steps
   */
  getNextSteps() {
    const availableFeatures = this.getAvailableFeatures();

    if (availableFeatures.length === 0) {
      return ["Session complete! Check Resources for more learning materials"];
    }

    return availableFeatures.map((feature) => `Explore: ${feature.label}`);
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = GuideMeSession;
} else {
  // Browser environment
  window.GuideMeSession = GuideMeSession;
}
