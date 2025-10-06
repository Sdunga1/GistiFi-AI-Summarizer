/**
 * Animated Circle Help Icon
 * A simple animated help icon with question mark bounce effect
 */
class CircleHelpIcon {
  constructor(options = {}) {
    this.width = options.width || 16;
    this.height = options.height || 16;
    this.strokeWidth = options.strokeWidth || 2;
    this.stroke = options.stroke || 'currentColor';
    this.className = options.className || '';
  }

  create() {
    const container = document.createElement('div');
    container.className = `circle-help-icon ${this.className}`;
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

    // Create the help elements
    const elements = this.createHelpElements();
    elements.forEach(el => svg.appendChild(el));

    container.appendChild(svg);
    this.addHoverEffects(container, svg);

    return container;
  }

  createHelpElements() {
    const elements = [];

    // Circle
    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    circle.style.cssText = 'transition: all 0.3s ease;';
    elements.push(circle);

    // Question mark group
    const questionGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    questionGroup.style.cssText = 'transition: transform 0.3s ease;';
    questionGroup.dataset.questionGroup = 'true';

    // Question mark curve
    const questionCurve = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    questionCurve.setAttribute('d', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3');
    questionGroup.appendChild(questionCurve);

    // Question mark dot
    const questionDot = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    questionDot.setAttribute('d', 'M12 17h.01');
    questionGroup.appendChild(questionDot);

    elements.push(questionGroup);

    return elements;
  }

  addHoverEffects(container, svg) {
    const questionGroup = svg.querySelector('[data-question-group="true"]');

    const animateHelp = () => {
      // Bounce the question mark up
      questionGroup.style.transform = 'translateY(-2px)';
    };

    const resetHelp = () => {
      // Reset position
      questionGroup.style.transform = 'translateY(0px)';
    };

    // Listen on the icon container
    container.addEventListener('mouseenter', animateHelp);
    container.addEventListener('mouseleave', resetHelp);

    // Also listen on the parent button if it exists
    const parentButton = container.closest('button');
    if (parentButton) {
      parentButton.addEventListener('mouseenter', animateHelp);
      parentButton.addEventListener('mouseleave', resetHelp);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CircleHelpIcon;
} else if (typeof window !== 'undefined') {
  window.CircleHelpIcon = CircleHelpIcon;
}
