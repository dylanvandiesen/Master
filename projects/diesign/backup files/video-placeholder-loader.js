export function setupVideoPlaceholderLoader(config = {}) {
  document.addEventListener('toggle', function(e) {
    if (
      e.target.matches(config.popoverSelector || '.project-pop[popover]') &&
      e.target.open
    ) {
      e.target.querySelectorAll(config.placeholderSelector || '.video-placeholder').forEach(function(placeholder) {
        if (!placeholder.dataset.loaded) {
          const video = document.createElement('video');
          video.className = placeholder.dataset.class || '';
          video.title = placeholder.dataset.title || '';
          video.width = placeholder.dataset.width || '';
          video.height = placeholder.dataset.height || '';
          video.controls = config.controls !== false; // default true
          video.autoplay = config.autoplay !== false; // default true
          video.loop = config.loop !== false; // default true
          video.muted = config.muted !== false; // default true
          video.setAttribute('controlslist', config.controlsList || 'play nodownload noplaybackrate');
          video.setAttribute('disableremoteplayback', '');
          video.setAttribute('disablepictureinpicture', '');

          let sources = [];
          try {
            const parsed = JSON.parse(placeholder.dataset.sources || '[]');
            if (Array.isArray(parsed)) {
              sources = parsed.filter(srcObj =>
                typeof srcObj === 'object' &&
                typeof srcObj.src === 'string' &&
                typeof srcObj.type === 'string' &&
                srcObj.src.startsWith('https://')
              );
            }
          } catch (e) {
            // Invalid JSON, do not add sources
          }

          sources.forEach(srcObj => {
            const source = document.createElement('source');
            source.src = srcObj.src;
            source.type = srcObj.type;
            video.appendChild(source);
          });

          video.innerHTML += config.fallbackText || 'Your browser does not support the video tag.';
          placeholder.replaceWith(video);
          placeholder.dataset.loaded = 'true';
        }
      });
    }
  });
}