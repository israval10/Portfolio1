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
      float textSpace = smoothstep(1.7, 3.3, length(vec2(p.x * 0.7, p.y * 1.5)));
      vAlpha = clamp(0.42 + p.z * 0.16, 0.18, 0.9) * mix(0.04, 1.0, textSpace) * (1.0 - uScroll * 0.3);
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
        const angle = r1 * Math.PI * 2;
        const tube = r2 * Math.PI * 2;
        const radius = 2.95 + Math.cos(tube) * (0.48 + r3 * 0.28);
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = Math.sin(angle) * radius * 0.68 + Math.sin(tube) * 0.15;
        positions[i * 3 + 2] = Math.sin(tube) * 0.95 + (r4 - 0.5) * 0.3;
      } else {
        positions[i * 3] = (r1 - 0.5) * 11;
        positions[i * 3 + 1] = (r2 - 0.5) * 6.1;
        positions[i * 3 + 2] = -1.4 + r3 * 1.7;
      }
      const band = i < count ? Math.floor((r1 * 2 + r2 * 3) % palette.length) : Math.floor(r4 * palette.length);
      const color = palette[band];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
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
    const count = width < 600 ? 1250 : width < 900 ? 1900 : 2800;
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
