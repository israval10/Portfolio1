(function (root) {
  'use strict';

  function createModel(data) {
    const disciplines = [...data.disciplines, ...(data.additionalDisciplines || [])];
    const rank = project => {
      const indices = project.disciplines.map(id => disciplines.findIndex(discipline => discipline.id === id)).filter(index => index >= 0);
      return indices.length ? Math.min(...indices) : disciplines.length;
    };
    const projects = [...data.projects].sort((a, b) => rank(a) - rank(b));
    const matches = filter => projects.filter(project => filter === 'all' || project.disciplines.includes(filter));
    const destination = project => {
      if (project.hasContent) return /^[a-f0-9]{32}$/i.test(project.id || '') ? `/proyectos/${project.id.toLowerCase()}/` : null;
      const value = project.externalUrl;
      if (!value) return null;
      try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
      } catch { return null; }
    };
    const groups = filter => {
      const visible = filter === 'all' ? disciplines : disciplines.filter(discipline => discipline.id === filter);
      const result = visible.map(discipline => ({ ...discipline, projects: matches(discipline.id) })).filter(group => group.projects.length);
      const known = new Set(disciplines.map(discipline => discipline.id));
      const ungrouped = projects.filter(project => !project.disciplines.some(id => known.has(id)));
      if (filter === 'all' && ungrouped.length) result.push({ id: 'ungrouped', name: '', projects: ungrouped });
      return result;
    };
    return { disciplines, projects, matches, destination, groups };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = createModel;
  else root.createPortfolioModel = createModel;
})(typeof window !== 'undefined' ? window : globalThis);
