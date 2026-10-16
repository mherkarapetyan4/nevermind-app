import * as THREE from './assets/three.mjs';

const stage = document.querySelector('#mascot-stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
let storyFlip = 0, storyCross = 0;
window.addEventListener('nevermind-scroll', event => { storyFlip = event.detail.flip; storyCross = event.detail.cross; });
window.addEventListener('nevermind-motion', event => { paused = event.detail.paused; });

async function start() {
  const response = await fetch(new URL('./assets/mascot-geometry.json', import.meta.url));
  if (!response.ok) throw new Error('Mascot unavailable');
  const data = await response.json();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  // Sharp at the size the scroll scene shows it: base density times its current CSS scale.
  const pixelRatioFor = () => Math.min(4, Math.ceil(Math.min(devicePixelRatio, 2) * Math.max(1, parseFloat(stage.dataset.scale) || 1) * 4) / 4);
  let pixelRatio = pixelRatioFor();
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 100);
  camera.position.set(0, 1.65, 7.4);
  camera.lookAt(0, 1.45, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x857869, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-3, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.9);
  rim.position.set(4, 3, -2);
  scene.add(rim);
  const model = new THREE.Group();
  scene.add(model);
  const pivot = new THREE.Group();
  model.add(pivot);
  pivot.position.y = -1.4;
  model.position.y = 1.4;
  const meshResponse = await fetch(new URL('./assets/mascot.bin', import.meta.url));
  if (!meshResponse.ok) throw new Error('Mascot mesh unavailable');
  const binary = await meshResponse.arrayBuffer();
  const floats = data.vertexCount * 3;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(binary, 0, floats), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(binary, floats * 4, floats), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(binary, floats * 8, data.indexCount), 1));
  const body = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: 0xe8cda9, roughness: .64, metalness: 0, clearcoat: .08, clearcoatRoughness: .6 }));
  pivot.add(body);
  const eyes = [];
  const eyeMaterial = new THREE.MeshBasicMaterial({color: 0x17130d});
  data.eyes.forEach(position => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), eyeMaterial);
    eye.position.set(...position);
    eye.scale.set(.054, .106, .03);
    eye.rotation.z = .12;
    eyes.push(eye);
    pivot.add(eye);
  });
  const resize = () => {
    // Layout dimensions stay stable while the canvas is scaled by the scroll scene.
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  new ResizeObserver(resize).observe(stage);
  resize();
  stage.classList.add('loaded');
  let visible = true;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '80px' }).observe(stage);
  const pointer = { x: 0, y: 0 };
  document.querySelector('.hero').addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const rect = stage.getBoundingClientRect();
    pointer.x = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / rect.width));
    pointer.y = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / rect.height));
  });
  document.querySelector('.hero').addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });
  let elapsed = 0, last = performance.now(), celebration = -10;
  window.addEventListener('nevermind-complete', () => { if (!paused) celebration = elapsed; });
  let frame;
  function tick(now) {
    frame = requestAnimationFrame(tick);
    const delta = Math.min((now - last) / 1000, .05);
    last = now;
    if (!visible || document.hidden) return;
    if (pixelRatioFor() !== pixelRatio) { pixelRatio = pixelRatioFor(); renderer.setPixelRatio(pixelRatio); resize(); }
    if (!paused) elapsed += delta;
    const time = elapsed;
    const jump = Math.max(0, 1 - (time - celebration) / 1.1);
    // The somersault is locked to scroll position, so reversing scroll reverses the flip.
    const flip = storyFlip;
    const cross = storyCross;
    model.rotation.x = -Math.PI*2*flip + (paused ? 0 : pointer.y*.08-.035);
    model.rotation.z = -.08 + (paused ? 0 : Math.sin(time*.75)*.04) + Math.sin(cross*Math.PI)*.28;
    model.position.y = 1.4 + (paused ? 0 : Math.sin(time*1.35)*.07) + Math.sin((1-jump)*Math.PI)*jump*.65;
    if (!paused) {
      model.position.x = 0;
      model.rotation.y += ((pointer.x * .34 + Math.sin(time * .5) * .1) - model.rotation.y) * .05;
      const blink = Math.max(0, 1 - Math.abs((time % 5.3) - 4.8) / .12);
      eyes.forEach(eye => { eye.scale.y = .106 * Math.max(.08, 1-blink); });
    }
    renderer.render(scene, camera);
  }
  tick(performance.now());
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); renderer.dispose(); }, {once:true});
}
start().catch(() => { /* The bundled mascot image remains visible without WebGL. */ });
