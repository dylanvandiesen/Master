export default function observeLazyElements({
  loadedClass = 'd-loaded',
  errorClass = ''
} = {}) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el = entry.target;

      const onLoad = () => {
        el.classList.add(loadedClass);
        observer.unobserve(el);
      };

      const onError = () => {
        if (errorClass) el.classList.add(errorClass);
        observer.unobserve(el);
      };

      switch (el.tagName) {
        case 'IMG':
          if (el.complete && el.naturalWidth !== 0) {
            onLoad();
          } else {
            el.addEventListener('load', onLoad, { once: true });
            el.addEventListener('error', onError, { once: true });
          }
          break;

        case 'VIDEO':
          if (el.readyState >= 1) {
            onLoad();
          } else {
            el.addEventListener('loadeddata', onLoad, { once: true });
            el.addEventListener('error', onError, { once: true });
          }
          if (el.preload === 'none') {
            el.preload = 'metadata';
            el.load();
          }
          break;

        case 'IFRAME':
          el.addEventListener('load', onLoad, { once: true });
          el.addEventListener('error', onError, { once: true });
          break;

        default:
          observer.unobserve(el);
      }
    });
  }, {
    rootMargin: '0px',
    threshold: 0
  });

  // Allow observing specific containers (defaults to full document)
  return function observe(container = document) {
    const lazyImages = container.querySelectorAll('img[loading="lazy"]');
    // const lazyVideos = container.querySelectorAll('video[loading="lazy"]');
    // const lazyIframes = container.querySelectorAll('iframe[loading="lazy"]');

    // Observe <img> directly — including those inside <picture>
    lazyImages.forEach(el => observer.observe(el));
    // lazyVideos.forEach(el => observer.observe(el));
    // lazyIframes.forEach(el => observer.observe(el));
  };
}
