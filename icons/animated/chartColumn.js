/**
 * Animated Chart Column Icon
 * A simple animated chart column icon that shows bars on hover
 */
class ChartColumnIcon {
  constructor(options = {}) {
    this.width = options.width || 16;
    this.height = options.height || 16;
    this.strokeWidth = options.strokeWidth || 2;
    this.stroke = options.stroke || 'currentColor';
    this.className = options.className || '';
  }

  create() {
    const container = document.createElement('div');
    container.className = `chart-column-icon ${this.className}`;
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

    // Create the chart elements
    const elements = this.createChartElements();
    elements.forEach(el => svg.appendChild(el));

    container.appendChild(svg);
    this.addHoverEffects(container, svg);

    return container;
  }

  createChartElements() {
    const elements = [];

    // Base frame
    const frame = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    frame.setAttribute('d', 'M3 3v16a2 2 0 0 0 2 2h16');
    frame.style.cssText = 'opacity: 1; transition: opacity 0.3s ease;';
    elements.push(frame);

    // Chart bars (initially visible)
    const bars = [
      { d: 'M8 17v-3', delay: 0 },
      { d: 'M13 17V9', delay: 0.1 },
      { d: 'M18 17V5', delay: 0.2 },
    ];

    bars.forEach((bar, index) => {
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      path.setAttribute('d', bar.d);
      path.style.cssText = `
        opacity: 1;
        stroke-dasharray: 100;
        stroke-dashoffset: 0;
        transition: all 0.3s ease;
        transition-delay: ${bar.delay}s;
      `;
      path.dataset.barIndex = index;
      elements.push(path);
    });

    return elements;
  }

  addHoverEffects(container, svg) {
    const bars = svg.querySelectorAll('path[data-bar-index]');

    const animateBars = () => {
      // Animate bars out
      bars.forEach((bar, index) => {
        setTimeout(() => {
          bar.style.strokeDashoffset = '100';
          bar.style.opacity = '0';
        }, index * 100);
      });

      // Animate bars back in
      setTimeout(() => {
        bars.forEach((bar, index) => {
          setTimeout(() => {
            bar.style.strokeDashoffset = '0';
            bar.style.opacity = '1';
          }, index * 100);
        });
      }, 300);
    };

    const resetBars = () => {
      // Reset to visible state
      bars.forEach(bar => {
        bar.style.strokeDashoffset = '0';
        bar.style.opacity = '1';
      });
    };

    // Store animation functions on the container for external access
    container.animateBars = animateBars;
    container.resetBars = resetBars;

    // Listen on the icon container
    container.addEventListener('mouseenter', animateBars);
    container.addEventListener('mouseleave', resetBars);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartColumnIcon;
} else if (typeof window !== 'undefined') {
  window.ChartColumnIcon = ChartColumnIcon;
}
