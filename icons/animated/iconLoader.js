/**
 * Icon Loader Utility
 * Simple utility to load and replace emojis with animated icons
 */
class IconLoader {
  constructor() {
    this.icons = new Map();
    this.loadIcons();
  }

  loadIcons() {
    // Load ChartColumn icon
    if (typeof ChartColumnIcon !== 'undefined') {
      this.icons.set('chart-column', ChartColumnIcon);
    }

    // Load Download icon
    if (typeof DownloadIcon !== 'undefined') {
      this.icons.set('download', DownloadIcon);
    }

    // Load Delete icon
    if (typeof DeleteIcon !== 'undefined') {
      this.icons.set('delete', DeleteIcon);
    }

    // Load CircleHelp icon
    if (typeof CircleHelpIcon !== 'undefined') {
      this.icons.set('circle-help', CircleHelpIcon);
    }

    // Load Folders icon
    if (typeof FoldersIcon !== 'undefined') {
      this.icons.set('folders', FoldersIcon);
    }

    // Load Annoyed icon
    if (typeof AnnoyedIcon !== 'undefined') {
      this.icons.set('annoyed', AnnoyedIcon);
    }
  }

  /**
   * Replace emoji with animated icon
   * @param {string} emoji - The emoji to replace
   * @param {string} iconType - The type of icon to use
   * @param {Object} options - Icon options
   * @returns {HTMLElement} The animated icon element
   */
  replaceEmoji(emoji, iconType, options = {}) {
    const IconClass = this.icons.get(iconType);
    if (!IconClass) {
      console.warn(`Icon type '${iconType}' not found`);
      return this.createFallbackElement(emoji);
    }

    const icon = new IconClass(options);
    return icon.create();
  }

  /**
   * Replace emoji in a specific element
   * @param {HTMLElement} element - The element containing the emoji
   * @param {string} emoji - The emoji to replace
   * @param {string} iconType - The type of icon to use
   * @param {Object} options - Icon options
   */
  replaceEmojiInElement(element, emoji, iconType, options = {}) {
    if (element.textContent.includes(emoji)) {
      const iconElement = this.replaceEmoji(emoji, iconType, options);
      element.innerHTML = element.innerHTML.replace(
        emoji,
        iconElement.outerHTML
      );
    }
  }

  /**
   * Replace all instances of an emoji in the document
   * @param {string} emoji - The emoji to replace
   * @param {string} iconType - The type of icon to use
   * @param {Object} options - Icon options
   */
  replaceAllEmojis(emoji, iconType, options = {}) {
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      if (
        element.children.length === 0 &&
        element.textContent.includes(emoji)
      ) {
        this.replaceEmojiInElement(element, emoji, iconType, options);
      }
    });
  }

  /**
   * Create a fallback element if icon is not available
   * @param {string} emoji - The original emoji
   * @returns {HTMLElement} Fallback element
   */
  createFallbackElement(emoji) {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.style.fontSize = '16px';
    return span;
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window !== 'undefined') {
    window.iconLoader = new IconLoader();
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IconLoader;
} else if (typeof window !== 'undefined') {
  window.IconLoader = IconLoader;
}
