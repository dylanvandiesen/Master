
export class TabAnimator {
  constructor(config = {}) {
    // configuration with sensible defaults
    this.containerSelector = config.containerSelector || '.content-container';
    this.tabPaneSelector = config.tabPaneSelector || '.tab-panes .content-scroller';
    this.fadeOutClass = config.fadeOutClass || 'fade-out';
    this.fadeDuration = config.fadeDuration || 600; // in ms
    this.currentTab = null;
  }

  init() {
    // set initial active tab from the checked radio
    const checkedInput = document.querySelector('input[name="d-tabs"]:checked');
    if (checkedInput) {
      const initialTab = this._getTabFromRadio(checkedInput);
      if (initialTab) {
        this.currentTab = initialTab;
        initialTab.style.display = 'flex';
        initialTab.style.opacity = 1;
      }
    }

    // attach listeners to all d-tabs radio inputs
    document.querySelectorAll('input[name="d-tabs"]').forEach(input => {
      input.addEventListener('change', event => this.onTabChange(event));
    });
  }

  onTabChange(event) {
    const newInput = event.target;
    const newTab = this._getTabFromRadio(newInput);
    if (!newTab || newTab === this.currentTab) {
      return;
    }

    // Fade out current tab if it exists
    if (this.currentTab) {
      this.currentTab.classList.add(this.fadeOutClass);
      this.currentTab.addEventListener(
        'transitionend',
        () => {
          this.currentTab.style.display = 'none';
          this.currentTab.classList.remove(this.fadeOutClass);
        },
        { once: true }
      );
    }

    // Show and fade in the new tab
    newTab.style.display = 'flex';
    newTab.style.opacity = 0;
    // Force reflow so the new opacity takes effect before transition
    void newTab.offsetWidth;
    newTab.style.transition = `opacity ${this.fadeDuration}ms ease-in-out`;
    newTab.style.opacity = 1;

    this.currentTab = newTab;
  }

  // Map a radio input to its corresponding tab by ID.
  // Assumes radio id "nav-home" corresponds to tab id "home-tab"
  _getTabFromRadio(radioInput) {
    const id = radioInput.id; 
    const tabId = id.replace('nav-', '') + '-tab';
    const container = document.querySelector(this.containerSelector);
    // First try querying by ID inside the container.
    let tab = container.querySelector(`#${tabId}`);
    // Fallback: use the configured selector if needed.
    if (!tab) {
      tab = container.querySelector(`${this.tabPaneSelector}:has(#${tabId})`);
    }
    return tab;
  }
}

// export class TabAnimator {
//   constructor(options = {}) {
//     this.options = {
//       contentBgSelector: '.content-bg',
//       tabPaneSelector: '.tab-pane',
//       tabInputSelector: '.nav-tabs input',
//       tabIdPrefix: 'nav-',
//       tabIdSuffix: '-tab',
//       duration: 600,
//       easing: 'ease-in-out',
//       clickDelay: 50, // Wait after input click
//       ...options
//     };

//     this.contentBg = null;
//     this.tabPanes = [];
//     this.currentDimensions = { width: 0, height: 0 };
//     this.isAnimating = false;
//     this.resizeObserver = null;
//     this.pubSub = new PubSub();

//     this.init();
//   }

//   init() {
//     try {
//       this.contentBg = document.querySelector(this.options.contentBgSelector);
//       this.tabPanes = Array.from(document.querySelectorAll(this.options.tabPaneSelector));

//       if (!this.contentBg || this.tabPanes.length === 0) {
//         throw new Error('Required elements not found');
//       }

//       this.setupEventListeners();
//       console.log('TabAnimator initialized successfully');
//     } catch (error) {
//       console.error('TabAnimator initialization failed:', error);
//     }
//   }

//   setupEventListeners() {
//     // Detect when a tab input is clicked
//     document.querySelectorAll(this.options.tabInputSelector).forEach(input => {
//       input.addEventListener('change', () => {
//         setTimeout(() => this.waitForTabToShow(), this.options.clickDelay);
//       });
//     });

//     // Monitor active tab-pane size changes
//     this.resizeObserver = new ResizeObserver(() => this.animateDimensions());
//     this.tabPanes.forEach(pane => this.resizeObserver.observe(pane));
//   }

//   waitForTabToShow() {
//     const activePane = this.getActiveTabPane();
//     if (!activePane) return;

//     // Ensure tab-pane is fully visible before measuring
//     activePane.addEventListener('animationend', () => this.animateDimensions(), { once: true });
//     activePane.addEventListener('transitionend', () => this.animateDimensions(), { once: true });

//     // Fallback timeout if no transition is detected
//     setTimeout(() => this.animateDimensions(), this.options.clickDelay);
//   }

//   animateDimensions() {
//     if (this.isAnimating) return;

//     const newDimensions = this.getContentDimensions();
//     if (!this.dimensionsChanged(newDimensions)) return;

//     this.isAnimating = true;
//     console.log('Updating .content-bg dimensions:', newDimensions);

//     requestAnimationFrame(() => {
//       this.contentBg.style.transition = `width ${this.options.duration}ms ${this.options.easing}, height ${this.options.duration}ms ${this.options.easing}`;
//       this.contentBg.style.width = `${newDimensions.width}px`;
//       this.contentBg.style.height = `${newDimensions.height}px`;

//       this.contentBg.addEventListener('transitionend', () => {
//         this.currentDimensions = newDimensions;
//         this.isAnimating = false;
//         this.pubSub.publish('animationComplete', newDimensions);
//         console.log('Animation completed');
//       }, { once: true });
//     });
//   }

//   getContentDimensions() {
//     const activePane = this.getActiveTabPane();
//     if (!activePane) return this.currentDimensions;

//     const computedStyle = window.getComputedStyle(activePane);
//     return {
//       width: activePane.scrollWidth + parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight),
//       height: activePane.scrollHeight + parseFloat(computedStyle.marginTop) + parseFloat(computedStyle.marginBottom)
//     };
//   }

//   getActiveTabPane() {
//     return this.tabPanes.find(pane => this.isTabChecked(pane));
//   }

//   isTabChecked(pane) {
//     if (!pane || !pane.id) return false;
//     const tabId = pane.id;
//     return document.querySelector(`${this.options.tabInputSelector}[id='${this.options.tabIdPrefix}${tabId.replace(this.options.tabIdSuffix, "")}']`)?.checked;
//   }

//   dimensionsChanged(newDimensions) {
//     return newDimensions.width !== this.currentDimensions.width || 
//            newDimensions.height !== this.currentDimensions.height;
//   }

//   destroy() {
//     if (this.resizeObserver) {
//       this.resizeObserver.disconnect();
//     }
//     console.log('TabAnimator destroyed');
//   }

//   onAnimationComplete(callback) {
//     return this.pubSub.subscribe('animationComplete', callback);
//   }
// }

// class PubSub {
//   constructor() {
//     this.subscribers = {};
//   }

//   subscribe(event, callback) {
//     if (!this.subscribers[event]) {
//       this.subscribers[event] = [];
//     }
//     this.subscribers[event].push(callback);
//     return () => this.unsubscribe(event, callback);
//   }

//   unsubscribe(event, callback) {
//     if (this.subscribers[event]) {
//       this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
//     }
//   }

//   publish(event, data) {
//     if (this.subscribers[event]) {
//       this.subscribers[event].forEach(callback => callback(data));
//     }
//   }
// }
