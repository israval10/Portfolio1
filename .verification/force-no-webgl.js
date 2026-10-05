// Test-only harness: exercise the production fallback without changing browser settings.
window.THREE.WebGLRenderer = function () { throw new Error('Simulated WebGL unavailable'); };
