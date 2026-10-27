const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const renderer = import('../scripts/project-render.mjs');

test('Notion blocks render rich text, nested content, media and safe links', async () => {
  const { renderBlocks, meaningful } = await renderer;
  const blocks = [
    { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Hola <mundo>', annotations: { bold: true } }, { plain_text: ' sitio', href: 'javascript:alert(1)' }] } },
    { type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Proceso' }] } },
    { type: 'image', image: { caption: [{ plain_text: 'Prototipo' }] }, id: 'image-id' },
    { type: 'divider', divider: {} },
    { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'Paso uno' }] } },
    { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'Paso dos' }] } }
  ];
  assert.equal(meaningful({ type: 'paragraph', paragraph: { rich_text: [] } }), false);
  const html = await renderBlocks(blocks, async block => block.id === 'image-id' ? '../../images/notion/example.png' : null);
  assert.match(html, /<strong>Hola &lt;mundo&gt;<\/strong> sitio/);
  assert.match(html, /<h2>Proceso<\/h2>/);
  assert.match(html, /src="\/images\/notion\/example\.png"/);
  assert.match(html, /<figcaption>Prototipo<\/figcaption>/);
  assert.match(html, /<hr\s*\/?\s*>/);
  assert.match(html, /<ul>[\s\S]*Paso uno[\s\S]*Paso dos[\s\S]*<\/ul>/);
  assert.doesNotMatch(html, /javascript:/);
});

test('seed conversion keeps external images and excludes expiring Notion file URLs', async () => {
  const { renderSeedMarkdown } = await renderer;
  const html = renderSeedMarkdown('<callout>\n# Caso\n![](https://example.com/image.png)\n![](notion-file-block://abc)\n</callout>', 'https://www.notion.so/example');
  assert.match(html, /<h2>Caso<\/h2>/);
  assert.match(html, /<img src="https:\/\/example.com\/image.png"/);
  assert.match(html, /Imagen original en Notion/);
  assert.doesNotMatch(html, /notion-file-block:/);
});

test('generated routes use local assets and empty-page redirects reject unsafe URLs', async () => {
  const { renderExternalRedirect } = await renderer;
  assert.equal(renderExternalRedirect({ externalUrl: 'javascript:alert(1)' }), null);
  const redirect = renderExternalRedirect({ name: 'Demo', externalUrl: 'https://example.com/?a=1&b=2' });
  assert.match(redirect, /https:\/\/example.com\/\?a=1&amp;b=2/);
  const folders = fs.readdirSync(path.join(root, 'proyectos'));
  for (const folder of folders) {
    const html = fs.readFileSync(path.join(root, 'proyectos', folder, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /notion-file-block:/, folder);
    if (!html.includes('class="project-article"')) continue;
    assert.match(html, /id="project-stylesheet"[^>]*href="\/project-page\.css\?v=sitewide-dark"/i, folder);
    assert.match(html, /src="\/project-language\.js\?v=project-assets-v2"/i, folder);
    assert.match(html, /href="\/images\/site\/favicon\.png\?v=rocket"/i, folder);
    for (const match of html.matchAll(/src="\/([^\/"][^\"]*)"/g)) {
      assert.ok(fs.existsSync(path.join(root, match[1].split('?', 1)[0])), `${folder}: ${match[1]}`);
    }
  }
});

test('all project tables have visible cell borders and a mobile overflow path', () => {
  const css = fs.readFileSync(path.join(root, 'project-page.css'), 'utf8');
  assert.match(css, /\.project-article table\s*\{[^}]*border:\s*1px solid/);
  assert.match(css, /\.project-article th, \.project-article td\s*\{[^}]*border:\s*1px solid/);
  assert.match(css, /\.project-article div:has\(> table\)\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.project-article > table\s*\{[^}]*overflow-x:\s*auto/);
});

test('populated project pages have a matching English page and language switcher', () => {
  const folders = fs.readdirSync(path.join(root, 'proyectos'));
  for (const folder of folders) {
    const directory = path.join(root, 'proyectos', folder);
    const spanish = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    const englishPath = path.join(directory, 'en.html');
    if (!spanish.includes('class="project-article"')) {
      assert.equal(fs.existsSync(englishPath), false, `${folder}: redirect should not have an English page`);
      continue;
    }
    assert.ok(fs.existsSync(englishPath), `${folder}: missing English page`);
    const english = fs.readFileSync(englishPath, 'utf8');
    assert.match(spanish, /class="project-languages"/);
    assert.match(spanish, /href="en\.html"/);
    assert.match(spanish, /href="\/#projects"/);
    assert.match(english, /<html lang="en">/);
    assert.match(english, /English \(UK\)/);
    assert.match(english, /class="project-article"/);
    assert.match(english, /translation-source-hash/);
    assert.match(english, /href="\/project-page\.css\?v=sitewide-dark"/);
  }
});

test('Fitmashi English section titles are translated', () => {
  const html = fs.readFileSync(path.join(root, 'proyectos/933af8f94f11821bb51c011af76fbb8f/en.html'), 'utf8');
  for (const title of ['PROBLEM', 'SEGMENTATION', 'FINDINGS', 'USER &amp; MARKET RESEARCH']) {
    assert.ok(html.includes(`<strong>${title}</strong>`), `${title} is missing`);
  }
  assert.doesNotMatch(html, /<strong>(?:PROBLEMA|SEGMENTACIÓN|HALLAZGOS)<\/strong>/);
});
