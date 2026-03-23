export default function replaceVideoPlaceholdersInDialog(dialog) {
  dialog.querySelectorAll('.video-placeholder').forEach(placeholder => {
    if (!placeholder.querySelector('video')) {
      let config;
      try {
        config = JSON.parse(placeholder.dataset.video);
      } catch (e) {
        console.error('Invalid video config:', e, placeholder.dataset.video);
        return;
      }
      const video = document.createElement('video');
      video.title = config.title || '';
      video.width = config.width || '';
      video.height = config.height || '';
      if (config.controls) video.controls = true;
      if (config.autoplay) video.autoplay = true;
      if (config.loop) video.loop = true;
      if (config.muted) video.muted = true;
      if (config.controlsList) video.setAttribute('controlsList', config.controlsList);
      if (config.disableRemotePlayback) video.setAttribute('disableremoteplayback', '');
      if (config.disablePictureInPicture) video.setAttribute('disablepictureinpicture', '');
      video.className = [...placeholder.classList].filter(c => c !== 'video-placeholder').join(' ');

      (Array.isArray(config.sources) ? config.sources : []).forEach(source => {
        if (source.src && source.type) {
          const srcElem = document.createElement('source');
          srcElem.src = `/${source.src}`;
          srcElem.type = source.type;
          video.appendChild(srcElem);
        }
      });
      video.appendChild(document.createTextNode('Your browser does not support the video tag.'));
      placeholder.replaceWith(video);
    }
  });
}