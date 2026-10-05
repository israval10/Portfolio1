// Test-only harness: one project, empty filters, and reduced-motion behavior.
window.PORTFOLIO_DATA.projects = window.PORTFOLIO_DATA.projects.filter(project => project.name === 'Bulkmate');
const nativeMatchMedia = window.matchMedia.bind(window);
window.matchMedia = query => query === '(prefers-reduced-motion: reduce)'
  ? { matches: true, media: query, addEventListener() {}, removeEventListener() {} }
  : nativeMatchMedia(query);
