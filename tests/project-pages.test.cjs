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
  assert.match(html, /src="\.\.\/\.\.\/images\/notion\/example\.png"/);
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
    for (const match of html.matchAll(/src="\.\.\/\.\.\/([^"]+)"/g)) {
      assert.ok(fs.existsSync(path.join(root, match[1])), `${folder}: ${match[1]}`);
    }
  }
});
