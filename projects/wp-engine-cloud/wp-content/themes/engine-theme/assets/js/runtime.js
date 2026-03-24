(() => {
  document.documentElement.classList.add('engine-runtime-ready');
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href') || '';
      if (hash.length <= 1) return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
