const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const THREE = require('../vendor/three.min.js');

function makeWheel(imageSize = { width: 1600, height: 900 }, reducedMotion = false) {
  const draws = [];
  const context = {
    fillRect() {}, fillText() {},
    measureText(text) { return { width: text.length * 30 }; },
    drawImage(...args) { draws.push(args); }
  };
  class Image {
    constructor() { this.naturalWidth = imageSize.width; this.naturalHeight = imageSize.height; }
    set src(value) { this.onload(); }
  }
  const environment = {
    window: {}, THREE, Image,
    document: { hidden: false, createElement: () => ({ getContext: () => context }) }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'project-wheel.js'), 'utf8'), environment);
  const wheel = Object.create(environment.window.ProjectWheel.prototype);
  Object.assign(wheel, {
    renderer: { capabilities: { getMaxAnisotropy: () => 4 }, render() {} },
    group: new THREE.Group(), cache: new Map(), items: [],
    canvas: { style: {} }, stage: { dataset: {} },
    enabled: true, inViewport: true, reducedMotion: { matches: reducedMotion },
    angle: 0, targetAngle: 0, velocity: 0, radius: 0,
    requestFrame() { this.requested = (this.requested || 0) + 1; },
    updateLoadState() {}, onSelect(project) { this.caption = project; },
    pick(event) { return event.project; }
  });
  return { wheel, draws };
}

function project(id) { return { id, name: 'Project ' + id, years: ['2025'], cover: 'cover.png' }; }

test('wide and tall covers fill the complete plane without stretching or padding', () => {
  for (const size of [{ width: 1600, height: 900 }, { width: 900, height: 1600 }, { width: 960, height: 892 }]) {
    const { wheel, draws } = makeWheel(size);
    const item = wheel.makeItem(project('a'));
    const [, x, y, width, height] = draws[0];
    assert.ok(width >= 960 && height >= 892);
    assert.equal(x, (960 - width) / 2);
    assert.equal(y, (892 - height) / 2);
    assert.ok(Math.abs(width / height - size.width / size.height) < 1e-10);
    assert.equal(item.texture.image.width, 960);
    assert.equal(item.texture.image.height, 892);
    assert.equal(item.mesh.userData.loaded, true);
  }
});

test('only DataSigners shifts its wheel crop to include the person on the right', () => {
  const dataContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'portfolio-data.js'), 'utf8'), dataContext);
  const projects = dataContext.window.PORTFOLIO_DATA.projects;
  const adjusted = projects.filter(project => project.wheelCoverPosition);
  assert.equal(adjusted.length, 1);
  assert.equal(adjusted[0].id, 'bfeaf8f94f118273815f81f48a820cf3');
  const { wheel, draws } = makeWheel({ width: 1500, height: 600 });
  wheel.makeItem(adjusted[0]);
  const [, x, y, width, height] = draws[0];
  assert.equal(x, 960 - width);
  assert.equal(y, (892 - height) / 2);
  assert.ok(width >= 960 && height >= 892);
  const scale = height / 600;
  assert.ok(-x / scale < 865);
  assert.ok((960 - x) / scale > 1375);
  for (const project of projects.filter(project => project.cover && !project.wheelCoverPosition)) {
    wheel.makeItem(project);
    const [, otherX, otherY, otherWidth, otherHeight] = draws.at(-1);
    assert.equal(otherX, (960 - otherWidth) / 2, project.name);
    assert.equal(otherY, (892 - otherHeight) / 2, project.name);
  }
});

test('mouse hover highlights only the pointed card, blank space clears light but retains caption', () => {
  const { wheel } = makeWheel();
  const a = project('a');
  const b = project('b');
  wheel.items = [wheel.makeItem(a), wheel.makeItem(b)];
  wheel.items.forEach(item => { item.active = true; });
  wheel.pointerMove({ pointerType: 'mouse', project: a });
  assert.equal(wheel.hoveredId, 'a');
  assert.equal(wheel.canvas.style.cursor, 'pointer');
  assert.equal(wheel.caption, a);
  for (let frame = 1; frame <= 60; frame++) wheel.render(frame * 16.67);
  assert.ok(wheel.items[0].material.color.r > 1.37);
  assert.ok(wheel.items[0].glowMaterial.uniforms.intensity.value > .99);
  assert.equal(wheel.items[1].material.color.r, 1);
  assert.equal(wheel.items[1].glow.visible, false);

  wheel.pointerMove({ pointerType: 'mouse', project: b });
  for (let frame = 61; frame <= 120; frame++) wheel.render(frame * 16.67);
  assert.equal(wheel.hoveredId, 'b');
  assert.ok(wheel.items[0].hover < .001);
  assert.ok(wheel.items[1].hover > .99);

  wheel.pointerMove({ pointerType: 'mouse' });
  for (let frame = 121; frame <= 180; frame++) wheel.render(frame * 16.67);
  assert.equal(wheel.hoveredId, null);
  assert.equal(wheel.stage.dataset.hoveredProject, '');
  assert.equal(wheel.canvas.style.cursor, 'grab');
  assert.equal(wheel.caption, b);
  assert.ok(wheel.items.every(item => item.hover < .001));
  assert.equal(wheel.stage.dataset.motion, 'idle');
});

test('reduced motion switches illumination immediately and inactive cards cannot remain lit', () => {
  const { wheel } = makeWheel(undefined, true);
  const item = wheel.makeItem(project('a'));
  item.active = true;
  wheel.items = [item];
  wheel.setHovered(item.project);
  wheel.render(16.67);
  assert.equal(item.hover, 1);
  assert.equal(item.glowMaterial.uniforms.intensity.value, 1);
  item.active = false;
  wheel.render(33.34);
  assert.equal(item.hover, 0);
  assert.equal(item.glow.visible, false);
  assert.equal(item.mesh.visible, false);
});

test('halo cannot intercept clicks and both cover faces remain independently readable', () => {
  const { wheel } = makeWheel();
  const item = wheel.makeItem(project('a'));
  const intersections = [];
  item.glow.raycast(new THREE.Raycaster(), intersections);
  assert.equal(intersections.length, 0);
  assert.equal(item.glowMaterial.depthWrite, false);
  assert.equal(item.material.side, THREE.FrontSide);
  assert.equal(item.mesh.children[0].rotation.y, Math.PI);
  assert.equal(item.mesh.children[0].userData.project, item.project);
});
