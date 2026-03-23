export class LazyDiesignImageLoader {
  constructor(config = {}) {
    this.config = Object.assign({
      lazyImageSelector: ".tab-panes picture[data-src]",
      tabInputSelector: ".nav-tabs input",
      tabIdPrefix: "nav-",
      tabIdSuffix: "-tab",
      viewportOnlyClass: "d-viewport-only",
      viewportClass: "d-viewport",
      inViewportClass: "d-inview",
      loadingClass: "d-loading",
      loadedClass: "d-loaded",
      mobileBreakpoint: 768,
      mobileDelay: 200,
      desktopDelay: 250,
      mobileRootMargin: "50px 0px",
      desktopRootMargin: "100px 0px",
      resizeDebounceTime: 250,
      scrollThrottleTime: 200
    }, config);

    this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
    this.baseDelay = this.isMobile ? this.config.mobileDelay : this.config.desktopDelay;
    this.lazyImages = new Map();
    this.observer = null;

    this.init();
  }

  init() {
    this.cacheImages();
    this.setupIntersectionObserver();
    this.setupEventHandlers();
    this.loadImagesForCheckedTab();
  }

  cacheImages() {
    document.querySelectorAll(this.config.lazyImageSelector).forEach(picture => 
      this.lazyImages.set(picture, { loaded: false })
    );
  }

  setupIntersectionObserver() {
    if (!("IntersectionObserver" in window)) {
      this.loadAllImages();
      return;
    }

    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      rootMargin: this.isMobile ? this.config.mobileRootMargin : this.config.desktopRootMargin
    });

    this.lazyImages.forEach((data, picture) => {
      if (!data.loaded) {
        this.observer.observe(picture);
      }
    });
  }

  handleIntersection(entries) {
    if (!this.isTabChecked(entries[0].target)) return;
    entries.forEach((entry, index) => {
      const picture = entry.target;
      if (entry.isIntersecting && this.isTabChecked(picture)) {
        if (picture.classList.contains(this.config.viewportOnlyClass)) {
          picture.classList.add(this.config.inViewportClass);
        }
        if (!picture.classList.contains(this.config.loadedClass) && picture.dataset.src) {
          picture.classList.add(this.config.loadingClass);
          this.loadImage(picture, index * this.baseDelay);
        }
      } else if (picture.classList.contains(this.config.viewportClass)) {
        picture.classList.add(this.config.loadingClass);
        this.loadImage(picture, index * this.baseDelay);
      }
    });
  }

  loadImage(picture, delay = 0) {
    setTimeout(() => {
      picture.querySelectorAll("source").forEach(source => {
        if (source.dataset.srcset) {
          source.srcset = source.dataset.srcset;
          source.removeAttribute("data-srcset");
        }
      });
      const img = picture.querySelector("img");
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      }
      img.onload = () => {
        picture.classList.add(this.config.loadedClass);
        picture.classList.remove(this.config.loadingClass);
      };
    }, delay);
  }

  isTabChecked(picture) {
    const tabId = picture.closest(".tab-pane")?.id;
    return document.querySelector(`${this.config.tabInputSelector}[id='${this.config.tabIdPrefix}${tabId.replace(this.config.tabIdSuffix, "")}']`)?.checked;
  }

  setupEventHandlers() {
    document.addEventListener("change", (event) => {
      if (event.target.matches(this.config.tabInputSelector)) {
        this.loadImagesForCheckedTab();
      }
    });
    window.addEventListener("resize", this.debounce(this.handleResize.bind(this), this.config.resizeDebounceTime));
    window.addEventListener("scroll", this.throttle(this.recheckImagesInViewport.bind(this), this.config.scrollThrottleTime));
  }

  recheckImagesInViewport() {
    this.lazyImages.forEach((data, picture) => {
      if (picture.classList.contains(this.config.viewportOnlyClass)) {
        const rect = picture.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
          picture.classList.add(this.config.inViewportClass);
        }
      }
    });
  }

  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
    this.baseDelay = this.isMobile ? this.config.mobileDelay : this.config.desktopDelay;

    if (wasMobile !== this.isMobile) {
      this.reinitializeObserver();
    }
    this.recheckImagesInViewport();
  }

  reinitializeObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.setupIntersectionObserver();
  }

  loadAllImages() {
    this.lazyImages.forEach((picture, index) => {
      if (!picture.classList.contains(this.config.loadedClass)) {
        this.loadImage(picture, index * this.baseDelay);
      }
    });
  }

  loadImagesForCheckedTab() {
    if (!document.querySelector(`${this.config.tabInputSelector}:checked`)) return;
    document.querySelectorAll(this.config.lazyImageSelector).forEach(picture => {
      if (this.isTabChecked(picture)) {
        this.loadImage(picture);
      }
    });
  }

  manuallyInitialize() {
    this.cacheImages();
    this.setupIntersectionObserver();
    this.loadImagesForCheckedTab();
  }

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  throttle(func, limit) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        func(...args);
      }
    };
  }
}

// document.addEventListener("DOMContentLoaded", () => {
//   window.lazyImageLoader = new LazyDiesignImageLoader();
// });
