(function () {
  'use strict';

  const data = window.PORTFOLIO_DATA;
  const model = window.createPortfolioModel(data);
  const filters = document.getElementById('discipline-filters');
  const groups = document.getElementById('project-groups');
  const gallery = document.getElementById('pictures-grid');
  const status = document.getElementById('filter-hint');
  const canvas = document.getElementById('project-canvas');
  const menu = document.getElementById('main-menu');
  const menuButton = document.getElementById('menu-toggle');
  const ui = {
    es: { skip: 'Ir a proyectos', photos: 'Fotos', loading: 'Cargando proyectos', wheel: 'Rueda', index: '\u00cdndice', wheelTooltip: 'Ver proyectos en una rueda interactiva', indexTooltip: 'Ver proyectos en lista, por disciplina', prev: 'Proyecto anterior', next: 'Proyecto siguiente', openMenu: 'Abrir men\u00fa', closeMenu: 'Cerrar men\u00fa', nav: 'Navegaci\u00f3n principal', view: 'Vista de proyectos', pending: 'Enlace pendiente', ungrouped: 'Otros proyectos', empty: 'No hay proyectos en esta disciplina.', canvas: 'Rueda de proyectos', gallery: 'Galer\u00eda de Israel Valencia' },
    en: { skip: 'Skip to projects', photos: 'Photos', loading: 'Loading projects', wheel: 'Wheel', index: 'Index', wheelTooltip: 'View projects in an interactive wheel', indexTooltip: 'View projects in a list, by discipline', prev: 'Previous project', next: 'Next project', openMenu: 'Open menu', closeMenu: 'Close menu', nav: 'Main navigation', view: 'Project view', pending: 'Link pending', ungrouped: 'Other projects', empty: 'No projects in this discipline.', canvas: 'Project wheel', gallery: 'Israel Valencia gallery' }
  };
  let activeFilter = 'all';
  let activeView = 'wheel';
  let selected = model.projects[0] || null;
  let wheel = null;
  let wheelAvailable = true;
  window.currentLang = 'es';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name, className) {
    const node = element('i', className);
    node.dataset.lucide = name;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function icons() { window.lucide?.createIcons(); }
  function language() { return window.currentLang || 'es'; }
  function strings() { return ui[language()]; }

  function setMenu(open, returnFocus = false) {
    menu.classList.toggle('open', open);
    menu.inert = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    const label = open ? strings().closeMenu : strings().openMenu;
    menuButton.setAttribute('aria-label', label);
    menuButton.title = label;
    menuButton.replaceChildren(icon(open ? 'x' : 'menu'));
    icons();
    if (returnFocus) menuButton.focus({ preventScroll: true });
  }

  function renderTranslations() {
    const t = window.PORTFOLIO_TRANSLATIONS[language()];
    document.querySelectorAll('[data-i18n]').forEach(node => {
      if (t[node.dataset.i18n] !== undefined) node.textContent = t[node.dataset.i18n];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(node => {
      if (t[node.dataset.i18nHtml] !== undefined) node.innerHTML = t[node.dataset.i18nHtml];
    });
    document.querySelectorAll('[data-ui]').forEach(node => {
      if (strings()[node.dataset.ui] !== undefined) node.textContent = strings()[node.dataset.ui];
    });
    document.documentElement.lang = language();
    document.getElementById('btn-es').setAttribute('aria-pressed', String(language() === 'es'));
    document.getElementById('btn-en').setAttribute('aria-pressed', String(language() === 'en'));
    document.querySelectorAll('[data-lang]').forEach(node => node.classList.toggle('active', node.dataset.lang === language()));
    [['view-wheel', 'wheel'], ['view-index', 'index'], ['wheel-prev', 'prev'], ['wheel-next', 'next']].forEach(([id, key]) => {
      const node = document.getElementById(id);
      if (!node.dataset.view) node.title = strings()[key];
      node.setAttribute('aria-label', strings()[key]);
    });
    document.querySelector('.view-switch').setAttribute('aria-label', strings().view);
    menu.setAttribute('aria-label', strings().nav);
    canvas.setAttribute('aria-label', strings().canvas);
    gallery.setAttribute('aria-label', strings().gallery);
    filters.setAttribute('aria-label', t.disc_title);
    setMenu(menu.classList.contains('open'));
  }

  function renderFilters() {
    const fragment = document.createDocumentFragment();
    const options = [{ id: 'all', name: window.PORTFOLIO_TRANSLATIONS[language()].disc_all }, ...data.disciplines];
    options.forEach(discipline => {
      const button = element('button', 'discipline-filter');
      button.type = 'button';
      button.dataset.filter = discipline.id;
      button.setAttribute('aria-controls', 'wheel-view project-groups');
      button.setAttribute('aria-pressed', String(activeFilter === discipline.id));
      button.classList.toggle('active', activeFilter === discipline.id);
      const swatch = element('span', 'swatch');
      swatch.setAttribute('aria-hidden', 'true');
      if (discipline.color) swatch.style.setProperty('--d-color', discipline.color);
      button.append(swatch, element('span', 'discipline-name', discipline.name), element('span', 'discipline-count', String(model.matches(discipline.id).length)));
      fragment.append(button);
    });
    filters.replaceChildren(fragment);
  }

  function renderStatus() {
    const count = model.matches(activeFilter).length;
    const name = model.disciplines.find(discipline => discipline.id === activeFilter)?.name;
    status.textContent = language() === 'es'
      ? count + ' proyecto' + (count === 1 ? '' : 's') + (name ? ' en ' + name : '')
      : count + ' project' + (count === 1 ? '' : 's') + (name ? ' in ' + name : '');
  }

  function projectCard(project) {
    const destination = model.destination(project);
    const card = element(destination ? 'a' : 'article', 'project-card');
    card.dataset.projectId = project.id;
    card.dataset.disciplines = project.disciplines.join(' ');
    if (destination) {
      card.href = destination;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    } else {
      card.setAttribute('aria-disabled', 'true');
      card.title = strings().pending;
    }
    const thumb = element('div', 'project-thumb');
    if (project.cover) {
      const img = element('img');
      img.src = project.cover;
      img.alt = project.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      thumb.append(img);
    } else {
      thumb.classList.add('project-thumb-empty');
      thumb.textContent = project.name;
    }
    const body = element('div', 'project-body');
    body.append(element('h3', 'project-title', project.name));
    const description = project.description[language()] || project.description.es;
    if (description) body.append(element('p', 'project-desc', description));
    const tags = element('div', 'project-tags');
    if (project.years.length) tags.append(element('span', 'project-year', project.years.join(' / ')));
    model.disciplines.filter(discipline => project.disciplines.includes(discipline.id)).forEach(discipline => tags.append(element('span', 'project-tag', discipline.name)));
    body.append(tags);
    if (!destination) body.append(element('span', 'project-pending', strings().pending));
    card.append(thumb, body, icon('arrow-up-right', 'project-arrow'));
    return card;
  }

  function renderIndex() {
    const fragment = document.createDocumentFragment();
    model.groups(activeFilter).forEach(discipline => {
      const group = element('div', 'discipline-group');
      group.dataset.discipline = discipline.id;
      const heading = element('div', 'discipline-label');
      heading.append(element('h3', 'discipline-tag', discipline.name || strings().ungrouped), element('span', 'group-count', String(discipline.projects.length)));
      group.append(heading);
      discipline.projects.forEach(project => group.append(projectCard(project)));
      fragment.append(group);
    });
    if (!model.matches(activeFilter).length) fragment.append(element('p', 'empty-state', strings().empty));
    groups.replaceChildren(fragment);
    icons();
  }

  function renderSelection(project = selected) {
    selected = project;
    const selection = document.getElementById('project-selection');
    const visible = model.matches(activeFilter);
    selection.hidden = activeView !== 'wheel' || !project;
    document.getElementById('wheel-empty').hidden = visible.length > 0;
    document.getElementById('wheel-prev').disabled = visible.length < 2;
    document.getElementById('wheel-next').disabled = visible.length < 2;
    const index = visible.findIndex(item => item.id === project?.id);
    document.getElementById('project-position').textContent = String(index + 1).padStart(2, '0') + ' / ' + String(visible.length).padStart(2, '0');
    if (!project) return;
    const destination = model.destination(project);
    const link = document.getElementById('selected-link');
    const imageLink = document.getElementById('selected-image-link');
    for (const node of [link, imageLink]) {
      if (destination) { node.href = destination; node.removeAttribute('aria-disabled'); }
      else { node.removeAttribute('href'); node.setAttribute('aria-disabled', 'true'); }
    }
    const image = document.getElementById('selected-image');
    imageLink.hidden = !project.cover;
    if (project.cover) { image.src = project.cover; image.alt = project.name; image.decoding = 'async'; }
    document.getElementById('selected-title').textContent = project.name;
    const tags = model.disciplines.filter(discipline => project.disciplines.includes(discipline.id)).map(discipline => discipline.name);
    document.getElementById('selected-meta').textContent = [...project.years, ...tags].join(' / ');
    document.getElementById('selected-description').textContent = project.description[language()] || project.description.es;
    canvas.setAttribute('aria-label', strings().canvas + ': ' + project.name);
  }

  function renderPictures() {
    const fragment = document.createDocumentFragment();
    data.pictures.forEach(picture => {
      const link = element('a', 'picture-item');
      link.href = picture.src;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const image = element('img');
      image.src = picture.src;
      image.alt = picture.alt[language()] || picture.alt.es;
      image.loading = 'lazy';
      image.decoding = 'async';
      link.append(image);
      fragment.append(link);
    });
    gallery.replaceChildren(fragment);
  }

  function setView(view) {
    activeView = view === 'wheel' && wheelAvailable ? 'wheel' : 'index';
    document.getElementById('wheel-view').hidden = activeView !== 'wheel';
    document.getElementById('wheel-controls').hidden = activeView !== 'wheel';
    document.getElementById('project-selection').hidden = activeView !== 'wheel' || !selected;
    document.getElementById('projects').dataset.view = activeView;
    groups.hidden = activeView !== 'index';
    document.querySelectorAll('button[data-view]').forEach(node => {
      node.classList.toggle('active', node.dataset.view === activeView);
      node.setAttribute('aria-pressed', String(node.dataset.view === activeView));
    });
    wheel?.setEnabled(activeView === 'wheel');
  }

  function fallback() {
    wheelAvailable = false;
    const button = document.getElementById('view-wheel');
    const wasFocused = document.activeElement === canvas || document.activeElement === button;
    button.disabled = true;
    setView('index');
    if (wasFocused) document.getElementById('view-index').focus({ preventScroll: true });
    document.getElementById('wheel-stage').setAttribute('aria-busy', 'false');
    document.getElementById('wheel-loading').hidden = true;
  }

  function setFilter(filter) {
    activeFilter = filter;
    const visible = model.matches(filter);
    if (!visible.some(project => project.id === selected?.id)) selected = visible[0] || null;
    filters.querySelectorAll('button').forEach(button => {
      button.classList.toggle('active', button.dataset.filter === filter);
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
    renderStatus();
    renderIndex();
    renderSelection();
    wheel?.setProjects(visible, selected?.id);
  }

  window.setLanguage = function (lang) {
    if (!ui[lang]) return;
    window.currentLang = lang;
    renderTranslations();
    renderFilters();
    renderStatus();
    renderIndex();
    renderSelection();
    renderPictures();
    document.getElementById('project-count').textContent = String(data.projects.length);
    document.getElementById('discipline-count').textContent = String(data.disciplines.length);
    window.dispatchEvent(new Event('portfolio:language'));
  };

  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (button && filters.contains(button)) setFilter(button.dataset.filter);
  });
  document.querySelectorAll('button[data-view]').forEach(button => {
    button.addEventListener('click', () => setView(button.dataset.view));
    button.addEventListener('pointerleave', () => button.classList.remove('tooltip-dismissed'));
    button.addEventListener('blur', () => button.classList.remove('tooltip-dismissed'));
  });
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => window.setLanguage(button.dataset.lang)));
  document.getElementById('wheel-prev').addEventListener('click', () => wheel?.step(-1));
  document.getElementById('wheel-next').addEventListener('click', () => wheel?.step(1));
  menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('click', event => {
    const path = event.composedPath();
    if (!path.includes(menu) && !path.includes(menuButton) && menu.classList.contains('open')) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('button[data-view]').forEach(button => {
      if (button.matches(':hover') || document.activeElement === button) button.classList.add('tooltip-dismissed');
    });
    if (event.key === 'Escape' && menu.classList.contains('open')) { event.preventDefault(); setMenu(false, true); }
  });
  document.addEventListener('focusin', event => {
    if (!menu.contains(event.target) && event.target !== menuButton && menu.classList.contains('open')) setMenu(false);
  });

  window.setLanguage('es');
  try {
    wheel = new window.ProjectWheel({
      canvas,
      stage: document.getElementById('wheel-stage'),
      onSelect: renderSelection,
      onActivate: project => {
        const destination = model.destination(project);
        if (destination) window.open(destination, '_blank', 'noopener,noreferrer');
      },
      onError: fallback
    });
    wheel.setProjects(model.matches(activeFilter), selected?.id);
  } catch { fallback(); }
  icons();
  window.addEventListener('pagehide', event => { if (!event.persisted) wheel?.destroy(); });
})();
