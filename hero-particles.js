(function () {
  'use strict';

  const host = document.querySelector('.opening-copy');
  const canvas = document.getElementById('hero-particle-canvas');
  if (!host || !canvas || !window.THREE) return;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const vertexShader = `
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aSeed;
    uniform float uTime;
    uniform float uScroll;
    uniform float uPixelRatio;
    uniform float uShapeX;
    uniform vec2 uPointer;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec3 p = position;
      float turn = sin(uTime * 0.28) * 0.23 + uScroll * 0.62;
      float c = cos(turn);
      float s = sin(turn);
      p.xz = mat2(c, -s, s, c) * p.xz;
      p.y += sin(uTime * 0.42 + aSeed * 18.0 + p.x * 1.7) * 0.085;
      p.x *= uShapeX;
      p.x -= uScroll * (1.65 * uShapeX);
      p.y += uScroll * 0.46;

      vec2 away = p.xy - uPointer;
      float reach = exp(-dot(away, away) * 1.8);
      p.xy += normalize(away + vec2(0.001)) * reach * 0.42;

      vec4 view = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * view;
      gl_PointSize = clamp(aSize * uPixelRatio * (1.0 + p.z * 0.12), 3.0, 15.0);
      vColor = aColor;
      float textSpace = smoothstep(1.4, 3.0, length(vec2(p.x * 0.7, p.y * 1.5)));
      vAlpha = clamp(0.48 + p.z * 0.16, 0.2, 0.95) * mix(0.18, 1.0, textSpace) * (1.0 - uScroll * 0.3);
    }
  `;
  const fragmentShader = `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vAlpha;

    float segmentDistance(vec2 p, vec2 a, vec2 b) {
      vec2 line = b - a;
      float t = clamp(dot(p - a, line) / dot(line, line), 0.0, 1.0);
      return length(p - a - line * t);
    }

    void main() {
      vec2 p = gl_PointCoord - vec2(0.5);
      vec2 top = vec2(0.0, -0.38);
      vec2 left = vec2(-0.36, 0.3);
      vec2 right = vec2(0.36, 0.3);
      float edge = min(segmentDistance(p, top, left),
        min(segmentDistance(p, left, right), segmentDistance(p, right, top)));
      float line = 1.0 - smoothstep(0.045, 0.12, edge);
      gl_FragColor = vec4(vColor, line * vAlpha * uOpacity);
    }
  `;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
  } catch {
    canvas.hidden = true;
    return;
  }
  renderer.setClearColor(0x0b0d10, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3.2, 3.2, 3.2, -3.2, 0.1, 100);
  camera.position.z = 12;
  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uPixelRatio: { value: 1 },
    uShapeX: { value: 1 },
    uPointer: { value: new THREE.Vector2(100, 100) },
    uOpacity: { value: 1 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });

  let points;
  let visible = true;
  let frame = 0;
  let last = 0;
  let scrollTarget = 0;
  const pointerTarget = new THREE.Vector2(100, 100);
  const clock = new THREE.Clock();
  const palette = [
    new THREE.Color('#f4f1e8'),
    new THREE.Color('#f0b73a'),
    new THREE.Color('#a96de5'),
    new THREE.Color('#43b9ae'),
    new THREE.Color('#ee7e67')
  ];

  function random(seed) {
    const next = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
    return next - Math.floor(next);
  }

  // A side-profile silhouette: cortex, cerebellum and brainstem stay distinct.
  const brainRegions = [
    {
      name: 'cortex', share: 0.77, bounds: [78, 108, 662, 500],
      outline: [
        [80, 346], [86, 299], [104, 257], [128, 225], [142, 193],
        [180, 178], [207, 151], [246, 139], [279, 128], [314, 134],
        [349, 113], [384, 109], [419, 121], [457, 116], [486, 130],
        [520, 132], [553, 151], [582, 177], [605, 207], [625, 237],
        [638, 277], [652, 310], [659, 348], [649, 389], [629, 416],
        [597, 425], [568, 412], [536, 421], [507, 412], [474, 431],
        [439, 444], [403, 440], [374, 458], [344, 469], [316, 466],
        [285, 489], [252, 500], [228, 491], [208, 469], [205, 438],
        [176, 428], [143, 431], [111, 415], [89, 390]
      ]
    },
    {
      name: 'cerebellum', share: 0.17, bounds: [411, 409, 633, 565],
      outline: [
        [416, 458], [445, 432], [482, 421], [526, 415], [568, 414],
        [607, 425], [626, 449], [632, 481], [623, 512], [601, 539],
        [566, 559], [527, 563], [490, 552], [459, 534], [433, 508],
        [412, 483]
      ]
    },
    {
      name: 'stem', share: 0.06, bounds: [421, 475, 516, 634],
      outline: [
        [421, 477], [453, 492], [480, 517], [486, 550], [496, 583],
        [509, 627], [480, 634], [468, 601], [451, 565], [432, 534]
      ]
    }
  ];

  function insideOutline(x, y, outline) {
    let inside = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i];
      const b = outline[j];
      if ((a[1] > y) !== (b[1] > y) &&
          x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  function outlineDistance(x, y, outline) {
    let nearest = Infinity;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i];
      const b = outline[(i + 1) % outline.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
      nearest = Math.min(nearest, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
    }
    return nearest;
  }

  function buildParticles(count) {
    if (points) {
      scene.remove(points);
      points.geometry.dispose();
    }
    const floaters = Math.round(count * 0.055);
    const total = count + floaters;
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const seeds = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const r1 = random(i * 5 + 1);
      const r2 = random(i * 5 + 2);
      const r3 = random(i * 5 + 3);
      const r4 = random(i * 5 + 4);
      if (i < count) {
        const region = i / count < brainRegions[0].share ? brainRegions[0] :
          i / count < brainRegions[0].share + brainRegions[1].share ? brainRegions[1] : brainRegions[2];
        const [left, top, right, bottom] = region.bounds;
        let x = left;
        let y = top;
        for (let attempt = 0; attempt < 48; attempt++) {
          x = left + random(i * 73 + attempt * 2 + 11) * (right - left);
          y = top + random(i * 73 + attempt * 2 + 12) * (bottom - top);
          if (insideOutline(x, y, region.outline)) break;
        }
        const edge = outlineDistance(x, y, region.outline);
        const fold = region.name === 'cortex' ?
          Math.sin(x * 0.075 + Math.sin(y * 0.035) * 1.7) * Math.sin(y * 0.09 + Math.cos(x * 0.03) * 1.5) :
          Math.sin(y * 0.17 + x * 0.045);
        const furrow = Math.abs(fold);
        const boundaryLight = Math.exp(-edge / 12);
        positions[i * 3] = (x - 370) / 105;
        positions[i * 3 + 1] = (350 - y) / 140;
        positions[i * 3 + 2] = (region.name === 'cortex' ? 0.7 : 0.42) + fold * 0.18 + (r3 - 0.5) * 0.45;
        const band = region.name === 'cerebellum' ? Math.floor((r2 * 2 + 0.4) % palette.length) :
          Math.floor((r1 * 2 + r3 * 3 + Math.max(0, fold) * 1.8) % palette.length);
        const color = palette[band];
        const brightness = (0.36 + furrow * 0.38 + boundaryLight * 0.45) *
          (region.name === 'stem' ? 0.64 : 1);
        colors[i * 3] = color.r * brightness;
        colors[i * 3 + 1] = color.g * brightness;
        colors[i * 3 + 2] = color.b * brightness;
      } else {
        positions[i * 3] = (r1 - 0.5) * 11;
        positions[i * 3 + 1] = (r2 - 0.5) * 6.1;
        positions[i * 3 + 2] = -1.4 + r3 * 1.7;
        const color = palette[Math.floor(r4 * palette.length)];
        colors[i * 3] = color.r * 0.5;
        colors[i * 3 + 1] = color.g * 0.5;
        colors[i * 3 + 2] = color.b * 0.5;
      }
      sizes[i] = i < count ? 5.5 + r4 * 4 : 5 + r4 * 6;
      seeds[i] = r3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    points = new THREE.Points(geometry, material);
    scene.add(points);
  }

  function measure() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.left = -3.2 * width / height;
    camera.right = 3.2 * width / height;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = ratio;
    uniforms.uShapeX.value = Math.min(1, Math.max(0.56, width / height / 1.7));
    const count = width < 600 ? 2200 : width < 900 ? 3500 : 6000;
    if (!points || points.geometry.getAttribute('position').count !== count + Math.round(count * 0.055)) {
      buildParticles(count);
    }
    renderer.render(scene, camera);
  }

  function updateScroll() {
    const rect = host.getBoundingClientRect();
    scrollTarget = Math.max(0, Math.min(1, -rect.top / rect.height));
  }

  function animate(now) {
    frame = 0;
    if (!visible || motionPreference.matches) return;
    if (now - last >= 30) {
      last = now;
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uScroll.value += (scrollTarget - uniforms.uScroll.value) * 0.07;
      uniforms.uPointer.value.lerp(pointerTarget, 0.08);
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
  }

  function schedule() {
    if (visible && !motionPreference.matches && !frame) frame = requestAnimationFrame(animate);
  }

  host.addEventListener('pointermove', event => {
    if (motionPreference.matches || event.pointerType === 'touch') return;
    const rect = host.getBoundingClientRect();
    pointerTarget.set((event.clientX - rect.left - rect.width / 2) / rect.height * 6.4,
      (rect.height / 2 - event.clientY + rect.top) / rect.height * 6.4);
  }, { passive: true });
  host.addEventListener('pointerleave', () => pointerTarget.set(100, 100));
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      uniforms.uTime.value = 0;
      uniforms.uScroll.value = 0;
      uniforms.uPointer.value.set(100, 100);
      renderer.render(scene, camera);
    } else {
      clock.start();
      schedule();
    }
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    schedule();
  }, { threshold: 0 }).observe(host);
  new ResizeObserver(measure).observe(host);
  measure();
  updateScroll();
  schedule();
})();
