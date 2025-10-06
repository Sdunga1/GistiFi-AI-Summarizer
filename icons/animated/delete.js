/**
 * Animated Delete Icon
 * A simple animated delete icon with lid opening effect
 */
class DeleteIcon {
  constructor(options = {}) {
    this.width = options.width || 16;
    this.height = options.height || 16;
    this.strokeWidth = options.strokeWidth || 2;
    this.stroke = options.stroke || 'currentColor';
    this.className = options.className || '';
  }

  create() {
    const container = document.createElement('div');
    container.className = `delete-icon ${this.className}`;
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

    // Create the delete elements
    const elements = this.createDeleteElements();
    elements.forEach(el => svg.appendChild(el));

    container.appendChild(svg);
    this.addHoverEffects(container, svg);

    return container;
  }

  createDeleteElements() {
    const elements = [];

    // Lid group
    const lidGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    lidGroup.style.cssText = 'transition: transform 0.3s ease;';
    lidGroup.dataset.lidGroup = 'true';

    // Lid top line
    const lidTop = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    lidTop.setAttribute('d', 'M3 6h18');
    lidGroup.appendChild(lidTop);

    // Lid handle
    const lidHandle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    lidHandle.setAttribute('d', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2');
    lidGroup.appendChild(lidHandle);

    elements.push(lidGroup);

    // Trash can body
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    body.setAttribute('d', 'M19 8v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V8');
    body.style.cssText = 'transition: all 0.3s ease;';
    body.dataset.trashBody = 'true';
    elements.push(body);

    // Vertical lines
    const line1 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'line'
    );
    line1.setAttribute('x1', '10');
    line1.setAttribute('x2', '10');
    line1.setAttribute('y1', '11');
    line1.setAttribute('y2', '17');
    line1.style.cssText = 'transition: all 0.3s ease;';
    line1.dataset.trashLine = 'true';
    elements.push(line1);

    const line2 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'line'
    );
    line2.setAttribute('x1', '14');
    line2.setAttribute('x2', '14');
    line2.setAttribute('y1', '11');
    line2.setAttribute('y2', '17');
    line2.style.cssText = 'transition: all 0.3s ease;';
    line2.dataset.trashLine = 'true';
    elements.push(line2);

    return elements;
  }

  addHoverEffects(container, svg) {
    const lidGroup = svg.querySelector('[data-lid-group="true"]');
    const trashBody = svg.querySelector('[data-trash-body="true"]');
    const trashLines = svg.querySelectorAll('[data-trash-line="true"]');

    const animateDelete = () => {
      // Lift lid
      lidGroup.style.transform = 'translateY(-1.1px)';

      // Slightly adjust trash body
      trashBody.setAttribute('d', 'M19 9v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V9');

      // Adjust vertical lines
      trashLines.forEach(line => {
        line.setAttribute('y1', '11.5');
        line.setAttribute('y2', '17.5');
      });
    };

    const resetDelete = () => {
      // Reset lid
      lidGroup.style.transform = 'translateY(0px)';

      // Reset trash body
      trashBody.setAttribute('d', 'M19 8v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V8');

      // Reset vertical lines
      trashLines.forEach(line => {
        line.setAttribute('y1', '11');
        line.setAttribute('y2', '17');
      });
    };

    // Store animation functions on the container for external access
    container.animateDelete = animateDelete;
    container.resetDelete = resetDelete;

    // Listen on the icon container
    container.addEventListener('mouseenter', animateDelete);
    container.addEventListener('mouseleave', resetDelete);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeleteIcon;
} else if (typeof window !== 'undefined') {
  window.DeleteIcon = DeleteIcon;
}
