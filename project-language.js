(function () {
  'use strict';

  const key = 'portfolio-language';
  try {
    localStorage.setItem(key, document.documentElement.lang);
  } catch {}

  document.querySelectorAll('.project-lang').forEach(link => {
    link.addEventListener('click', () => {
      try { localStorage.setItem(key, link.lang); } catch {}
    });
  });
})();
