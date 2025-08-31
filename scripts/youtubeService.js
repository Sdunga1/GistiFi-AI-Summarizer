/**
 * YouTube Service for GistiFi AI
 * Handles YouTube API calls to find relevant LeetCode solution videos
 */

class YouTubeService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = "https://www.googleapis.com/youtube/v3";
  }

  /**
   * Initialize the service with API key
   */
  async initialize() {
    try {
      const result = await chrome.storage.sync.get(["youtubeApiKey"]);
      this.apiKey = result.youtubeApiKey;
      return !!this.apiKey;
    } catch (error) {
      console.error("Error initializing YouTube service:", error);
      return false;
    }
  }

  /**
   * Search for YouTube videos related to a LeetCode problem
   */
  async searchLeetCodeVideos(
    problemTitle,
    difficulty = "",
    programmingLanguage = "",
    isOnDescriptionPage = true
  ) {
    if (!this.apiKey) {
      throw new Error("YouTube API key not configured");
    }

    if (!isOnDescriptionPage) {
      throw new Error("Must be on problem description page to search videos");
    }

    try {
      // Build search query with language if available
      let searchQuery = `LeetCode ${problemTitle} solution ${difficulty}`;
      if (programmingLanguage) {
        searchQuery += ` ${programmingLanguage}`;
      }
      const encodedQuery = encodeURIComponent(searchQuery);

      // Make API request
      const url = `${this.baseUrl}/search?part=snippet&q=${encodedQuery}&type=video&maxResults=5&order=relevance&key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      // Get video details including statistics
      const videoIds = data.items.map((item) => item.id.videoId).join(",");
      const statsUrl = `${this.baseUrl}/videos?part=statistics,snippet&id=${videoIds}&key=${this.apiKey}`;

      const statsResponse = await fetch(statsUrl);
      if (!statsResponse.ok) {
        throw new Error(`YouTube API stats error: ${statsResponse.status}`);
      }

      const statsData = await statsResponse.json();

      // Combine search results with statistics and format
      const videos = data.items.map((item, index) => {
        const stats = statsData.items[index]?.statistics || {};
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails.medium.url,
          viewCount: parseInt(stats.viewCount) || 0,
          likeCount: parseInt(stats.likeCount) || 0,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          duration: this.formatDuration(item.snippet.publishedAt),
        };
      });

      // Sort by relevance (view count + like count)
      videos.sort(
        (a, b) => b.viewCount + b.likeCount - (a.viewCount + a.likeCount)
      );

      // Return top 2 videos
      return videos.slice(0, 2);
    } catch (error) {
      console.error("Error searching YouTube videos:", error);
      throw error;
    }
  }

  /**
   * Format the time since video was published
   */
  formatDuration(publishedAt) {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInDays = Math.floor((now - published) / (1000 * 60 * 60 * 24));

    if (diffInDays < 1) return "Today";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      available: this.isAvailable(),
      hasApiKey: !!this.apiKey,
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = YouTubeService;
} else {
  // Browser environment
  window.YouTubeService = YouTubeService;
}
