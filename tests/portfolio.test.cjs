const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const createModel = require('../portfolio-model.js');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'portfolio-data.js'), 'utf8'), context);
const data = JSON.parse(JSON.stringify(context.window.PORTFOLIO_DATA));
const model = createModel(data);

test('unique projects and database discipline order', () => {
  assert.equal(model.projects.length, data.projects.length);
  assert.equal(new Set(model.projects.map(project => project.id)).size, data.projects.length);
  const rank = project => Math.min(...project.disciplines.map(id => model.disciplines.findIndex(discipline => discipline.id === id)).filter(index => index >= 0), model.disciplines.length);
  const ranks = model.projects.map(rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  for (const discipline of data.disciplines) {
    assert.equal(model.matches(discipline.id).length, data.projects.filter(project => project.disciplines.includes(discipline.id)).length);
  }
});

test('multiple discipline relations match independently', () => {
  const multiple = data.projects.find(project => project.disciplines.length > 1);
  if (multiple) for (const id of multiple.disciplines) assert.ok(model.matches(id).includes(multiple));
  assert.equal(model.matches('unknown').length, 0);
});

test('populated pages use local routes, empty pages open their URL', () => {
  for (const project of data.projects) {
    assert.equal(model.destination(project), project.hasContent ? `/proyectos/${project.id}/` : project.externalUrl ? new URL(project.externalUrl).href : null);
  }
  assert.equal(model.destination({ id: '../unsafe', hasContent: true }), null);
  assert.equal(model.destination({ hasContent: false, notionUrl: 'https://notion.so/empty', externalUrl: '' }), null);
  assert.equal(model.destination({ hasContent: false, externalUrl: 'javascript:alert(1)' }), null);
  assert.equal(model.destination({ hasContent: false, externalUrl: 'data:text/html,hi' }), null);
});

test('each populated project has its own generated page and empty projects retain redirects', () => {
  for (const project of data.projects) {
    if (!project.hasContent && !project.externalUrl) continue;
    const html = fs.readFileSync(path.join(root, 'proyectos', project.id, 'index.html'), 'utf8');
    assert.ok(html.includes(project.name), project.name);
    if (project.hasContent) {
      assert.ok(html.includes('class="project-article"'), project.name);
      assert.ok(html.includes('../../#projects'), project.name);
    } else {
      assert.ok(html.includes(project.externalUrl.replaceAll('&', '&amp;')), project.name);
    }
  }
});

test('grouped index retains multi-tag occurrences without inflating unique count', () => {
  const known = new Set(data.disciplines.map(discipline => discipline.id));
  const expected = data.projects.reduce((sum, project) => sum + Math.max(1, project.disciplines.filter(id => known.has(id)).length), 0);
  assert.equal(model.groups('all').reduce((sum, group) => sum + group.projects.length, 0), expected);
  assert.equal(model.matches('all').length, data.projects.length);
});

test('all original ES/EN copy and emphasis remains identical', () => {
  const original = fs.readFileSync(path.join(root, '.verification/index.html'), 'utf8');
  const begin = original.indexOf('const translations =');
  const end = original.indexOf('window.currentLang', begin);
  const before = {};
  vm.runInNewContext(original.slice(begin, end) + 'globalThis.copy = translations;', before);
  const after = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), after);
  const removedCopy = new Set(['proj_label', 'proj_title', 'proj_sub', 'hero_scroll', 'nav_portfolios', 'port_label', 'port_title', 'port_sub', 'port1_title', 'port1_desc', 'port2_title', 'port2_desc']);
  const removedPortfolioCopy = [...removedCopy].filter(key => key === 'nav_portfolios' || key.startsWith('port'));
  for (const lang of ['es', 'en']) {
    before.copy[lang].disc_all = lang === 'es' ? 'Todos' : 'All';
    for (const key of removedPortfolioCopy) delete before.copy[lang][key];
  }
  assert.deepEqual(JSON.parse(JSON.stringify(before.copy)), JSON.parse(JSON.stringify(after.window.PORTFOLIO_TRANSLATIONS)));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map(match => match[1]);
  for (const key of Object.keys(before.copy.es)) {
    assert.ok(keys.includes(key) || key === 'disc_all' || removedCopy.has(key), 'Missing rendered copy: ' + key);
  }
  for (const key of removedCopy) assert.ok(!keys.includes(key), 'Removed copy still rendered: ' + key);
  assert.doesNotMatch(html, /class="(?:mobile-next-section|hero-scroll)"/);
  assert.doesNotMatch(html, /id="portfolios"|href="#portfolios"/);
  assert.match(html, /<section id="about">/);
});

test('all local image assets exist and expected source links are retained', () => {
  for (const project of data.projects) if (project.cover) assert.ok(fs.existsSync(path.join(root, project.cover)), project.name);
  for (const picture of data.pictures) assert.ok(fs.existsSync(path.join(root, picture.src)));
  assert.equal(data.pictures.length, 3);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const value of ['U. de Lima/ U. Pacifico', 'Comunicaciones / Ing. Industrial']) {
    assert.ok(html.includes('<span class="about-info-value">' + value + '</span>'), value);
  }
  for (const value of ['https://wa.me/51987729841', 'https://www.linkedin.com/in/israel-valencia/', 'mailto:israval2000@gmail.com', 'Universidad de Lima', 'Comunicaciones', 'Per\u00fa', '\u221e', '\u00a9 2026 Israel Valencia']) assert.ok(html.includes(value), value);
});

test('unknown and empty disciplines retain usable groups', () => {
  const synthetic = createModel({ disciplines: [{ id: 'known', name: 'Known' }], projects: [{ id: 'p', disciplines: ['removed'], hasContent: false, externalUrl: 'https://example.com/' }], additionalDisciplines: [] });
  assert.equal(synthetic.groups('all')[0].id, 'ungrouped');
  assert.equal(synthetic.matches('known').length, 0);
});

test('responsive layouts progressively enhance mobile defaults', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1(?:\.0)?"/);
  assert.doesNotMatch(css, /@media\s*\(max-width:/);
  for (const width of [601, 1001, 1550]) assert.ok(css.includes(`@media (min-width: ${width}px)`));
  assert.ok(css.indexOf('Mobile defaults') < css.indexOf('@media (min-width: 601px)'));
  assert.match(css, /\.lang-btn \{ min-width: 44px; min-height: 44px; \}/);
  assert.ok(css.includes('@media (pointer: coarse)'));
  assert.ok(css.includes('touch-action: pan-y'));
  assert.match(css, /\.work-area \{[^}]*padding-top: clamp\(40px, 5vw, 76px\); padding-bottom: clamp\(40px, 5vw, 76px\)/);
});

test('opening particle scene preserves centered copy and reduced-motion fallback', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'hero-particles.js'), 'utf8');
  assert.match(html, /<div class="opening-copy">\s*<canvas class="hero-particle-canvas"[^>]*aria-hidden="true"/);
  assert.match(html, /<script defer src="hero-particles\.js(?:\?v=[^"]+)?"><\/script>/);
  assert.match(css, /\.opening-copy \{[^}]*justify-content: center;[^}]*overflow: hidden;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /motionPreference\.matches/);
  assert.match(source, /name: 'cortex'/);
  assert.match(source, /name: 'cerebellum'/);
  assert.match(source, /name: 'stem'/);
  assert.doesNotMatch(source, /const radius = Math\.sqrt\(r2\)/);
});

test('particle brain has a lateral cortex, separate cerebellum and descending stem', () => {
  const source = fs.readFileSync(path.join(root, 'hero-particles.js'), 'utf8');
  const begin = source.indexOf('const brainRegions =');
  const end = source.indexOf('function buildParticles', begin);
  const shape = {};
  vm.runInNewContext(source.slice(begin, end) + 'globalThis.shape = { brainRegions, insideOutline };', shape);
  const [cortex, cerebellum, stem] = shape.shape.brainRegions;
  assert.ok(shape.shape.insideOutline(330, 300, cortex.outline));
  assert.ok(shape.shape.insideOutline(550, 480, cerebellum.outline));
  assert.ok(shape.shape.insideOutline(486, 600, stem.outline));
  assert.ok(!shape.shape.insideOutline(330, 600, cortex.outline));
  assert.ok(cortex.outline.length > 30);
  assert.ok(cerebellum.bounds[1] > cortex.bounds[1]);
  assert.ok(stem.bounds[3] > cerebellum.bounds[3]);
});

test('filter result status stays accessible without appearing below filters', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /class="filter-hint" id="filter-hint" role="status"/);
  assert.match(css, /\.filter-hint \{[^}]*position: absolute;[^}]*clip-path: inset\(50%\)/);
});

test('view buttons have distinct accessible descriptions in both languages', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'portfolio.js'), 'utf8');
  const begin = source.indexOf('const ui =');
  const end = source.indexOf('let activeFilter', begin);
  const descriptions = {};
  vm.runInNewContext(source.slice(begin, end) + 'globalThis.copy = ui;', descriptions);
  for (const view of ['wheel', 'index']) {
    const button = html.match(new RegExp('<button\\b[^>]*id="view-' + view + '"[^>]*>'))[0];
    assert.ok(button.includes('aria-describedby="view-' + view + '-tooltip"'));
    assert.match(html, new RegExp('id="view-' + view + '-tooltip" role="tooltip" data-ui="' + view + 'Tooltip"'));
    for (const lang of ['es', 'en']) assert.ok(descriptions.copy[lang][view + 'Tooltip'].length > 20);
  }
  for (const lang of ['es', 'en']) assert.notEqual(descriptions.copy[lang].wheelTooltip, descriptions.copy[lang].indexTooltip);
});
