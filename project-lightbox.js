(function () {
  'use strict';

  const images = document.querySelectorAll('.project-cover img, .project-article img');
  if (!images.length) return;

  const english = document.documentElement.lang === 'en';
  const labels = english
    ? { open: 'View larger image', close: 'Close image', zoom: 'View original size', fit: 'Fit image to screen', dialog: 'Expanded project image' }
    : { open: 'Ampliar imagen', close: 'Cerrar imagen', zoom: 'Ver tamaño original', fit: 'Ajustar imagen a la pantalla', dialog: 'Imagen ampliada del proyecto' };
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.4"/><path d="m15.5 15.5 5 5"/><path d="M10.8 8.2v5.2M8.2 10.8h5.2"/></svg>';

  const dialog = document.createElement('dialog');
  dialog.className = 'project-lightbox';
  dialog.setAttribute('aria-label', labels.dialog);
  const shell = document.createElement('div');
  shell.className = 'project-lightbox-shell';
  const toolbar = document.createElement('div');
  toolbar.className = 'project-lightbox-toolbar';
  const zoom = document.createElement('button');
  zoom.type = 'button';
  zoom.className = 'project-lightbox-action';
  zoom.textContent = '100%';
  zoom.setAttribute('aria-label', labels.zoom);
  zoom.setAttribute('aria-pressed', 'false');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'project-lightbox-action project-lightbox-close';
  close.textContent = '×';
  close.setAttribute('aria-label', labels.close);
  toolbar.append(zoom, close);
  const stage = document.createElement('div');
  stage.className = 'project-lightbox-stage';
  const expanded = document.createElement('img');
  expanded.alt = '';
  stage.append(expanded);
  const caption = document.createElement('p');
  caption.className = 'project-lightbox-caption';
  shell.append(toolbar, stage, caption);
  dialog.append(shell);
  document.body.append(dialog);

  let trigger = null;
  function open(image, button) {
    const description = image.closest('figure')?.querySelector('figcaption')?.textContent.trim() || image.alt.trim();
    trigger = button;
    expanded.src = image.currentSrc || image.src;
    expanded.alt = description;
    caption.textContent = description;
    caption.hidden = !description;
    dialog.classList.remove('is-zoomed');
    zoom.textContent = '100%';
    zoom.setAttribute('aria-label', labels.zoom);
    zoom.setAttribute('aria-pressed', 'false');
    dialog.showModal();
    document.body.classList.add('project-lightbox-open');
    close.focus();
  }

  images.forEach(image => {
    const frame = document.createElement('span');
    frame.className = 'project-image-frame';
    image.before(frame);
    frame.append(image);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project-image-zoom';
    button.setAttribute('aria-label', labels.open + (image.alt ? ': ' + image.alt : ''));
    button.innerHTML = icon;
    frame.append(button);
    button.addEventListener('click', () => open(image, button));
  });

  zoom.addEventListener('click', () => {
    const enlarged = dialog.classList.toggle('is-zoomed');
    zoom.textContent = enlarged ? (english ? 'Fit' : 'Ajustar') : '100%';
    zoom.setAttribute('aria-label', enlarged ? labels.fit : labels.zoom);
    zoom.setAttribute('aria-pressed', String(enlarged));
    stage.scrollTo(0, 0);
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('project-lightbox-open');
    expanded.removeAttribute('src');
    trigger?.focus({ preventScroll: true });
    trigger = null;
  });
})();
