/**
 * Animated Download Icon
 * A simple animated download icon with bouncing arrow effect
 */
class DownloadIcon {
  constructor(options = {}) {
    this.width = options.width || 16;
    this.height = options.height || 16;
    this.strokeWidth = options.strokeWidth || 2;
    this.stroke = options.stroke || 'currentColor';
    this.className = options.className || '';
  }

  create() {
    const container = document.createElement('div');
    container.className = `download-icon ${this.className}`;
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

    // Create the download elements
    const elements = this.createDownloadElements();
    elements.forEach(el => svg.appendChild(el));

    container.appendChild(svg);
    this.addHoverEffects(container, svg);

    return container;
  }

  createDownloadElements() {
    const elements = [];

    // Container for the arrow
    const arrowGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    arrowGroup.style.cssText = 'transition: transform 0.3s ease;';
    arrowGroup.dataset.arrowGroup = 'true';

    // Arrow polyline
    const polyline = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polyline'
    );
    polyline.setAttribute('points', '7 10 12 15 17 10');
    polyline.style.cssText = 'transition: all 0.3s ease;';
    arrowGroup.appendChild(polyline);

    // Arrow line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '12');
    line.setAttribute('x2', '12');
    line.setAttribute('y1', '15');
    line.setAttribute('y2', '3');
    line.style.cssText = 'transition: all 0.3s ease;';
    arrowGroup.appendChild(line);

    elements.push(arrowGroup);

    // Container box
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    box.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
    box.style.cssText = 'transition: all 0.3s ease;';
    elements.push(box);

    return elements;
  }

  addHoverEffects(container, svg) {
    const arrowGroup = svg.querySelector('[data-arrow-group="true"]');

    const animateBounce = () => {
      // Bounce animation
      let bounceCount = 0;
      const bounce = () => {
        if (bounceCount < 3) {
          arrowGroup.style.transform = 'translateY(3px)';
          setTimeout(() => {
            arrowGroup.style.transform = 'translateY(0px)';
            bounceCount++;
            if (bounceCount < 3) {
              setTimeout(bounce, 150);
            }
          }, 150);
        }
      };
      bounce();
    };

    const resetBounce = () => {
      arrowGroup.style.transform = 'translateY(0px)';
    };

    // Store animation functions on the container for external access
    container.animateBounce = animateBounce;
    container.resetBounce = resetBounce;

    // Listen on the icon container
    container.addEventListener('mouseenter', animateBounce);
    container.addEventListener('mouseleave', resetBounce);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DownloadIcon;
} else if (typeof window !== 'undefined') {
  window.DownloadIcon = DownloadIcon;
}
