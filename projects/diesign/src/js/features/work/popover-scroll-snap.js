/**
 * PopoverDragScrollSnap
 * Enables horizontal drag-to-scroll with snap, and vertical drag-to-scroll (with inertia) on figures inside a popover.
 * Handles both mouse and (optionally) touch input.
 */
export default class PopoverDragScrollSnap {
  // Default configuration options
  config = {
    snapSelector: 'figure',
    scrollerSelector: '.oversnap-scroller',
    bodySelector: '.oversnap-body',
    prevBtnSelector: '.pop-nav .prev',
    nextBtnSelector: '.pop-nav .next',
    switchThresholdFraction: 1 / 10,
    onSlideChange: null,
    onSnapComplete: null,
    verticalDragOnFigures: true,
    verticalDragSpeed: 1,
    verticalInertia: true,
    inertiaFriction: 0.95,
    inertiaMinVelocity: 0.0,
    verticalDraggingClass: 'vertically-dragging',
    userSelectClass: 'user-select-none',
  };

  // Internal state tracking
  state = {
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollStart: 0,
    activeIndex: 0,
    slideWidth: 1,
    isVerticallyDragging: false,
    figureDragStartY: 0,
    figureScrollStart: 0,
    figureDraggingEl: null,
    lastY: 0,
    lastTime: 0,
    velocityY: 0,
    inertiaFrame: null,
    pendingDrag: null,
  };

  constructor(options = {}) {
    Object.assign(this.config, options);
    this._destroyed = false;
    this._timeouts = new Set();
    this._boundHandlers = new Map();
    this._resizeObserver = null;
    this._isDestroying = false; // Add flag to track destruction state

    // Find the currently open popover
    this.activePopover = document.querySelector('.project-pop:popover-open, .project-pop[open]');
    this.supportsMouse = window.matchMedia('(pointer: fine)').matches;

    if (!this.activePopover) {
      console.warn('[PopoverDragScrollSnap] No active popover found');
      return;
    }

    this.init();
  }

  init() {
    if (this._destroyed) return;

    this.scroller = this.activePopover.querySelector(this.config.scrollerSelector);
    this.body = this.scroller?.querySelector(this.config.bodySelector);
    this.slides = Array.from(this.body?.querySelectorAll(this.config.snapSelector) || []);
    this.prevBtn = this.activePopover.querySelector(this.config.prevBtnSelector);
    this.nextBtn = this.activePopover.querySelector(this.config.nextBtnSelector);

    if (!this.scroller || this.slides.length <= 1) {
      return;
    }

    // Prevent drag on images/videos to avoid browser drag ghost
    this.body.querySelectorAll('img, video, picture').forEach(el => {
      el.draggable = false;
    });

    this.bindEvents();
    this.updateNavState();
  }

  _setupResizeObserver() {
    if (this._destroyed || !this.scroller) return;

    try {
      this._resizeObserver = new ResizeObserver(entries => {
        // Early exit if component is destroyed or destroying
        if (this._destroyed || this._isDestroying || !this.scroller?.isConnected) {
          return;
        }

        // Use requestAnimationFrame to defer processing and avoid sync layout issues
        requestAnimationFrame(() => {
          if (!this._destroyed && !this._isDestroying && this.scroller?.isConnected) {
            try {
              this.handleResize(entries);
            } catch (error) {
              console.warn('[ResizeObserver] Error during resize:', error);
            }
          }
        });
      });

      // Observe with error handling
      if (this.scroller.isConnected) {
        this._resizeObserver.observe(this.scroller);
      }
    } catch (error) {
      console.warn('[PopoverDragScrollSnap] Failed to create ResizeObserver:', error);
      this._resizeObserver = null;
    }
  }

  handleResize(entries) {
    if (this._destroyed || this._isDestroying || !entries || !entries.length) return;
    
    // Debounce resize handling to prevent excessive calls
    if (this._resizeDebounceTimer) {
      clearTimeout(this._resizeDebounceTimer);
    }
    
    this._resizeDebounceTimer = setTimeout(() => {
      if (!this._destroyed && !this._isDestroying) {
        this.onResize();
      }
    }, 16); // One frame delay
  }

  // Create timeout wrapper that tracks timeouts for cleanup
  _setTimeout(fn, delay) {
    const timeoutId = setTimeout(() => {
      this._timeouts.delete(timeoutId);
      if (!this._destroyed && !this._isDestroying) {
        fn();
      }
    }, delay);
    this._timeouts.add(timeoutId);
    return timeoutId;
  }

  // Bind events with proper cleanup tracking
  bindEvents = () => {
    if (this._destroyed || this._isDestroying) return;

    // Store bound handlers for cleanup
    const handlers = {
      onAnyMouseDown: this.onAnyMouseDown.bind(this),
      onAnyMouseUp: this.onAnyMouseUp.bind(this),
      onAnyMouseMove: this.onAnyMouseMove.bind(this),
      onScroll: this.onScroll.bind(this),
      onResize: this.onResize.bind(this),
      scrollPrev: this.scrollPrev.bind(this),
      scrollNext: this.scrollNext.bind(this),
    };

    this._boundHandlers = handlers;

    // Unified drag handler
    this.scroller?.addEventListener('mousedown', handlers.onAnyMouseDown, { passive: false });
    document.addEventListener('mouseup', handlers.onAnyMouseUp);
    document.addEventListener('mousemove', handlers.onAnyMouseMove);
    this.scroller?.addEventListener('scroll', handlers.onScroll, { passive: true });

    // Navigation buttons
    this.prevBtn?.addEventListener('click', handlers.scrollPrev);
    this.nextBtn?.addEventListener('click', handlers.scrollNext);

    // Keyboard navigation
    this.prevBtn?.addEventListener('keydown', this.handleKeyNav('prev'));
    this.nextBtn?.addEventListener('keydown', this.handleKeyNav('next'));

    window.addEventListener('resize', handlers.onResize, { passive: true });

    // Clean up vertical drag on mouse leave
    this.slides.forEach(figure => {
      const mouseLeaveHandler = () => {
        if (this.state.isVerticallyDragging && this.state.figureDraggingEl === figure) {
          this.state.isVerticallyDragging = false;
          figure.classList.remove(this.config.verticalDraggingClass);
          document.body.style.userSelect = '';
          this.state.figureDraggingEl = null;
          this.state.pendingDrag = null;
          
          if (this.state.inertiaFrame) {
            cancelAnimationFrame(this.state.inertiaFrame);
            this.state.inertiaFrame = null;
          }
        }
      };
      
      figure.addEventListener('mouseleave', mouseLeaveHandler);
      // Store handler for cleanup
      figure._mouseLeaveHandler = mouseLeaveHandler;
    });
  };

  // Unified mouse handlers
  onAnyMouseDown = (e) => {
    if (this._destroyed || this._isDestroying || !this.supportsMouse || e.button !== 0) return;

    // Stop any running inertia and remove drag class
    if (this.state.inertiaFrame) {
      cancelAnimationFrame(this.state.inertiaFrame);
      this.state.inertiaFrame = null;
    }
    if (this.state.figureDraggingEl) {
      this.state.figureDraggingEl.classList.remove(this.config.verticalDraggingClass);
    }

    this.state.pendingDrag = {
      startX: e.clientX,
      startY: e.clientY,
      target: e.target,
      figure: e.target.closest(this.config.snapSelector),
      imgOrPic: e.target.closest('img, picture')
    };
    this.state.isDragging = false;
    this.state.isVerticallyDragging = false;
  };

  onAnyMouseMove = (e) => {
    if (this._destroyed || this._isDestroying) return;
    
    const pending = this.state.pendingDrag;
    if (!pending) return;

    const dx = e.clientX - pending.startX;
    const dy = e.clientY - pending.startY;
    const threshold = 6;

    // Decide direction if not yet dragging
    if (!this.state.isDragging && !this.state.isVerticallyDragging) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      // Vertical drag
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold && pending.imgOrPic && pending.figure) {
        this.state.isVerticallyDragging = true;
        this.state.figureDragStartY = pending.startY;
        this.state.figureScrollStart = pending.figure.scrollTop;
        this.state.figureDraggingEl = pending.figure;
        this.state.lastY = pending.startY;
        this.state.lastTime = performance.now();
        this.state.velocityY = 0;
        pending.figure.classList.add(this.config.verticalDraggingClass);
        document.body.style.userSelect = 'none';
        return;
      }

      // Horizontal drag
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        this.state.isDragging = true;
        this.state.startX = pending.startX;
        this.state.startY = pending.startY;
        this.state.scrollStart = this.scroller.scrollLeft;
        this.state.slideWidth = this.slides[this.state.activeIndex]?.offsetWidth || 1;
        this.scroller.classList.add('dragging');
        this.scroller.style.scrollSnapType = 'none';
        this.body.style.pointerEvents = 'none';
        document.body.style.userSelect = 'none';
        return;
      }
    }

    // Handle vertical drag
    if (this.state.isVerticallyDragging) {
      e.preventDefault();
      const speed = this.config.verticalDragSpeed || 1.7;
      const now = performance.now();
      const dy = (e.clientY - this.state.figureDragStartY) * speed;
      this.state.figureDraggingEl.scrollTop = this.state.figureScrollStart - dy;

      const dt = now - this.state.lastTime;
      if (dt > 0) {
        this.state.velocityY = ((e.clientY - this.state.lastY) / dt) * speed;
      }
      this.state.lastY = e.clientY;
      this.state.lastTime = now;
      return;
    }

    // Handle horizontal drag
    if (this.state.isDragging) {
      e.preventDefault();
      const dx = e.clientX - this.state.startX;
      this.scroller.scrollLeft = this.state.scrollStart - dx;
      return;
    }
  };

  onAnyMouseUp = (e) => {
    if (this._destroyed || this._isDestroying) return;

    // End vertical drag
    if (this.state.isVerticallyDragging) {
      this.state.isVerticallyDragging = false;
      if (this.state.figureDraggingEl) {
        this.state.figureDraggingEl.classList.remove(this.config.verticalDraggingClass);
      }
      document.body.style.userSelect = '';

      // Apply inertia
      if (this.config.verticalInertia && this.state.figureDraggingEl && 
          Math.abs(this.state.velocityY) > this.config.inertiaMinVelocity) {
        this.applyVerticalInertia(this.state.figureDraggingEl, this.state.velocityY * 10);
      }

      this.state.figureDraggingEl = null;
      this.state.pendingDrag = null;
      return;
    }

    // End horizontal drag
    if (this.state.isDragging) {
      this.endDrag();

      const dx = e.clientX - this.state.startX;
      const threshold = this.state.slideWidth * (this.config.switchThresholdFraction || 1 / 8);

      let newIndex = this.state.activeIndex;
      if (dx > threshold && newIndex > 0) newIndex--;
      else if (dx < -threshold && newIndex < this.slides.length - 1) newIndex++;

      this.scrollToIndex(newIndex);
    }

    this.state.isDragging = false;
    this.state.pendingDrag = null;
  };

  // Legacy figure drag handlers (kept for compatibility)
  onFigureMouseDown = (e) => {
    if (this._destroyed || this._isDestroying || !this.supportsMouse || e.button !== 0) return;

    const imgOrPic = e.target.closest('img, picture');
    if (!imgOrPic) return;
    const figure = e.target.closest(this.config.snapSelector);
    if (!figure) return;

    // Stop any running inertia
    if (this.state.inertiaFrame) {
      cancelAnimationFrame(this.state.inertiaFrame);
      this.state.inertiaFrame = null;
    }
    if (this.state.figureDraggingEl) {
      this.state.figureDraggingEl.classList.remove(this.config.verticalDraggingClass);
    }

    this.state.isVerticallyDragging = true;
    this.state.figureDragStartY = e.clientY;
    this.state.figureScrollStart = figure.scrollTop;
    this.state.figureDraggingEl = figure;
    this.state.lastY = e.clientY;
    this.state.lastTime = performance.now();
    this.state.velocityY = 0;

    figure.classList.add(this.config.verticalDraggingClass);
    document.body.style.userSelect = 'none';

    const onMouseMove = (e) => {
      if (this._destroyed || this._isDestroying || !this.state.isVerticallyDragging) return;
      e.preventDefault();
      
      const speed = this.config.verticalDragSpeed || 1.7;
      const now = performance.now();
      const dy = (e.clientY - this.state.figureDragStartY) * speed;
      this.state.figureDraggingEl.scrollTop = this.state.figureScrollStart - dy;

      const dt = now - this.state.lastTime;
      if (dt > 0) {
        this.state.velocityY = ((e.clientY - this.state.lastY) / dt) * speed;
      }
      this.state.lastY = e.clientY;
      this.state.lastTime = now;
    };

    const onMouseUp = () => {
      if (this._destroyed || this._isDestroying) return;
      
      this.state.isVerticallyDragging = false;
      if (this.state.figureDraggingEl) {
        this.state.figureDraggingEl.classList.remove(this.config.verticalDraggingClass);
      }
      document.body.style.userSelect = '';

      if (this.config.verticalInertia && this.state.figureDraggingEl && 
          Math.abs(this.state.velocityY) > this.config.inertiaMinVelocity) {
        this.applyVerticalInertia(this.state.figureDraggingEl, this.state.velocityY * 100);
      }

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.state.figureDraggingEl = null;
    };

    document.addEventListener('mousemove', onMouseMove, { passive: false });
    document.addEventListener('mouseup', onMouseUp);
  };

  applyVerticalInertia = (el, initialVelocity) => {
    if (this._destroyed || this._isDestroying) return;
    
    let velocity = initialVelocity;
    let lastScroll = el.scrollTop;
    const friction = this.config.inertiaFriction || 0.92;
    const minVelocity = this.config.inertiaMinVelocity || 0.1;

    el.classList.add(this.config.verticalDraggingClass);

    const step = () => {
      if (this._destroyed || this._isDestroying || !el.isConnected) {
        el.classList.remove(this.config.verticalDraggingClass);
        this.state.inertiaFrame = null;
        return;
      }

      if (Math.abs(velocity) > minVelocity) {
        el.scrollTop -= velocity;
        if (el.scrollTop === lastScroll) {
          el.classList.remove(this.config.verticalDraggingClass);
          this.state.inertiaFrame = null;
          return;
        }
        lastScroll = el.scrollTop;
        velocity *= friction;
        this.state.inertiaFrame = requestAnimationFrame(step);
      } else {
        el.classList.remove(this.config.verticalDraggingClass);
        this.state.inertiaFrame = null;
      }
    };
    step();
  };

  endDrag = () => {
    if (this._destroyed || this._isDestroying) return;
    
    this.state.isDragging = false;
    this.scroller?.classList.remove('dragging');
    if (this.scroller) this.scroller.style.scrollSnapType = '';
    if (this.body) this.body.style.pointerEvents = '';
    document.body.style.userSelect = '';
  };

  onScroll = () => {
    if (this._destroyed || this._isDestroying) return;
    
    const closestIndex = this.getClosestIndex();
    if (this.state.activeIndex !== closestIndex) {
      this.state.activeIndex = closestIndex;
      this.updateNavState();
      this.config.onSlideChange?.(closestIndex);
    }

    if (this.supportsMouse) {
      clearTimeout(this._scrollTimeout);
      this._scrollTimeout = this._setTimeout(() => {
        if (!this._destroyed && !this._isDestroying && this.scroller?.isConnected) {
          this.snapToNearest();
        }
      }, 80);
    }
  };

  onResize = () => {
    if (this._destroyed || this._isDestroying) return;
    
    clearTimeout(this._resizeTimeout);
    this._resizeTimeout = this._setTimeout(() => {
      if (!this._destroyed && !this._isDestroying) {
        this.snapToNearest();
      }
    }, 100);
  };

  getClosestIndex = () => {
    if (this._destroyed || this._isDestroying || !this.scroller || !this.slides.length) return 0;
    
    const scrollLeft = this.scroller.scrollLeft;
    const snapPoints = this.slides.map(slide => slide.offsetLeft);
    return snapPoints.reduce((closest, current, index) =>
      Math.abs(current - scrollLeft) < Math.abs(snapPoints[closest] - scrollLeft)
        ? index
        : closest,
      0
    );
  };

  snapToNearest = () => {
    if (this._destroyed || this._isDestroying || !this.scroller || !this.slides?.length || !this.activePopover?.isConnected) return;

    const closestIndex = this.getClosestIndex();
    const slide = this.slides[closestIndex];
    if (!slide) return;

    this.state.activeIndex = closestIndex;
    this.updateNavState();

    requestAnimationFrame(() => {
      this._setTimeout(() => {
        if (this._destroyed || this._isDestroying || !this.scroller?.isConnected || !this.slides?.length) return;

        const safeSlide = this.slides[closestIndex];
        if (!safeSlide) return;

        this.scrollToIndex(closestIndex);
        this.config.onSnapComplete?.(closestIndex);
      }, 0);
    });
  };

  scrollToIndex = (index) => {
    if (this._destroyed || this._isDestroying) return;
    
    this.state.activeIndex = index;
    this.updateNavState();
    this.config.onSlideChange?.(index);

    requestAnimationFrame(() => {
      this._setTimeout(() => {
        if (this._destroyed || this._isDestroying || !this.scroller || !this.slides?.length || !this.scroller.isConnected) return;

        const target = this.slides[index];
        if (!target) return;

        this.scroller.scrollTo({
          left: target.offsetLeft,
          top: target.offsetTop,
          behavior: 'smooth',
        });
      }, 0);
    });
  };

  scrollPrev = () => {
    if (this._destroyed || this._isDestroying) return;
    this.scrollToIndex(Math.max(0, this.state.activeIndex - 1));
  };

  scrollNext = () => {
    if (this._destroyed || this._isDestroying) return;
    this.scrollToIndex(Math.min(this.slides.length - 1, this.state.activeIndex + 1));
  };

  updateNavState = () => {
    if (this._destroyed || this._isDestroying) return;
    
    const { activeIndex } = this.state;
    const maxIndex = this.slides.length - 1;

    if (this.prevBtn) this.prevBtn.disabled = activeIndex <= 0;
    if (this.nextBtn) this.nextBtn.disabled = activeIndex >= maxIndex;
  };

  handleKeyNav = (direction) => (e) => {
    if (this._destroyed || this._isDestroying) return;
    
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (direction === 'prev') this.scrollPrev();
      if (direction === 'next') this.scrollNext();
    }
  };

  destroy = () => {
    if (this._destroyed || this._isDestroying) return;

    this._isDestroying = true; // Set destroying flag immediately

    // Cancel all timeouts
    this._timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this._timeouts.clear();

    // Clear debounce timers
    if (this._resizeDebounceTimer) {
      clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = null;
    }

    // Cancel animation frames
    if (this.state.inertiaFrame) {
      cancelAnimationFrame(this.state.inertiaFrame);
      this.state.inertiaFrame = null;
    }

    // Disconnect ResizeObserver immediately and safely
    if (this._resizeObserver) {
      try {
        this._resizeObserver.disconnect();
      } catch (error) {
        console.warn('[PopoverDragScrollSnap] Error disconnecting ResizeObserver:', error);
      }
      this._resizeObserver = null;
    }

    // Remove event listeners using stored bound handlers
    if (this._boundHandlers) {
      this.scroller?.removeEventListener('mousedown', this._boundHandlers.onAnyMouseDown);
      document.removeEventListener('mouseup', this._boundHandlers.onAnyMouseUp);
      document.removeEventListener('mousemove', this._boundHandlers.onAnyMouseMove);
      this.scroller?.removeEventListener('scroll', this._boundHandlers.onScroll);
      window.removeEventListener('resize', this._boundHandlers.onResize);
      this.prevBtn?.removeEventListener('click', this._boundHandlers.scrollPrev);
      this.nextBtn?.removeEventListener('click', this._boundHandlers.scrollNext);
    }

    // Clean up figure mouse leave handlers
    this.slides?.forEach(figure => {
      if (figure._mouseLeaveHandler) {
        figure.removeEventListener('mouseleave', figure._mouseLeaveHandler);
        delete figure._mouseLeaveHandler;
      }
    });

    // Remove dragging class from any figure
    if (this.state.figureDraggingEl) {
      this.state.figureDraggingEl.classList.remove(this.config.verticalDraggingClass);
    }

    // Reset body styles
    document.body.style.userSelect = '';

    // Clean up scroller styles
    if (this.scroller) {
      this.scroller.classList.remove('dragging');
      this.scroller.style.scrollSnapType = '';
    }
    if (this.body) {
      this.body.style.pointerEvents = '';
    }

    // Clear references
    this.activePopover = null;
    this.scroller = null;
    this.body = null;
    this.slides = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this._boundHandlers = null;

    // Set destroyed flag last
    this._destroyed = true;
    this._isDestroying = false;
  };
}
