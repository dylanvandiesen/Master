(() => {
  const form = document.querySelector('[data-engine-preview-form]');
  const target = document.querySelector('[data-engine-preview-target]');
  if (!form || !target || !window.enginePreview) return;

  let timer;
  form.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const payload = new URLSearchParams({
        action: 'engine_core_preview',
        nonce: window.enginePreview.nonce,
        templateType: form.dataset.templateType || 'preview',
        objectId: form.dataset.objectId || '0',
        objectType: form.dataset.objectType || 'post'
      });

      const res = await fetch(window.enginePreview.ajaxUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
      });

      const json = await res.json();
      if (json?.success && typeof json.data?.html === 'string') {
        target.innerHTML = json.data.html;
      }
    }, 250);
  });
})();
