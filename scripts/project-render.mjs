import { marked, Renderer } from 'marked';
import sanitizeHtml from 'sanitize-html';

const escaped = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const webUrl = value => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
};
const assetUrl = value => value?.startsWith('../../') ? `/${value.slice(6)}` : webUrl(value);

function cleanHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'figure', 'figcaption', 'aside', 'video', 'source'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'loading'],
      video: ['src', 'controls', 'preload'],
      source: ['src', 'type']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'], video: ['http', 'https'], source: ['http', 'https'] }
  });
}

export function richText(items = []) {
  return items.map(item => {
    let html = escaped(item.plain_text ?? item.text?.content ?? item.mention?.page?.id ?? '');
    const annotations = item.annotations || {};
    if (annotations.code) html = `<code>${html}</code>`;
    if (annotations.bold) html = `<strong>${html}</strong>`;
    if (annotations.italic) html = `<em>${html}</em>`;
    if (annotations.strikethrough) html = `<s>${html}</s>`;
    if (annotations.underline) html = `<u>${html}</u>`;
    const href = webUrl(item.href || item.text?.link?.url);
    return href ? `<a href="${escaped(href)}" target="_blank" rel="noopener noreferrer">${html}</a>` : html;
  }).join('');
}

export function meaningful(block) {
  if (!block || block.in_trash) return false;
  if (['paragraph', 'heading_1', 'heading_2', 'heading_3', 'quote', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'toggle', 'callout'].includes(block.type)) {
    return !!block[block.type]?.rich_text?.some(item => (item.plain_text ?? item.text?.content ?? '').trim());
  }
  return block.type !== 'breadcrumb';
}

export async function renderBlocks(blocks, resolveMedia = async () => null) {
  const output = [];
  let listType = null;
  for (const block of blocks) {
    if (!meaningful(block)) continue;
    const type = block.type;
    const value = block[type] || {};
    const text = richText(value.rich_text);
    const nested = block.children?.length ? await renderBlocks(block.children, resolveMedia) : '';
    const nextList = type === 'bulleted_list_item' ? 'ul' : type === 'numbered_list_item' ? 'ol' : null;
    if (nextList !== listType) {
      if (listType) output.push(`</${listType}>`);
      if (nextList) output.push(`<${nextList}>`);
      listType = nextList;
    }
    if (nextList) { output.push(`<li>${text}${nested}</li>`); continue; }
    if (['heading_1', 'heading_2', 'heading_3'].includes(type)) {
      const level = Number(type.slice(-1)) + 1;
      output.push(`<h${level}>${text}</h${level}>`);
    } else if (type === 'paragraph') output.push(`<p>${text}</p>${nested}`);
    else if (type === 'quote') output.push(`<blockquote>${text}${nested}</blockquote>`);
    else if (type === 'callout') output.push(`<aside class="project-callout">${text}${nested}</aside>`);
    else if (type === 'to_do') output.push(`<p class="project-task">${value.checked ? '&#9745;' : '&#9744;'} ${text}</p>${nested}`);
    else if (type === 'toggle') output.push(`<details><summary>${text}</summary>${nested}</details>`);
    else if (type === 'code') output.push(`<pre><code>${escaped(value.rich_text?.map(item => item.plain_text ?? item.text?.content ?? '').join('') || '')}</code></pre>`);
    else if (type === 'image') {
      const url = assetUrl(await resolveMedia(block));
      if (url) output.push(`<figure><img src="${escaped(url)}" alt="${escaped(value.caption?.map(item => item.plain_text).join('') || '')}" loading="lazy">${value.caption?.length ? `<figcaption>${richText(value.caption)}</figcaption>` : ''}</figure>`);
    } else if (type === 'video') {
      const url = assetUrl(await resolveMedia(block));
      if (url) output.push(`<video src="${escaped(url)}" controls preload="none"></video>`);
    } else if (type === 'pdf' || type === 'file') {
      const url = assetUrl(await resolveMedia(block));
      if (url) output.push(`<p><a class="project-file" href="${escaped(url)}" target="_blank" rel="noopener noreferrer">${escaped(value.name || (type === 'pdf' ? 'Abrir PDF' : 'Abrir archivo'))} &#8599;</a></p>`);
    } else if (type === 'bookmark' || type === 'link_preview' || type === 'embed') {
      const url = webUrl(value.url);
      if (url) output.push(`<p><a href="${escaped(url)}" target="_blank" rel="noopener noreferrer">${text || escaped(url)} &#8599;</a></p>`);
    } else if (type === 'divider') output.push('<hr>');
    else if (type === 'table') output.push(`<div class="project-table"><table>${(block.children || []).map(row => `<tr>${(row.table_row?.cells || []).map(cell => `<td>${richText(cell)}</td>`).join('')}</tr>`).join('')}</table></div>`);
    else if (nested) output.push(nested);
  }
  if (listType) output.push(`</${listType}>`);
  return cleanHtml(output.join('\n'));
}

export function renderSeedMarkdown(markdown, notionUrl) {
  const source = markdown
    .replace(/!\[([^\]]*)\]\(notion-file-block:[^)]+\)/g, (_, label) => `[${label || 'Imagen original en Notion'}](${notionUrl})`)
    .replace(/<(?:pdf|video|file)\s+src="notion-file-block:[^"]+"\s*\/?\s*>/g, `[Abrir archivo en Notion](${notionUrl})`)
    .replace(/<\/?callout[^>]*>/g, '\n\n')
    .replace(/^\t+/gm, '')
    .replace(/Press enter or click to view image in full size/g, '');
  const renderer = new Renderer();
  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens);
    if (!text.replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}]/gu, '')) return '';
    const level = Math.min(depth + 1, 6);
    return `<h${level}>${text}</h${level}>`;
  };
  return cleanHtml(marked.parse(source, { renderer }));
}

export function renderProjectPage(project, content, options = {}) {
  const title = escaped(project.name);
  const description = escaped(project.description?.es || '');
  const cover = project.cover ? `<figure class="project-cover"><img src="/${escaped(project.cover)}" alt="${title}" fetchpriority="high"></figure>` : '';
  const disciplines = (options.disciplines || []).filter(item => project.disciplines.includes(item.id)).map(item => escaped(item.name));
  const meta = [...project.years, ...disciplines].join(' / ');
  const source = webUrl(project.notionUrl);
  const sourceLink = source ? `<a href="${escaped(source)}" target="_blank" rel="noopener noreferrer">Ver en Notion &#8599;</a>` : '';
  const body = options.partial ? `${content}<p class="project-source-note">${sourceLink}</p>` : content;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#ffffff">
  <meta name="description" content="${description || title}">
  <title>${title} | Israel Valencia</title>
  <link rel="icon" type="image/png" sizes="180x180" href="/images/site/favicon.png?v=rocket">
  <link rel="apple-touch-icon" href="/images/site/favicon.png?v=rocket">
  <link id="project-stylesheet" rel="stylesheet" href="/project-page.css?v=glass-interactions" onerror="this.onerror=null;this.href='/project-page.css?v=glass-interactions-retry'">
  <script defer src="/project-language.js?v=project-assets-v2"></script>
</head>
<body>
  <header class="project-header">
    <a class="project-brand" href="/#home">Israel<br>Valencia</a>
    <nav class="project-languages" aria-label="Idioma">
      <a class="project-lang active" href="./" lang="es" aria-label="Español (España)" aria-current="page" title="Español (España)">🇪🇸</a>
      <a class="project-lang" href="en.html" lang="en" aria-label="Inglés (Reino Unido)" title="Inglés (Reino Unido)">🇬🇧</a>
    </nav>
    <a class="project-back" href="/#projects">&#8592; Todos los proyectos</a>
  </header>
  <main>
    <div class="project-intro"><p class="project-meta">${escaped(meta)}</p><h1>${title}</h1>${description ? `<p class="project-description">${description}</p>` : ''}</div>
    ${cover}
    <article class="project-article">${body || `<p>${sourceLink}</p>`}</article>
    <nav class="project-end"><a href="/#projects">&#8592; Volver a proyectos</a>${sourceLink}</nav>
  </main>
  <footer>&copy; ${new Date().getFullYear()} Israel Valencia</footer>
</body>
</html>\n`;
}

export function renderExternalRedirect(project) {
  const destination = webUrl(project.externalUrl);
  if (!destination) return null;
  const url = escaped(destination);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${url}"><title>${escaped(project.name)} | Israel Valencia</title></head><body><p><a href="${url}">Abrir ${escaped(project.name)}</a></p><script>location.replace(${JSON.stringify(destination).replace(/</g, '\\u003c')})</script></body></html>\n`;
}
