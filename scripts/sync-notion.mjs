import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { meaningful, renderBlocks, renderExternalRedirect, renderProjectPage, renderSeedMarkdown } from './project-render.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const projectSource = '612af8f9-4f11-82ee-bc5e-878a97778554';
const disciplineSource = 'c74af8f9-4f11-8275-a506-8769d93c6d37';
const version = '2026-03-11';
const mode = process.argv[2];
if (!['--seed', '--sync'].includes(mode)) throw new Error('Use --seed or --sync');
if (mode === '--sync' && !process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN is required for synchronization');

const path = relative => join(root, relative);
const require = createRequire(import.meta.url);
const createPortfolioModel = require(path('portfolio-model.js'));
const readJson = async relative => JSON.parse(await readFile(path(relative), 'utf8'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const idFrom = id => String(id || '').replace(/-/g, '').toLowerCase();
const plain = richText => (richText || []).map(item => item.plain_text ?? item.text?.content ?? '').join('');
const property = (properties, name) => Object.entries(properties || {}).find(([key]) => key.trim().toLowerCase() === name.toLowerCase())?.[1];
const mediaUrl = value => value?.type === 'file' ? value.file?.url : value?.type === 'external' ? value.external?.url : null;
const extension = mime => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/webm': 'webm' })[mime?.split(';')[0]];
const contentHash = blocks => createHash('sha256').update(JSON.stringify(blocks, (key, value) => {
  if (key === 'last_edited_time' || key === 'expiry_time') return undefined;
  if (key === 'file' && value?.url) return { ...value, url: undefined };
  return value;
})).digest('hex');

async function writeChanged(relative, value) {
  const destination = path(relative);
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  try {
    if ((await readFile(destination)).equals(bytes)) return false;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return true;
}

function readSnapshot(source) {
  const context = { window: {} };
  runInNewContext(source, context, { timeout: 1000 });
  return JSON.parse(JSON.stringify(context.window.PORTFOLIO_DATA));
}

function renderStaticIndex(data) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const model = createPortfolioModel(data);
  const cards = project => {
    const destination = model.destination(project);
    const tag = destination ? 'a' : 'article';
    const link = destination ? ` href="${escape(destination)}"${project.hasContent ? '' : ' target="_blank" rel="noopener noreferrer"'}` : ' aria-disabled="true"';
    const thumb = project.cover
      ? `<img src="/${escape(project.cover.replace(/^\//, ''))}" alt="${escape(project.name)}" loading="lazy" decoding="async">`
      : escape(project.name);
    const description = project.description?.es ? `<p class="project-desc">${escape(project.description.es)}</p>` : '';
    const tags = [...project.years, ...model.disciplines.filter(item => project.disciplines.includes(item.id)).map(item => item.name)];
    return `            <${tag} class="project-card" data-project-id="${escape(project.id)}" data-disciplines="${escape(project.disciplines.join(' '))}"${link}>
              <div class="project-thumb">${thumb}</div>
              <div class="project-body"><h3 class="project-title">${escape(project.name)}</h3>${description}<div class="project-tags">${tags.map(item => `<span>${escape(item)}</span>`).join('')}</div>${destination ? '' : '<span class="project-pending">Enlace pendiente</span>'}</div>
              <span class="project-arrow" aria-hidden="true">↗</span>
            </${tag}>`;
  };
  return model.groups('all').map(group => `          <div class="discipline-group" data-discipline="${escape(group.id)}">
            <div class="discipline-label"><h3 class="discipline-tag">${escape(group.name || 'Otros proyectos')}</h3><span class="group-count">${group.projects.length}</span></div>
${group.projects.map(cards).join('\n')}
          </div>`).join('\n');
}

async function writeStaticIndex(data) {
  const source = await readFile(path('index.html'), 'utf8');
  const start = '<!-- project-index:start -->';
  const end = '<!-- project-index:end -->';
  const before = source.indexOf(start);
  const after = source.indexOf(end, before + start.length);
  if (before < 0 || after < 0) throw new Error('Project index markers missing from index.html');
  await writeChanged('index.html', source.slice(0, before + start.length) + '\n' + renderStaticIndex(data) + '\n          ' + source.slice(after));
}

let lastRequest = 0;
async function notion(endpoint, method = 'GET', body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = Math.max(0, 360 - (Date.now() - lastRequest));
    if (wait) await pause(wait);
    lastRequest = Date.now();
    const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': version, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      await pause(Number(response.headers.get('retry-after') || 2 ** attempt) * 1000);
      continue;
    }
    throw new Error(`Notion ${response.status} at ${endpoint}: ${(await response.text()).slice(0, 300)}`);
  }
  throw new Error(`Notion did not respond after retries: ${endpoint}`);
}

async function paginate(endpoint, method = 'GET') {
  const results = [];
  let cursor;
  do {
    const page = method === 'POST'
      ? await notion(endpoint, 'POST', { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
      : await notion(`${endpoint}?page_size=100${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ''}`);
    results.push(...page.results);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return results;
}

async function childrenOf(blockId, depth = 0) {
  if (depth > 12) throw new Error(`Nested blocks exceed supported depth at ${blockId}`);
  const blocks = await paginate(`/blocks/${blockId}/children`);
  if (blocks.length > 5000) throw new Error(`Too many blocks at ${blockId}`);
  for (const block of blocks) if (block.has_children && !['child_page', 'child_database'].includes(block.type)) {
    block.children = await childrenOf(block.id, depth + 1);
  }
  return blocks;
}

async function downloadMedia(url, relativeStem, maxBytes = 80 * 1024 * 1024) {
  if (!url?.startsWith('https://')) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Media ${response.status}: ${relativeStem}`);
  const size = Number(response.headers.get('content-length') || 0);
  if (size > maxBytes) throw new Error(`Media exceeds ${maxBytes} bytes: ${relativeStem}`);
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > maxBytes) throw new Error(`Media exceeds ${maxBytes} bytes: ${relativeStem}`);
    chunks.push(chunk);
  }
  const mime = response.headers.get('content-type');
  const ext = extension(mime) || new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || 'bin';
  const relative = `${relativeStem}.${ext}`;
  await writeChanged(relative, Buffer.concat(chunks));
  return relative;
}

async function mediaForBlock(block, notionUrl, missing) {
  const value = block[block.type];
  const source = mediaUrl(value);
  if (value?.type === 'external' && source?.startsWith('https://')) return source;
  if (!source) { missing.add(block.id); return null; }
  try {
    const local = await downloadMedia(source, `images/notion/content-${idFrom(block.id)}`);
    return local ? `../../${local}` : null;
  } catch (error) {
    missing.add(block.id);
    console.warn(`${notionUrl}: ${error.message}`);
    return null;
  }
}

function mapProject(page, previous) {
  const properties = page.properties || {};
  const id = idFrom(page.id);
  const name = plain(property(properties, 'Name')?.title) || previous?.name || 'Proyecto sin nombre';
  const description = plain(property(properties, 'Descripción')?.rich_text);
  const relation = property(properties, 'Disciplinas')?.relation || [];
  const years = property(properties, 'Number')?.multi_select?.map(item => item.name) || [];
  const externalUrl = property(properties, 'URL')?.url || '';
  return {
    id, name,
    description: { es: description, en: previous?.description?.es === description ? previous.description.en : description },
    disciplines: relation.map(item => idFrom(item.id)),
    years, notionUrl: page.url || `https://www.notion.so/${id}`,
    externalUrl, hasContent: false, cover: page.cover ? previous?.cover || '' : '',
    notionEditedAt: page.last_edited_time,
    notionContentHash: null
  };
}

async function sync(snapshot) {
  const disciplinePages = (await paginate(`/data_sources/${disciplineSource}/query`, 'POST')).filter(page => !page.in_trash && !page.archived);
  const existingDiscipline = new Map(snapshot.disciplines.map(item => [item.id, item]));
  const disciplines = disciplinePages.map(page => ({
    id: idFrom(page.id),
    name: plain(property(page.properties, 'Name')?.title),
    color: existingDiscipline.get(idFrom(page.id))?.color || '#484e43'
  })).filter(item => item.name);
  const order = new Map(snapshot.disciplines.map((item, index) => [item.id, index]));
  disciplines.sort((a, b) => (order.get(a.id) ?? 1e5) - (order.get(b.id) ?? 1e5));

  const projectPages = (await paginate(`/data_sources/${projectSource}/query`, 'POST')).filter(page => !page.in_trash && !page.archived);
  const previous = new Map(snapshot.projects.map(item => [item.id, item]));
  const projects = [];
  const contentById = new Map();
  for (const page of projectPages) {
    const before = previous.get(idFrom(page.id));
    const route = path(`proyectos/${idFrom(page.id)}/index.html`);
    const routeExists = await readFile(route).then(() => true).catch(error => error.code === 'ENOENT' ? false : Promise.reject(error));
    const blocks = await childrenOf(page.id);
    const hash = contentHash(blocks);
    if (before?.notionEditedAt === page.last_edited_time && before?.notionContentHash === hash && routeExists) {
      projects.push(before);
      contentById.set(before.id, null);
      continue;
    }
    const project = mapProject(page, before);
    project.notionContentHash = hash;
    project.hasContent = blocks.some(block => meaningful(block) && block.type !== 'divider');
    if (page.cover) {
      try {
        const cover = await downloadMedia(mediaUrl(page.cover), `images/notion/project-${project.id}-cover`, 30 * 1024 * 1024);
        if (cover) project.cover = cover;
      } catch (error) { console.warn(`${project.name}: ${error.message}`); }
    }
    if (project.hasContent) {
      const missing = new Set();
      const html = await renderBlocks(blocks, block => mediaForBlock(block, project.notionUrl, missing));
      contentById.set(project.id, { html, partial: missing.size > 0 });
    }
    projects.push(project);
  }
  const projectOrder = new Map(snapshot.projects.map((item, index) => [item.id, index]));
  projects.sort((a, b) => (projectOrder.get(a.id) ?? 1e5) - (projectOrder.get(b.id) ?? 1e5));
  const changed = JSON.stringify({ disciplines, projects }) !== JSON.stringify({ disciplines: snapshot.disciplines, projects: snapshot.projects });
  return {
    data: { ...snapshot, sources: { ...snapshot.sources, retrievedAt: changed ? new Date().toISOString().slice(0, 10) : snapshot.sources.retrievedAt }, disciplines, projects },
    contentById
  };
}

async function main() {
  const snapshot = readSnapshot(await readFile(path('portfolio-data.js'), 'utf8'));
  let data = snapshot;
  let contentById;
  if (mode === '--sync') {
    ({ data, contentById } = await sync(snapshot));
    await writeChanged('portfolio-data.js', `// Generated snapshot from Notion. Run npm run sync:notion to refresh.\nwindow.PORTFOLIO_DATA = ${JSON.stringify(data, null, 2)};\n`);
  } else {
    const seed = await readJson('notion-seed.json');
    contentById = new Map(Object.entries(seed).map(([id, entry]) => [id, { html: renderSeedMarkdown(entry.markdown, entry.notionUrl), partial: entry.partial }]));
  }
  await writeStaticIndex(data);

  const active = new Set();
  for (const project of data.projects) {
    if (!/^[a-f0-9]{32}$/.test(project.id)) throw new Error(`Invalid project ID: ${project.id}`);
    active.add(project.id);
    const relative = `proyectos/${project.id}/index.html`;
    if (project.hasContent) {
      const content = contentById.get(project.id);
      if (content === null && mode === '--sync') continue;
      if (!content) throw new Error(`No content for ${project.name}`);
      await writeChanged(relative, renderProjectPage(project, content.html, { disciplines: data.disciplines, partial: content.partial }));
    } else {
      const redirect = renderExternalRedirect(project);
      if (redirect) await writeChanged(relative, redirect);
      else await rm(path(`proyectos/${project.id}`), { recursive: true, force: true });
    }
  }
  const directory = path('proyectos');
  for (const folder of await readdir(directory).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))) {
    if (/^[a-f0-9]{32}$/.test(folder) && !active.has(folder)) await rm(join(directory, folder), { recursive: true });
  }
  console.log(`${mode === '--sync' ? 'Synchronized' : 'Built'} ${data.projects.filter(item => item.hasContent).length} project pages and ${data.projects.filter(item => !item.hasContent && item.externalUrl).length} redirects`);
}

await main();
