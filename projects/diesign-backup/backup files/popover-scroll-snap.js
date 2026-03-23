// Popover Scroll Snap Drag Module

export class PopoverScrollSnap {
  constructor(selector = '.project-pop:popover-open .oversnap-scroller', options = {}) {
    // Merge all selectors into options for full configurability
    this.options = Object.assign({
      scrollerSelector: selector,
      bodySelector: '.oversnap-body',
      figureSelector: 'figure',
      navSelector: '.pop-nav',
      prevSelector: '.prev',
      nextSelector: '.next',
      speedMultiplier: 1.2,
      friction: 0.92,
      minVelocity: 0.5,
      snapDelay: 80,
      enableMomentum: true,
      enableSnap: true,
    }, options);

    this.active = false;
    this.isMouse = false;
    this.scroller = null;
    this.body = null;
    this.figures = [];
    this.currentFigure = null;
    this.isDragging = false;
    this.isVerticalDrag = false;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.rafId = null;
    this.lastTime = 0;
    this.snapTimeout = null;

    this.init();
  }

  init() {
    // Only run if mouse is present
    window.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') this.isMouse = true;
    }, { once: true });

    // Observe popover open/close
    this.popoverObserver = new MutationObserver(() => this.handlePopover());
    this.popoverObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['popover'] });

    // Initial check
    this.handlePopover();
  }

  handlePopover() {
    // Only one popover open at a time
    const scroller = document.querySelector(this.options.scrollerSelector);
    if (scroller && this.isMouse) {
      if (!this.active) this.activate(scroller);
    } else {
      if (this.active) this.deactivate();
    }
  }

  activate(scroller) {
    this.active = true;
    this.scroller = scroller;
    this.body = scroller.querySelector(this.options.bodySelector);
    this.figures = Array.from(this.body.querySelectorAll(this.options.figureSelector));

    // Mouse drag events
    this.scroller.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    // Nav buttons
    this.setupNav();

    // Snap observer for nav state
    this.snapObserver = new IntersectionObserver(this.onSnapChange, {
      root: this.scroller,
      threshold: 0.6
    });
    this.figures.forEach(fig => this.snapObserver.observe(fig));
    this.updateNav();
  }

  deactivate() {
    this.active = false;
    if (this.scroller) {
      this.scroller.removeEventListener('pointerdown', this.onPointerDown);
      this.teardownNav();
    }
    if (this.snapObserver) {
      this.snapObserver.disconnect();
    }
    this.cancelMomentum();
    this.scroller = null;
    this.body = null;
    this.figures = [];
    this.currentFigure = null;
  }

  // --- Drag Logic ---

  onPointerDown = (e) => {
    if (e.button !== 0) return; // Only left mouse
    e.preventDefault();
    this.isDragging = true;
    this.isVerticalDrag = false;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.lastTime = performance.now();

    // If pointerdown on a figure, allow vertical drag
    const fig = e.target.closest(this.options.figureSelector);
    if (fig) this.currentFigure = fig;

    document.addEventListener('pointermove', this.onPointerMove, { passive: false });
    document.addEventListener('pointerup', this.onPointerUp, { passive: false });

    this.scroller.classList.add('dragging');
    this.cancelMomentum();
  }

  onPointerMove = (e) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    const dt = performance.now() - this.lastTime;

    // Detect drag direction
    if (!this.isVerticalDrag && Math.abs(dx) > Math.abs(dy)) {
      // Horizontal drag: scroll scroller
      this.scroller.scrollLeft -= dx;
      this.velocityX = dx / (dt || 1) * 16 * this.options.speedMultiplier;
      this.velocityY = 0;
    } else if (this.currentFigure) {
      // Vertical drag: scroll figure
      this.isVerticalDrag = true;
      this.currentFigure.scrollTop -= dy;
      this.velocityY = dy / (dt || 1) * 16 * this.options.speedMultiplier;
      this.velocityX = 0;
    }

    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastTime = performance.now();
  }

  onPointerUp = (e) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.scroller.classList.remove('dragging');
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);

    if (this.options.enableMomentum && Math.abs(this.velocityX) > this.options.minVelocity) {
      this.startMomentum();
    } else if (this.options.enableSnap) {
      this.snapToClosest();
    }
    this.velocityX = 0;
    this.velocityY = 0;
    this.currentFigure = null;
  }

  // --- Momentum and Snap ---

  startMomentum() {
    const step = () => {
      this.scroller.scrollLeft -= this.velocityX;
      this.velocityX *= this.options.friction;
      if (Math.abs(this.velocityX) > this.options.minVelocity) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.rafId = null;
        if (this.options.enableSnap) this.snapToClosest();
      }
    };
    this.rafId = requestAnimationFrame(step);
  }

  cancelMomentum() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  snapToClosest() {
    if (this.snapTimeout) clearTimeout(this.snapTimeout);
    this.snapTimeout = setTimeout(() => {
      const snapPoints = this.figures.map(fig => fig.offsetLeft - this.body.offsetLeft);
      const current = this.scroller.scrollLeft;
      let closest = snapPoints[0];
      let minDist = Math.abs(current - closest);
      for (let i = 1; i < snapPoints.length; i++) {
        const dist = Math.abs(current - snapPoints[i]);
        if (dist < minDist) {
          closest = snapPoints[i];
          minDist = dist;
        }
      }
      this.scroller.scrollTo({ left: closest, behavior: 'smooth' });
    }, this.options.snapDelay);
  }

  // --- Nav Buttons ---

  setupNav() {
    const nav = this.scroller.closest('.project-pop').querySelector(this.options.navSelector);
    if (!nav) return;
    this.nav = nav;
    this.prevBtn = nav.querySelector(this.options.prevSelector);
    this.nextBtn = nav.querySelector(this.options.nextSelector);

    this.prevBtn?.addEventListener('click', this.onPrevClick);
    this.nextBtn?.addEventListener('click', this.onNextClick);
  }

  teardownNav() {
    if (this.prevBtn) this.prevBtn.removeEventListener('click', this.onPrevClick);
    if (this.nextBtn) this.nextBtn.removeEventListener('click', this.onNextClick);
    this.nav = null;
    this.prevBtn = null;
    this.nextBtn = null;
  }

  onPrevClick = (e) => {
    e.preventDefault();
    const idx = this.getCurrentIndex();
    if (idx > 0) {
      this.scrollToIndex(idx - 1);
    }
  }

  onNextClick = (e) => {
    e.preventDefault();
    const idx = this.getCurrentIndex();
    if (idx < this.figures.length - 1) {
      this.scrollToIndex(idx + 1);
    }
  }

  scrollToIndex(idx) {
    const fig = this.figures[idx];
    if (fig) {
      this.scroller.scrollTo({ left: fig.offsetLeft - this.body.offsetLeft, behavior: 'smooth' });
    }
  }

  getCurrentIndex() {
    const current = this.scroller.scrollLeft;
    let closestIdx = 0;
    let minDist = Math.abs(current - (this.figures[0].offsetLeft - this.body.offsetLeft));
    for (let i = 1; i < this.figures.length; i++) {
      const dist = Math.abs(current - (this.figures[i].offsetLeft - this.body.offsetLeft));
      if (dist < minDist) {
        closestIdx = i;
        minDist = dist;
      }
    }
    return closestIdx;
  }

  // --- Snap Observer for Nav State ---

  onSnapChange = (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        this.currentFigure = entry.target;
        this.updateNav();
        break;
      }
    }
  }

  updateNav() {
    const idx = this.getCurrentIndex();
    if (this.prevBtn) {
      this.prevBtn.disabled = idx === 0;
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = idx === this.figures.length - 1 || this.figures.length === 1;
    }
  }
}

// Usage example (import and instantiate in your main JS):
// import { PopoverScrollSnap } from './components/popover-scroll-snap.js';
// new PopoverScrollSnap({
//   scrollerSelector: '.project-pop:popover-open .oversnap-scroller',
//   bodySelector: '.oversnap-body',
//   figureSelector: 'figure',
//   navSelector: '.pop-nav',
//   prevSelector: '.prev',
//   nextSelector: '.next'
// });