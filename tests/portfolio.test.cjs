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
  assert.equal(model.projects.length, 14);
  assert.equal(new Set(model.projects.map(project => project.id)).size, 14);
  const rank = project => Math.min(...project.disciplines.map(id => model.disciplines.findIndex(discipline => discipline.id === id)));
  const ranks = model.projects.map(rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.deepEqual(data.disciplines.map(discipline => model.matches(discipline.id).length), [9, 3, 5, 2]);
});

test('multiple discipline relations match independently', () => {
  const academy = data.projects.find(project => project.name === 'Llama Academy');
  for (const id of academy.disciplines) assert.ok(model.matches(id).includes(academy));
  assert.equal(model.matches('unknown').length, 0);
});

test('empty pages open URL, populated pages open Notion', () => {
  for (const project of data.projects) {
    assert.ok(model.destination(project), project.name);
    assert.equal(model.destination(project), new URL(project.hasContent ? project.notionUrl : project.externalUrl).href);
  }
  assert.equal(model.destination({ hasContent: false, notionUrl: 'https://notion.so/empty', externalUrl: '' }), null);
  assert.equal(model.destination({ hasContent: false, externalUrl: 'javascript:alert(1)' }), null);
  assert.equal(model.destination({ hasContent: false, externalUrl: 'data:text/html,hi' }), null);
  assert.equal(model.destination(data.projects.find(project => project.name === 'Llama Academy')), 'https://llama-academy.vercel.app/');
});

test('grouped index retains multi-tag occurrences without inflating unique count', () => {
  assert.equal(model.groups('all').reduce((sum, group) => sum + group.projects.length, 0), 19);
  assert.equal(model.matches('all').length, 14);
  assert.equal(model.groups(data.disciplines[1].id).length, 1);
});

test('all original ES/EN copy and emphasis remains identical', () => {
  const original = fs.readFileSync(path.join(root, '.verification/index.html'), 'utf8');
  const begin = original.indexOf('const translations =');
  const end = original.indexOf('window.currentLang', begin);
  const before = {};
  vm.runInNewContext(original.slice(begin, end) + 'globalThis.copy = translations;', before);
  const after = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), after);
  for (const lang of ['es', 'en']) before.copy[lang].disc_all = lang === 'es' ? 'Todos' : 'All';
  assert.deepEqual(JSON.parse(JSON.stringify(before.copy)), JSON.parse(JSON.stringify(after.window.PORTFOLIO_TRANSLATIONS)));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map(match => match[1]);
  const removedCopy = new Set(['proj_label', 'proj_title', 'proj_sub', 'hero_scroll']);
  for (const key of Object.keys(before.copy.es)) {
    assert.ok(keys.includes(key) || key === 'disc_all' || removedCopy.has(key), 'Missing rendered copy: ' + key);
  }
  for (const key of removedCopy) assert.ok(!keys.includes(key), 'Removed copy still rendered: ' + key);
  assert.doesNotMatch(html, /class="(?:mobile-next-section|hero-scroll)"/);
  assert.match(html, /<section id="about">/);
  assert.equal(Object.keys(before.copy.es).length, 51);
});

test('all local image assets exist and expected source links are retained', () => {
  for (const project of data.projects) if (project.cover) assert.ok(fs.existsSync(path.join(root, project.cover)), project.name);
  for (const picture of data.pictures) assert.ok(fs.existsSync(path.join(root, picture.src)));
  assert.equal(data.pictures.length, 3);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const value of ['U. de Lima/ U. Pacifico', 'Comunicaciones / Ing. Industrial']) {
    assert.ok(html.includes('<span class="about-info-value">' + value + '</span>'), value);
  }
  for (const value of ['https://wa.me/51987729841', 'https://www.linkedin.com/in/israel-valencia/', 'mailto:israval2000@gmail.com', 'iv-portafolio-1-1.webflow.io', 'Universidad de Lima', 'Comunicaciones', 'Per\u00fa', '\u221e', '\u00a9 2026 Israel Valencia']) assert.ok(html.includes(value), value);
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
