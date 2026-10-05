(function () {
  'use strict';

  class ProjectWheel {
    constructor({ canvas, stage, onSelect, onActivate, onError }) {
      if (!window.THREE) throw new Error('Three.js unavailable');
      this.canvas = canvas;
      this.stage = stage;
      this.onSelect = onSelect;
      this.onActivate = onActivate;
      this.onError = onError;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.renderer.setClearColor(0xffffff, 0);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.group = new THREE.Group();
      this.scene.add(this.group);
      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.cache = new Map();
      this.items = [];
      this.angle = 0;
      this.targetAngle = 0;
      this.velocity = 0;
      this.frame = 0;
      this.enabled = true;
      this.inViewport = true;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.abort = new AbortController();
      const signal = this.abort.signal;
      canvas.addEventListener('pointerdown', event => this.pointerDown(event), { signal });
      canvas.addEventListener('pointermove', event => this.pointerMove(event), { signal });
      canvas.addEventListener('pointerup', event => this.pointerUp(event), { signal });
      canvas.addEventListener('pointercancel', () => this.cancelDrag(), { signal });
      canvas.addEventListener('lostpointercapture', () => this.cancelDrag(), { signal });
      canvas.addEventListener('pointerleave', () => {
        this.setHovered(null);
        if (!this.drag) canvas.style.cursor = 'grab';
      }, { signal });
      canvas.addEventListener('blur', () => this.setHovered(null), { signal });
      canvas.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          this.step(event.key === 'ArrowRight' ? 1 : -1);
          this.setHovered(this.selected);
        } else if (event.key === 'Enter' && this.selected) {
          event.preventDefault();
          this.onActivate(this.selected);
        }
      }, { signal });
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        this.setEnabled(false);
        this.onError();
      }, { signal });
      document.addEventListener('visibilitychange', () => this.requestFrame(), { signal });
      this.motionChange = () => { this.velocity = 0; this.requestFrame(); };
      this.reducedMotion.addEventListener('change', this.motionChange);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(stage);
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.inViewport = entries[0].isIntersecting;
        if (!this.inViewport) this.cancelFrame();
        else this.requestFrame();
      }, { threshold: 0 });
      this.intersectionObserver.observe(stage);
    }

    makeItem(project) {
      const surface = document.createElement('canvas');
      surface.width = 960;
      surface.height = 892;
      const context = surface.getContext('2d');
      const texture = new THREE.CanvasTexture(surface);
      texture.encoding = THREE.sRGBEncoding;
      texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      const paint = image => {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, surface.width, surface.height);
        if (image) {
          const scale = Math.max(surface.width / image.naturalWidth, surface.height / image.naturalHeight);
          const width = image.naturalWidth * scale;
          const height = image.naturalHeight * scale;
          const position = project.wheelCoverPosition || { x: .5, y: .5 };
          context.drawImage(image, (surface.width - width) * position.x, (surface.height - height) * position.y, width, height);
        } else {
          context.fillStyle = '#f1f3ee';
          context.fillRect(0, 0, 960, 892);
          context.fillStyle = '#20211f';
          context.font = '500 62px Arial';
          context.textBaseline = 'middle';
          const words = project.name.split(' ');
          const lines = [];
          let line = '';
          words.forEach(word => {
            const next = line ? line + ' ' + word : word;
            if (context.measureText(next).width > 800 && line) { lines.push(line); line = word; }
            else line = next;
          });
          lines.push(line);
          lines.forEach((text, i) => context.fillText(text, 70, 410 + (i - (lines.length - 1) / 2) * 78));
          context.font = '28px Arial';
          context.fillStyle = '#73796f';
          context.fillText(project.years.join(' / '), 70, 780);
        }
        texture.needsUpdate = true;
        this.requestFrame();
      };
      paint(null);
      const geometry = new THREE.PlaneGeometry(2.8, 2.6);
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.project = project;
      const back = new THREE.Mesh(geometry, material);
      back.rotation.y = Math.PI;
      back.userData.project = project;
      mesh.add(back);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: { intensity: { value: 0 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float intensity;
          void main() {
            vec2 edge = abs(vUv - 0.5) - vec2(0.5 / 1.16);
            float distance = length(max(edge, 0.0)) + min(max(edge.x, edge.y), 0.0);
            float halo = smoothstep(-0.004, 0.0, distance) * (1.0 - smoothstep(0.0, 0.065, distance));
            vec3 color = mix(vec3(0.72, 0.81, 0.76), vec3(1.0), 1.0 - smoothstep(0.0, 0.012, distance));
            gl_FragColor = vec4(color, halo * intensity * 0.65);
          }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
      });
      const glow = new THREE.Mesh(geometry, glowMaterial);
      glow.scale.setScalar(1.16);
      // The halo must not intercept hits intended for either face of the card.
      glow.raycast = () => {};
      mesh.add(glow);
      this.group.add(mesh);
      const item = { project, mesh, texture, geometry, material, glow, glowMaterial, hover: 0, active: false, baseAngle: 0, x: 0, z: 0 };
      this.cache.set(project.id, item);
      if (project.cover) {
        const image = new Image();
        image.onload = () => { paint(image); mesh.userData.loaded = true; this.updateLoadState(); };
        image.onerror = () => { mesh.userData.loaded = true; this.updateLoadState(); };
        image.src = project.cover;
      } else { mesh.userData.loaded = true; }
      return item;
    }

    setProjects(projects, selectedId) {
      this.cancelDrag();
      this.setHovered(null);
      this.velocity = 0;
      this.cache.forEach(item => { item.active = false; });
      this.items = projects.map(project => this.cache.get(project.id) || this.makeItem(project));
      const count = this.items.length;
      this.radius = count > 3 ? Math.max(3.2, Math.min(5.5, count * .37)) : 0;
      this.items.forEach((item, i) => {
        item.active = true;
        item.baseAngle = count > 3 ? i * Math.PI * 2 / count : 0;
        item.x = count > 3 ? Math.sin(item.baseAngle) * this.radius : (i - (count - 1) / 2) * 3.3;
        item.z = count > 3 ? Math.cos(item.baseAngle) * this.radius : 0;
      });
      const selected = this.items.find(item => item.project.id === selectedId) || this.items[0];
      this.selected = selected?.project || null;
      this.targetAngle = selected && count > 3 ? -selected.baseAngle : 0;
      if (this.reducedMotion.matches) this.angle = this.targetAngle;
      this.stage.dataset.projectCount = String(count);
      this.updateLoadState();
      this.resize();
      if (selected) this.onSelect(selected.project);
    }

    updateLoadState() {
      const ready = this.items.every(item => item.mesh.userData.loaded);
      this.stage.setAttribute('aria-busy', String(!ready));
      this.stage.dataset.state = ready ? 'ready' : 'loading';
      document.getElementById('wheel-loading').hidden = ready;
    }

    resize() {
      const width = this.stage.clientWidth;
      const height = this.stage.clientHeight;
      if (!width || !height) return;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.clearViewOffset();
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
      const elevation = .28;
      const distance = this.radius ? this.radius * 3 : 12;
      const points = [];
      if (this.radius) {
        // Fit every orientation of the ring, not just the initially selected card.
        for (let i = 0; i < 64; i++) {
          const a = i * Math.PI * 2 / 64;
          for (const dx of [-1.4, 1.4]) for (const y of [-1.3, 1.3]) {
            points.push(new THREE.Vector3(Math.sin(a) * (this.radius + dx), y, Math.cos(a) * (this.radius + dx)));
          }
        }
      } else {
        const edge = Math.max(0, (this.items.length - 1) / 2) * 3.3 + 1.4;
        for (const x of [-edge, edge]) for (const y of [-1.3, 1.3]) points.push(new THREE.Vector3(x, y, 0));
      }
      this.camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
      this.camera.lookAt(0, 0, 0);
      this.camera.updateMatrixWorld();
      const projected = points.map(point => point.clone().project(this.camera));
      const minX = Math.min(...projected.map(point => point.x));
      const maxX = Math.max(...projected.map(point => point.x));
      const minY = Math.min(...projected.map(point => point.y));
      const maxY = Math.max(...projected.map(point => point.y));
      this.camera.zoom = Math.min(1.8 / Math.max(.01, maxX - minX), 1.65 / Math.max(.01, maxY - minY));
      this.camera.setViewOffset(width, height, 0, -(minY + maxY) * this.camera.zoom * height / 4, width, height);
      this.camera.updateProjectionMatrix();
      this.requestFrame();
    }

    requestFrame() {
      if (!this.frame && this.enabled && this.inViewport && !document.hidden) this.frame = requestAnimationFrame(time => this.render(time));
    }

    cancelFrame() { cancelAnimationFrame(this.frame); this.frame = 0; }

    render(time) {
      this.frame = 0;
      if (!this.enabled || !this.inViewport || document.hidden) return;
      const dt = Math.min(2, Math.max(.1, (time - (this.lastTime || time - 16)) / 16.67));
      this.lastTime = time;
      const reduced = this.reducedMotion.matches;
      const ease = reduced ? 1 : 1 - Math.pow(.83, dt);
      if (!this.drag && Math.abs(this.velocity) > .0001 && !reduced) {
        this.targetAngle += this.velocity * dt;
        this.velocity *= Math.pow(.92, dt);
      }
      this.angle += (this.targetAngle - this.angle) * ease;
      let moving = Math.abs(this.targetAngle - this.angle) > .0001 || Math.abs(this.velocity) > .0001;
      this.cache.forEach(item => {
        const targetOpacity = item.active ? 1 : 0;
        item.material.opacity += (targetOpacity - item.material.opacity) * ease;
        if (Math.abs(targetOpacity - item.material.opacity) > .001) moving = true;
        const targetHover = item.active && this.hoveredId === item.project.id ? 1 : 0;
        item.hover += (targetHover - item.hover) * ease;
        if (Math.abs(targetHover - item.hover) > .001) moving = true;
        item.material.color.setScalar(1 + item.hover * .38);
        item.glowMaterial.uniforms.intensity.value = item.hover * item.material.opacity;
        item.glow.visible = item.hover > .001;
        item.mesh.visible = item.material.opacity > .005;
        if (!item.active) return;
        const angle = item.baseAngle + this.angle;
        const x = this.radius ? Math.sin(angle) * this.radius : item.x;
        const z = this.radius ? Math.cos(angle) * this.radius : 0;
        item.mesh.position.x += (x - item.mesh.position.x) * ease;
        item.mesh.position.z += (z - item.mesh.position.z) * ease;
        item.mesh.rotation.y = this.radius ? angle + Math.PI / 2 : 0;
        const scale = (!this.radius && this.selected?.id === item.project.id ? 1.04 : 1) + item.hover * .025;
        item.mesh.scale.setScalar(scale);
        if (Math.abs(x - item.mesh.position.x) + Math.abs(z - item.mesh.position.z) > .001) moving = true;
      });
      this.renderer.render(this.scene, this.camera);
      this.stage.dataset.motion = moving ? 'moving' : 'idle';
      if (moving) this.requestFrame();
    }

    pick(event) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      this.scene.updateMatrixWorld(true);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      return this.raycaster.intersectObjects(this.items.map(item => item.mesh), true)[0]?.object.userData.project;
    }

    select(project) {
      if (project && project.id !== this.selected?.id) {
        this.selected = project;
        this.onSelect(project);
        this.requestFrame();
      }
    }

    setHovered(project) {
      const id = project?.id || null;
      if (id === this.hoveredId) return;
      this.hoveredId = id;
      this.stage.dataset.hoveredProject = id || '';
      this.requestFrame();
    }

    step(direction) {
      if (!this.items.length) return;
      const index = this.items.findIndex(item => item.project.id === this.selected?.id);
      const item = this.items[(index + direction + this.items.length) % this.items.length];
      this.velocity = 0;
      if (this.radius) {
        const desired = -item.baseAngle;
        const delta = Math.atan2(Math.sin(desired - this.targetAngle), Math.cos(desired - this.targetAngle));
        this.targetAngle += delta;
      }
      this.select(item.project);
      this.requestFrame();
    }

    pointerDown(event) {
      if (event.button !== 0 || !this.items.length) return;
      this.velocity = 0;
      this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: performance.now(), moved: false };
    }

    pointerMove(event) {
      if (!this.press) {
        if (event.pointerType === 'mouse') {
          const project = this.pick(event);
          this.canvas.style.cursor = project ? 'pointer' : 'grab';
          this.setHovered(project);
          this.select(project);
        }
        return;
      }
      if (event.pointerId !== this.press.id) return;
      const dx = event.clientX - this.press.x;
      const dy = event.clientY - this.press.y;
      if (Math.hypot(dx, dy) > 7) this.press.moved = true;
      if (!this.drag && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) && this.radius) {
        this.drag = true;
        this.setHovered(null);
        this.canvas.classList.add('dragging');
        this.canvas.setPointerCapture(event.pointerId);
      }
      if (this.drag) {
        const now = performance.now();
        const delta = (event.clientX - this.press.lastX) * .007;
        this.targetAngle += delta;
        this.velocity = this.reducedMotion.matches ? 0 : Math.max(-.05, Math.min(.05, delta * 16.67 / Math.max(8, now - this.press.lastTime)));
        this.press.lastX = event.clientX;
        this.press.lastTime = now;
        this.requestFrame();
      }
    }

    pointerUp(event) {
      if (!this.press || event.pointerId !== this.press.id) return;
      const wasDrag = this.drag || this.press.moved;
      const project = wasDrag ? null : this.pick(event);
      const velocity = performance.now() - this.press.lastTime < 100 ? this.velocity : 0;
      this.cancelDrag();
      this.velocity = wasDrag ? velocity : 0;
      if (event.pointerType === 'mouse' && Math.abs(this.velocity) < .0001) this.setHovered(this.pick(event));
      if (project) { this.select(project); this.onActivate(project); }
      this.requestFrame();
    }

    cancelDrag() {
      const id = this.press?.id;
      this.drag = false;
      this.press = null;
      this.setHovered(null);
      this.canvas.classList.remove('dragging');
      if (id !== undefined && this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      this.setHovered(null);
      this.velocity = 0;
      if (!enabled) this.cancelFrame();
      else { this.lastTime = 0; this.resize(); this.requestFrame(); }
    }

    destroy() {
      this.cancelFrame();
      this.abort.abort();
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.reducedMotion.removeEventListener('change', this.motionChange);
      this.cache.forEach(item => { item.texture.dispose(); item.geometry.dispose(); item.material.dispose(); item.glowMaterial.dispose(); });
      this.renderer.dispose();
    }
  }

  window.ProjectWheel = ProjectWheel;
})();
