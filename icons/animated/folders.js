/**
 * Animated Folders Icon
 * A simple animated folders icon with folder movement effect
 */
class FoldersIcon {
  constructor(options = {}) {
    this.width = options.width || 16;
    this.height = options.height || 16;
    this.strokeWidth = options.strokeWidth || 2;
    this.stroke = options.stroke || 'currentColor';
    this.className = options.className || '';
  }

  create() {
    const container = document.createElement('div');
    container.className = `folders-icon ${this.className}`;
    container.style.cssText = `
      cursor: pointer;
      user-select: none;
      padding: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    `;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.width);
    svg.setAttribute('height', this.height);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', this.stroke);
    svg.setAttribute('stroke-width', this.strokeWidth);
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    // Create the folder elements
    const elements = this.createFolderElements();
    elements.forEach(el => svg.appendChild(el));

    container.appendChild(svg);
    this.addHoverEffects(container, svg);

    return container;
  }

  createFolderElements() {
    const elements = [];

    // Main folder group
    const mainFolderGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    mainFolderGroup.style.cssText = 'transition: transform 0.3s ease;';
    mainFolderGroup.dataset.mainFolder = 'true';

    // Main folder
    const mainFolder = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    mainFolder.setAttribute(
      'd',
      'M20 17a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.9a2 2 0 0 1-1.69-.9l-.81-1.2a2 2 0 0 0-1.67-.9H8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z'
    );
    mainFolderGroup.appendChild(mainFolder);

    elements.push(mainFolderGroup);

    // Bottom line group
    const bottomLineGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    bottomLineGroup.style.cssText = 'transition: all 0.3s ease;';
    bottomLineGroup.dataset.bottomLine = 'true';

    // Bottom line
    const bottomLine = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    bottomLine.setAttribute('d', 'M2 8v11a2 2 0 0 0 2 2h14');
    bottomLineGroup.appendChild(bottomLine);

    elements.push(bottomLineGroup);

    return elements;
  }

  addHoverEffects(container, svg) {
    const mainFolderGroup = svg.querySelector('[data-main-folder="true"]');
    const bottomLineGroup = svg.querySelector('[data-bottom-line="true"]');

    const animateFolders = () => {
      // Move main folder up and left
      mainFolderGroup.style.transform = 'translate(-4px, 2px)';

      // Fade out and move bottom line
      bottomLineGroup.style.opacity = '0';
      bottomLineGroup.style.transform = 'translate(4px, -2px)';
    };

    const resetFolders = () => {
      // Reset main folder position
      mainFolderGroup.style.transform = 'translate(0px, 0px)';

      // Reset bottom line
      bottomLineGroup.style.opacity = '1';
      bottomLineGroup.style.transform = 'translate(0px, 0px)';
    };

    // Store animation functions on the container for external access
    container.animateFolders = animateFolders;
    container.resetFolders = resetFolders;

    // Listen on the icon container
    container.addEventListener('mouseenter', animateFolders);
    container.addEventListener('mouseleave', resetFolders);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FoldersIcon;
} else if (typeof window !== 'undefined') {
  window.FoldersIcon = FoldersIcon;
}
