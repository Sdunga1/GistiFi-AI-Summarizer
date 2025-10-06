/**
 * Animated Annoyed Icon
 * A simple animated annoyed face icon with pulsing and blinking effects
 */
class AnnoyedIcon {
  constructor(options = {}) {
    this.width = options.width || 16;
    this.height = options.height || 16;
    this.strokeWidth = options.strokeWidth || 2;
    this.stroke = options.stroke || 'currentColor';
    this.className = options.className || '';
  }

  create() {
    const container = document.createElement('div');
    container.className = `annoyed-icon ${this.className}`;
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

    // Create the face elements
    const elements = this.createFaceElements();
    elements.forEach(el => svg.appendChild(el));

    container.appendChild(svg);
    this.addHoverEffects(container, svg);

    return container;
  }

  createFaceElements() {
    const elements = [];

    // Circle (face)
    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    circle.style.cssText = 'transition: transform 0.5s ease;';
    circle.dataset.faceCircle = 'true';
    elements.push(circle);

    // Mouth
    const mouth = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    mouth.setAttribute('d', 'M8 15h8');
    mouth.style.cssText = 'transition: all 0.3s ease;';
    mouth.dataset.mouth = 'true';
    elements.push(mouth);

    // Eyes group
    const eyesGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    eyesGroup.style.cssText = 'transition: transform 0.2s ease;';
    eyesGroup.dataset.eyesGroup = 'true';

    // Left eye
    const leftEye = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    leftEye.setAttribute('d', 'M8 9h2');
    eyesGroup.appendChild(leftEye);

    // Right eye
    const rightEye = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    rightEye.setAttribute('d', 'M14 9h2');
    eyesGroup.appendChild(rightEye);

    elements.push(eyesGroup);

    return elements;
  }

  addHoverEffects(container, svg) {
    const faceCircle = svg.querySelector('[data-face-circle="true"]');
    const mouth = svg.querySelector('[data-mouth="true"]');
    const eyesGroup = svg.querySelector('[data-eyes-group="true"]');

    let animationInterval;

    const animateAnnoyed = () => {
      // Start pulsing animation
      let scale = 1;
      let growing = true;

      animationInterval = setInterval(() => {
        if (growing) {
          scale += 0.02;
          if (scale >= 1.1) {
            growing = false;
          }
        } else {
          scale -= 0.02;
          if (scale <= 1) {
            growing = true;
            scale = 1;
          }
        }
        faceCircle.style.transform = `scale(${scale})`;
      }, 50);

      // Animate mouth
      mouth.style.strokeDasharray = '100';
      mouth.style.strokeDashoffset = '70';
      mouth.style.opacity = '0.5';

      setTimeout(() => {
        mouth.style.strokeDashoffset = '0';
        mouth.style.opacity = '1';
      }, 150);

      // Blink eyes
      eyesGroup.style.transform = 'scale(0.8)';
      setTimeout(() => {
        eyesGroup.style.transform = 'scale(1)';
      }, 200);
    };

    const resetAnnoyed = () => {
      // Stop pulsing animation
      if (animationInterval) {
        clearInterval(animationInterval);
      }

      // Reset all elements
      faceCircle.style.transform = 'scale(1)';
      mouth.style.strokeDasharray = 'none';
      mouth.style.strokeDashoffset = '0';
      mouth.style.opacity = '1';
      eyesGroup.style.transform = 'scale(1)';
    };

    // Store animation functions on the container for external access
    container.animateAnnoyed = animateAnnoyed;
    container.resetAnnoyed = resetAnnoyed;

    // Listen on the icon container
    container.addEventListener('mouseenter', animateAnnoyed);
    container.addEventListener('mouseleave', resetAnnoyed);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnnoyedIcon;
} else if (typeof window !== 'undefined') {
  window.AnnoyedIcon = AnnoyedIcon;
}
