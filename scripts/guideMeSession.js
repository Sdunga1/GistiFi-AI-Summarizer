/**
 * Guide Me Session Manager Module
 * Manages the interview session state and conversation flow
 */

class GuideMeSessionManager {
  constructor() {
    this.currentSession = null;
    this.maxHints = 5;
    this.maxTokens = 300;
  }

  /**
   * Start a new Guide Me session
   */
  startSession(problemInfo, systemPrompt) {
    this.currentSession = {
      id: this.generateSessionId(),
      problemInfo: problemInfo,
      systemPrompt: systemPrompt,
      conversationHistory: [],
      currentPhase: "introduction",
      hintsGiven: 0,
      startTime: new Date(),
      lastActivity: new Date(),
      phaseTransitions: [],
    };

    console.log("Started new Guide Me session:", this.currentSession.id);
    return this.currentSession;
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(role, content) {
    if (!this.currentSession) return;

    const message = {
      id: this.generateMessageId(),
      role: role, // 'user' or 'assistant'
      content: content,
      timestamp: new Date(),
      phase: this.currentSession.currentPhase,
    };

    this.currentSession.conversationHistory.push(message);
    this.currentSession.lastActivity = new Date();

    console.log(`Added ${role} message to session ${this.currentSession.id}`);
  }

  /**
   * Update the current phase
   */
  updatePhase(newPhase, reason = "") {
    if (!this.currentSession) return;

    const oldPhase = this.currentSession.currentPhase;
    this.currentSession.currentPhase = newPhase;

    this.currentSession.phaseTransitions.push({
      from: oldPhase,
      to: newPhase,
      timestamp: new Date(),
      reason: reason,
    });

    console.log(`Phase transition: ${oldPhase} -> ${newPhase} (${reason})`);
  }

  /**
   * Increment hint count
   */
  incrementHints() {
    if (!this.currentSession) return;

    this.currentSession.hintsGiven = Math.min(
      this.currentSession.hintsGiven + 1,
      this.maxHints
    );

    console.log(
      `Hints given: ${this.currentSession.hintsGiven}/${this.maxHints}`
    );
  }

  /**
   * Check if session should end
   */
  shouldEndSession() {
    if (!this.currentSession) return false;

    // End if all phases completed
    if (this.currentSession.currentPhase === "feedback_next_steps") {
      return true;
    }

    // End if too many hints given
    if (this.currentSession.hintsGiven >= this.maxHints) {
      return true;
    }

    // End if session is too long (more than 30 minutes)
    const sessionDuration =
      Date.now() - this.currentSession.startTime.getTime();
    if (sessionDuration > 30 * 60 * 1000) {
      return true;
    }

    return false;
  }

  /**
   * Get session status
   */
  getSessionStatus() {
    if (!this.currentSession) {
      return {
        active: false,
        message: "No active Guide Me session",
      };
    }

    const session = this.currentSession;
    const duration = Math.round(
      (Date.now() - session.startTime.getTime()) / 1000 / 60
    );

    return {
      active: true,
      sessionId: session.id,
      problem: session.problemInfo.title,
      currentPhase: session.currentPhase,
      hintsUsed: `${session.hintsGiven}/${this.maxHints}`,
      messages: session.conversationHistory.length,
      duration: `${duration} minutes`,
      startTime: session.startTime.toLocaleTimeString(),
    };
  }

  /**
   * Get conversation context for LLM
   */
  buildConversationContext() {
    if (!this.currentSession) return "";

    const session = this.currentSession;
    let context = `System Prompt:\n${session.systemPrompt}\n\n`;

    // Add conversation history
    if (session.conversationHistory.length > 0) {
      context += "Conversation History:\n";
      session.conversationHistory.forEach((msg) => {
        context += `${msg.role === "user" ? "Candidate" : "Interviewer"}: ${
          msg.content
        }\n`;
      });
      context += "\n";
    }

    // Add current session state
    context += `Current Phase: ${session.currentPhase}\n`;
    context += `Hints Given: ${session.hintsGiven}/${this.maxHints}\n`;
    context += `Session Duration: ${Math.round(
      (Date.now() - session.startTime.getTime()) / 1000 / 60
    )} minutes\n\n`;

    context +=
      "Instructions: Respond as the expert interviewer. Keep responses short, focused, and guide the candidate through the problem-solving process. Always end with a question to keep the conversation flowing.";

    return context;
  }

  /**
   * Complete the session
   */
  completeSession() {
    if (!this.currentSession) return null;

    const session = this.currentSession;
    const endTime = new Date();
    const duration = Math.round(
      (endTime.getTime() - session.startTime.getTime()) / 1000 / 60
    );

    const sessionSummary = {
      id: session.id,
      problem: session.problemInfo.title,
      difficulty: session.problemInfo.difficulty,
      category: session.problemInfo.category,
      finalPhase: session.currentPhase,
      hintsUsed: session.hintsGiven,
      totalMessages: session.conversationHistory.length,
      duration: duration,
      startTime: session.startTime,
      endTime: endTime,
      phaseTransitions: session.phaseTransitions,
    };

    console.log("Completed Guide Me session:", sessionSummary);

    // Clear current session
    this.currentSession = null;

    return sessionSummary;
  }

  /**
   * Reset the current session
   */
  resetSession() {
    if (this.currentSession) {
      console.log("Resetting Guide Me session:", this.currentSession.id);
      this.currentSession = null;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    if (!this.currentSession) return null;

    const session = this.currentSession;
    const userMessages = session.conversationHistory.filter(
      (msg) => msg.role === "user"
    ).length;
    const assistantMessages = session.conversationHistory.filter(
      (msg) => msg.role === "assistant"
    ).length;

    return {
      totalMessages: session.conversationHistory.length,
      userMessages: userMessages,
      assistantMessages: assistantMessages,
      hintsGiven: session.hintsGiven,
      currentPhase: session.currentPhase,
      sessionDuration: Math.round(
        (Date.now() - session.startTime.getTime()) / 1000 / 60
      ),
    };
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if session is active
   */
  isActive() {
    return this.currentSession !== null;
  }

  /**
   * Get current session
   */
  getCurrentSession() {
    return this.currentSession;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = GuideMeSessionManager;
} else {
  // Browser environment
  window.GuideMeSessionManager = GuideMeSessionManager;
}
