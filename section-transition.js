(function () {
  'use strict';

  const hero = document.querySelector('.opening-copy');
  const projects = document.getElementById('projects');
  if (!hero || !projects) return;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  let frame = 0;

  function update() {
    frame = 0;
    if (motionPreference.matches) return;

    const height = window.innerHeight;
    const projectsTop = projects.getBoundingClientRect().top;
    const heroBottom = hero.getBoundingClientRect().bottom;
    const reveal = clamp((height * .9 - projectsTop) / (height * .56));
    const exit = clamp((height * .8 - heroBottom) / (height * .55));

    projects.style.setProperty('--section-reveal', reveal.toFixed(3));
    hero.style.setProperty('--hero-exit', exit.toFixed(3));
    document.documentElement.classList.add('scroll-transition-ready');
  }

  function schedule() {
    if (!frame && !motionPreference.matches) frame = requestAnimationFrame(update);
  }

  function handlePreference() {
    if (motionPreference.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      projects.style.removeProperty('--section-reveal');
      hero.style.removeProperty('--hero-exit');
      document.documentElement.classList.remove('scroll-transition-ready');
    } else schedule();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  motionPreference.addEventListener('change', handlePreference);
  handlePreference();
})();
