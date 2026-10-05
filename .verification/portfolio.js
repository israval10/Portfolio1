(function () {
  'use strict';

  const data = window.PORTFOLIO_DATA;
  const filters = document.getElementById('discipline-filters');
  const groups = document.getElementById('project-groups');
  const gallery = document.getElementById('pictures-grid');
  const status = document.getElementById('filter-hint');
  const allDisciplines = [...data.disciplines, ...data.additionalDisciplines];
  let activeFilter = 'all';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function projectDestination(project) {
    // Empty pages only open the URL property; a missing URL must not open an empty case study.
    const destination = project.hasContent ? project.notionUrl : project.externalUrl;
    if (!destination) return null;
    try {
      const url = new URL(destination);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function matchingProjects(filter) {
    return data.projects.filter(project => filter === 'all' || project.disciplines.includes(filter));
  }

  function renderFilters(lang) {
    const fragment = document.createDocumentFragment();
    const options = [{ id: 'all', name: lang === 'es' ? 'Todos los proyectos' : 'All projects' }, ...data.disciplines];
    options.forEach(discipline => {
      const button = element('button', 'discipline-card');
      button.type = 'button';
      button.dataset.filter = discipline.id;
      button.setAttribute('aria-controls', 'project-groups');
      button.setAttribute('aria-pressed', String(activeFilter === discipline.id));
      button.classList.toggle('active', activeFilter === discipline.id);
      if (discipline.color) button.style.setProperty('--d-color', discipline.color);
      button.append(element('span', 'discipline-name', discipline.name));
      const count = matchingProjects(discipline.id).length;
      button.append(element('span', 'discipline-count', String(count)));
      fragment.append(button);
    });
    filters.replaceChildren(fragment);
  }

  function projectCard(project, lang) {
    const destination = projectDestination(project);
    const card = element(destination ? 'a' : 'article', 'project-card');
    card.dataset.projectId = project.id;
    card.dataset.disciplines = project.disciplines.join(' ');
    if (destination) {
      card.href = destination;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    } else {
      card.setAttribute('aria-disabled', 'true');
      card.title = lang === 'es' ? 'Enlace pendiente' : 'Link pending';
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
      thumb.append(element('span', 'project-thumb-name', project.name));
    }
    if (project.years.length) thumb.append(element('span', 'project-year', project.years.join(' / ')));

    const body = element('div', 'project-body');
    body.append(element('h3', 'project-title', project.name));
    const description = project.description[lang] || project.description.es;
    if (description) body.append(element('p', 'project-desc', description));
    const tags = element('div', 'project-tags');
    allDisciplines.filter(discipline => project.disciplines.includes(discipline.id)).forEach(discipline => {
      tags.append(element('span', 'project-tag', discipline.name));
    });
    body.append(tags);
    if (destination) {
      const arrow = element('span', 'project-arrow', '\u2197');
      arrow.setAttribute('aria-hidden', 'true');
      body.append(arrow);
    } else {
      body.append(element('span', 'project-pending', lang === 'es' ? 'Enlace pendiente' : 'Link pending'));
    }
    card.append(thumb, body);
    return card;
  }

  function renderProjects(lang) {
    const fragment = document.createDocumentFragment();
    const visibleGroups = activeFilter === 'all' ? allDisciplines : allDisciplines.filter(discipline => discipline.id === activeFilter);
    const knownIds = new Set(allDisciplines.map(discipline => discipline.id));
    const ungrouped = data.projects.filter(project => !project.disciplines.some(id => knownIds.has(id)));
    if (activeFilter === 'all' && ungrouped.length) visibleGroups.push({ id: 'ungrouped', name: lang === 'es' ? 'Otros proyectos' : 'Other projects' });

    visibleGroups.forEach(discipline => {
      const projects = discipline.id === 'ungrouped' ? ungrouped : matchingProjects(discipline.id);
      if (!projects.length) return;
      const group = element('div', 'discipline-group');
      group.dataset.discipline = discipline.id;
      const label = element('div', 'discipline-label');
      label.append(element('h3', 'discipline-tag', discipline.name), element('span', 'group-count', String(projects.length)), element('span', 'discipline-line'));
      const grid = element('div', 'projects-grid');
      projects.forEach(project => grid.append(projectCard(project, lang)));
      group.append(label, grid);
      fragment.append(group);
    });
    groups.replaceChildren(fragment);

    const count = matchingProjects(activeFilter).length;
    const name = allDisciplines.find(discipline => discipline.id === activeFilter)?.name;
    status.textContent = lang === 'es'
      ? `${count} proyecto${count === 1 ? '' : 's'}${name ? ` en ${name}` : ''}`
      : `${count} project${count === 1 ? '' : 's'}${name ? ` in ${name}` : ''}`;
  }

  function renderPictures(lang) {
    const fragment = document.createDocumentFragment();
    data.pictures.forEach(picture => {
      const link = element('a', 'picture-item');
      link.href = picture.src;
      link.target = '_blank';
      link.rel = 'noopener';
      const img = element('img');
      img.src = picture.src;
      img.alt = picture.alt[lang] || picture.alt.es;
      img.loading = 'lazy';
      img.decoding = 'async';
      link.append(img);
      fragment.append(link);
    });
    gallery.replaceChildren(fragment);
  }

  function render() {
    const lang = window.currentLang || 'es';
    filters.setAttribute('aria-label', lang === 'es' ? 'Disciplinas' : 'Disciplines');
    gallery.setAttribute('aria-label', lang === 'es' ? 'Galería de Israel Valencia' : 'Israel Valencia gallery');
    renderFilters(lang);
    renderProjects(lang);
    renderPictures(lang);
    document.getElementById('project-count').textContent = String(data.projects.length);
    document.getElementById('discipline-count').textContent = String(data.disciplines.length);
  }

  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (!button || !filters.contains(button)) return;
    activeFilter = button.dataset.filter;
    render();
    filters.querySelector(`[data-filter="${activeFilter}"]`).focus({ preventScroll: true });
    document.getElementById('projects').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  window.addEventListener('portfolio:language', render);
  render();
})();
