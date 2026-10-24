import * as THREE from 'three';
import { RoomEnvironment } from '../assets/vendor/three/RoomEnvironment.js';
import { drawQrCanvas } from './qr.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* En móviles y equipos modestos usamos vidrio sin refracción (mucho más barato)
   y limitamos la resolución y los FPS. */
const LOW_POWER = window.matchMedia('(max-width: 820px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const MAX_DPR = LOW_POWER ? 1.2 : 1.5;
const TARGET_FPS = 30;

/* ───────────────────────── helpers ───────────────────────── */

function rendererFor(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !LOW_POWER,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

function sizeOf(canvas) {
  const w = Math.max(canvas.clientWidth, 1);
  const h = Math.max(canvas.clientHeight, 1);
  return { w, h };
}

function fitCamera(camera, renderer, canvas) {
  const { w, h } = sizeOf(canvas);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function envFor(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  pmrem.dispose();
  return env.texture;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tracked(ctx, text, cx, y, tracking) {
  ctx.save();
  ctx.textAlign = 'left';
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  ctx.restore();
}

function paperTexture(w, h, draw) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function radialTexture(inner = 'rgba(255,255,255,.95)', outer = 'rgba(255,255,255,0)') {
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Halo del estudio: se desvanece antes del borde del plano para no dejar
   un rectángulo visible sobre el fondo de la página. */
function haloTexture() {
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, 'rgba(255,252,242,.92)');
  g.addColorStop(0.38, 'rgba(255,252,242,.62)');
  g.addColorStop(0.72, 'rgba(255,252,242,0)');
  g.addColorStop(1, 'rgba(255,252,242,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function leafShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.30, 0.20, 0.36, 0.66, 0.05, 1.0);
  s.bezierCurveTo(-0.12, 0.62, -0.14, 0.24, 0, 0);
  return s;
}

function leafMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0,
    side: THREE.DoubleSide,
    ...opts
  });
}

function dragControl(canvas, state) {
  let id = null;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    state.dragging = true;
    state.velocity = 0;
    canvas.setPointerCapture(id);
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    state.pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;

    if (!state.dragging || e.pointerId !== id) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    state.rotation += dx * 0.011;
    state.tilt = THREE.MathUtils.clamp(state.tilt + dy * 0.004, -0.16, 0.16);
    state.velocity = dx * 0.011;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  const end = (e) => {
    if (e.pointerId !== id) return;
    state.dragging = false;
    canvas.style.cursor = 'grab';
    try { canvas.releasePointerCapture(id); } catch { /* noop */ }
    id = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!state.dragging) { state.pointer.x = 0; state.pointer.y = 0; } });
}

function mountLoop(canvas, renderer, scene, camera, update) {
  let visible = false;
  let raf = 0;
  let lastFrame = 0;
  const clock = new THREE.Clock();

  const tick = (now = performance.now()) => {
    raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    if (now - lastFrame < 1000 / TARGET_FPS) return;
    lastFrame = now;
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  };

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) clock.getDelta();
  }, { threshold: 0.02 });
  io.observe(canvas);

  const ro = new ResizeObserver(() => fitCamera(camera, renderer, canvas));
  ro.observe(canvas);

  fitCamera(camera, renderer, canvas);
  tick();

  return {
    stop() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); }
  };
}

/* ───────────────────────── etiqueta ─────────────────────────
   La etiqueta rodea la botella 360°. El diseño se centra en u≈0.433
   para que quede de frente con el giro inicial de la botella. */

function labelTexture() {
  return paperTexture(1536, 768, (ctx) => {
    ctx.scale(0.75, 0.75);
    const W = 2048;
    ctx.fillStyle = '#F7F5EC';
    ctx.fillRect(0, 0, W, 1024);

    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * W;
      const y = Math.random() * 1024;
      ctx.fillStyle = `rgba(27,61,43,${Math.random() * 0.05})`;
      ctx.fillRect(x, y, Math.random() * 2 + 0.4, Math.random() * 2 + 0.4);
    }

    const cx = W * 0.55;
    const bandY = 764;

    // filete superior
    ctx.strokeStyle = 'rgba(27,61,43,.3)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 175, 112);
    ctx.lineTo(cx + 175, 112);
    ctx.stroke();

    ctx.fillStyle = '#5B8A4B';
    ctx.font = '500 23px Montserrat, sans-serif';
    ctx.textBaseline = 'alphabetic';
    tracked(ctx, 'FERTILIZANTE FOLIAR ORGÁNICO', cx, 156, 6);

    // isotipo
    const k = 1.16;
    const oy = 288;
    ctx.save();
    ctx.translate(cx, oy);
    ctx.strokeStyle = '#1B3D2B';
    ctx.lineWidth = 4.2 * k;
    ctx.beginPath();
    ctx.arc(0, 0, 48 * k, -Math.PI / 2 + 0.36, -Math.PI / 2 - 0.36 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(cx - 60 * k, oy - 60 * k);
    ctx.scale(k, k);
    ctx.fillStyle = '#1B3D2B';
    ctx.fill(new Path2D('M60 84C46 78 32 60 35 33c15 7 25 29 25 51Z'));
    ctx.fillStyle = '#5B8A4B';
    ctx.fill(new Path2D('M61 84c7-14 21-24 27-38 6 14-6 34-27 38Z'));
    ctx.strokeStyle = '#A7B894';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(60, 84);
    ctx.bezierCurveTo(53, 68, 45, 48, 38, 38);
    ctx.stroke();
    ctx.fillStyle = '#5B8A4B';
    ctx.fill(new Path2D('M62 10c0 6 7 10 7 16a7 7 0 1 1-14 0c0-6 7-10 7-16Z'));
    ctx.restore();

    // wordmark
    ctx.fillStyle = '#1B3D2B';
    ctx.font = '600 82px Montserrat, sans-serif';
    tracked(ctx, 'ECO RESET', cx, 474, 4);

    ctx.fillStyle = '#5B8A4B';
    ctx.font = '500 21px Montserrat, sans-serif';
    tracked(ctx, 'ORGÁNICO FOLIAR', cx, 510, 10);

    ctx.strokeStyle = 'rgba(167,184,148,.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 92, 538);
    ctx.lineTo(cx + 92, 538);
    ctx.stroke();

    ctx.fillStyle = '#7A5A3E';
    ctx.font = '300 17px Poppins, sans-serif';
    tracked(ctx, 'NUTRICIÓN LÍQUIDA PARA PLANTAS DE CASA', cx, 574, 3);

    ctx.fillStyle = 'rgba(27,61,43,.4)';
    ctx.font = '300 11px Poppins, sans-serif';
    tracked(ctx, 'USO ORNAMENTAL · MANTENER FUERA DEL ALCANCE DE NIÑOS', cx, 626, 2);

    ctx.fillStyle = '#1B3D2B';
    ctx.font = '500 22px Montserrat, sans-serif';
    tracked(ctx, 'CONTENIDO NETO · 1000 ml', cx, 692, 4);

    // banda inferior
    ctx.fillStyle = '#1B3D2B';
    ctx.fillRect(0, bandY, W, 1024 - bandY);

    // bloque central
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F7F5EC';
    ctx.font = '500 30px Montserrat, sans-serif';
    tracked(ctx, 'DILUIR 15 ml', cx, 846, 4);
    ctx.fillStyle = 'rgba(247,245,236,.65)';
    ctx.font = '300 20px Poppins, sans-serif';
    tracked(ctx, 'POR LITRO DE AGUA', cx, 880, 2);

    ctx.fillStyle = 'rgba(247,245,236,.32)';
    ctx.font = '300 12px Poppins, sans-serif';
    tracked(ctx, 'ECO RESET · GUATEMALA · PROTOTIPO 2026', cx, 982, 2);

    // QR real en la cara frontal
    const qrTarget = new URL('cuidado.html', window.location.href).href;
    drawQrCanvas(ctx, qrTarget, 1300, 818, 126, '#1B3D2B');

    ctx.fillStyle = 'rgba(247,245,236,.7)';
    ctx.font = '500 12px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    tracked(ctx, 'SCAN & CARE', 1363, 972, 3);

    // textos laterales suaves
    ctx.save();
    ctx.translate(64, 620);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(91,138,75,.42)';
    ctx.font = '500 14px Montserrat, sans-serif';
    tracked(ctx, 'ECO RESET · ORGÁNICO FOLIAR · GUATEMALA', 0, 0, 5);
    ctx.restore();

    ctx.save();
    ctx.translate(W - 64, 620);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(91,138,75,.42)';
    ctx.font = '500 14px Montserrat, sans-serif';
    tracked(ctx, 'ECO RESET · ORGÁNICO FOLIAR · GUATEMALA', 0, 0, 5);
    ctx.restore();
  });
}

/* ───────────────────────── botella ───────────────────────── */

function buildBottle() {
  const group = new THREE.Group();

  const glassMat = LOW_POWER
    ? new THREE.MeshPhysicalMaterial({
        color: 0xF7F0E2,
        metalness: 0,
        roughness: 0.07,
        transmission: 0,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.8,
        side: THREE.DoubleSide
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0xF7F0E2,
        metalness: 0,
        roughness: 0.045,
        transmission: 1,
        thickness: 0.4,
        ior: 1.46,
        attenuationColor: new THREE.Color(0xBE8B52),
        attenuationDistance: 5.6,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.9,
        transparent: true
      });

  const glassPts = [
    [0.00, 0.00], [0.42, 0.00], [0.53, 0.02], [0.585, 0.08], [0.60, 0.18],
    [0.605, 0.62], [0.605, 1.52], [0.598, 1.80], [0.575, 1.98], [0.50, 2.18],
    [0.41, 2.32], [0.325, 2.42], [0.262, 2.50], [0.245, 2.58], [0.243, 2.86],
    [0.256, 2.90], [0.256, 2.96], [0.205, 2.97]
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const glass = new THREE.Mesh(new THREE.LatheGeometry(glassPts, 72), glassMat);
  group.add(glass);

  const liquidMat = LOW_POWER
    ? new THREE.MeshStandardMaterial({ color: 0x2F5520, roughness: 0.35, metalness: 0 })
    : new THREE.MeshPhysicalMaterial({
        color: 0x2F5520,
        metalness: 0,
        roughness: 0.32,
        transmission: 0.25,
        thickness: 1.6,
        ior: 1.34,
        attenuationColor: new THREE.Color(0x1F3B16),
        attenuationDistance: 2,
        envMapIntensity: 0.9,
        transparent: true
      });

  const liquidPts = [
    [0.00, 0.035], [0.50, 0.035], [0.545, 0.10], [0.548, 1.90], [0.52, 2.05],
    [0.45, 2.16], [0.36, 2.22], [0.00, 2.22]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(liquidPts, 48), liquidMat);
  group.add(liquid);

  // etiqueta
  const tex = labelTexture();
  tex.anisotropy = 8;
  const labelMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.3
  });
  const labelGeo = new THREE.CylinderGeometry(0.622, 0.622, 1.52, 72, 1, true, -Math.PI, Math.PI * 2);
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.y = 1.06;
  group.add(label);
  // cuello / collar
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.258, 0.258, 0.055, 48),
    new THREE.MeshPhysicalMaterial({ color: 0xE7E2D0, roughness: 0.55, metalness: 0.05, clearcoat: 0.4 })
  );
  collar.position.y = 2.985;
  group.add(collar);

  // cabezal atomizador
  const cap = new THREE.Group();
  const capMat = new THREE.MeshPhysicalMaterial({
    color: 0x466F3C,
    roughness: 0.5,
    metalness: 0.1,
    clearcoat: 0.55,
    clearcoatRoughness: 0.4
  });
  const capBody = new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.278, 0.46, 64), capMat);
  capBody.position.y = 0.23;
  cap.add(capBody);

  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.232, 0.272, 0.085, 64), capMat);
  capTop.position.y = 0.5;
  cap.add(capTop);

  const collarBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.286, 0.286, 0.05, 64),
    new THREE.MeshPhysicalMaterial({ color: 0xE7E2D0, roughness: 0.5, clearcoat: 0.4 })
  );
  collarBand.position.y = 0.025;
  cap.add(collarBand);

  const neckRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.268, 0.012, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0x2F4A2C, roughness: 0.5 })
  );
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = 0.055;
  cap.add(neckRing);

  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x243D24, roughness: 0.34, metalness: 0.45 });
  const nozzleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.1, 32), nozzleMat);
  nozzleBase.rotation.x = Math.PI / 2;
  nozzleBase.position.set(0, 0.36, 0.22);
  cap.add(nozzleBase);

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.058, 0.2, 32), nozzleMat);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0, 0.36, 0.35);
  cap.add(nozzle);

  const nozzleTip = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.01, 8, 24), nozzleMat);
  nozzleTip.position.set(0, 0.36, 0.45);
  cap.add(nozzleTip);

  // gatillo
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.24, 0.075),
    new THREE.MeshStandardMaterial({ color: 0x8CAA76, roughness: 0.55 })
  );
  trigger.position.set(0, 0.19, 0.25);
  trigger.rotation.x = -0.2;
  cap.add(trigger);

  cap.position.y = 3.0;
  cap.rotation.y = -0.55;
  group.add(cap);

  return { group, cap, labelMat };
}

function buildPedestal() {
  const g = new THREE.Group();

  const glass = LOW_POWER
    ? new THREE.MeshPhysicalMaterial({
        color: 0xEDEBDC,
        roughness: 0.1,
        metalness: 0,
        transmission: 0,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        envMapIntensity: 1.1
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0xEDEBDC,
        roughness: 0.08,
        metalness: 0,
        transmission: 0.96,
        thickness: 0.5,
        ior: 1.42,
        transparent: true,
        envMapIntensity: 1
      });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, 0.15, 80), glass);
  disc.position.y = -0.075;
  g.add(disc);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.185, 0.011, 10, 96),
    new THREE.MeshStandardMaterial({ color: 0xC7B08A, roughness: 0.35, metalness: 0.6 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.002;
  g.add(rim);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 5.4),
    new THREE.MeshBasicMaterial({
      map: radialTexture('rgba(11,26,17,.5)', 'rgba(11,26,17,0)'),
      transparent: true,
      depthWrite: false,
      opacity: 0.6
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.16;
  g.add(shadow);

  return g;
}

function buildLeaves() {
  const group = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(leafShape(), {
    depth: 0.012,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.004,
    bevelSegments: 2,
    curveSegments: 24
  });
  geo.center();

  const palette = [0x6E9459, 0x8FAF79, 0xA7B894, 0x4F7B3C, 0xC2CFAC];
  const leaves = [];

  for (let i = 0; i < 7; i++) {
    const mat = leafMaterial(palette[i % palette.length], {
      roughness: 0.62,
      transparent: true,
      opacity: i % 3 === 0 ? 0.75 : 0.95
    });
    const mesh = new THREE.Mesh(geo, mat);
    const side = i % 2 === 0 ? 1 : -1;
    mesh.position.set(
      side * (1.15 + Math.random() * 1.15),
      0.35 + Math.random() * 2.7,
      -0.9 + Math.random() * 2.1
    );
    const s = 0.34 + Math.random() * 0.34;
    mesh.scale.setScalar(s);
    mesh.rotation.set(
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 3,
      side * (0.5 + Math.random() * 0.8)
    );
    mesh.userData = {
      baseY: mesh.position.y,
      speed: 0.25 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.35
    };
    leaves.push(mesh);
    group.add(mesh);
  }
  return { group, leaves };
}

function buildDroplets() {
  const group = new THREE.Group();
  const mat = LOW_POWER
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 2 })
    : new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.02,
        metalness: 0,
        transmission: 1,
        thickness: 0.25,
        ior: 1.33,
        transparent: true,
        envMapIntensity: 1.6
      });
  const geo = new THREE.SphereGeometry(1, 16, 12);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(geo, mat);
    const r = 0.03 + Math.random() * 0.055;
    m.scale.setScalar(r);
    m.position.set(
      (Math.random() - 0.5) * 2.6,
      0.9 + Math.random() * 2.4,
      -0.6 + Math.random() * 1.8
    );
    m.userData = { baseY: m.position.y, phase: Math.random() * 6.28, amp: 0.06 + Math.random() * 0.1 };
    group.add(m);
  }
  return group;
}

export function initBottleScene(canvas) {
  const fallback = canvas.parentElement.querySelector('[data-stage-fallback]');
  let renderer;
  try {
    renderer = rendererFor(canvas);
  } catch (err) {
    if (fallback) fallback.hidden = false;
    canvas.style.display = 'none';
    return null;
  }

  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 2.05, 7.7);
  camera.lookAt(0, 1.62, 0);

  scene.add(new THREE.HemisphereLight(0xFFFDF5, 0x1B3D2B, 0.35));

  const key = new THREE.DirectionalLight(0xFFF2DC, 2.3);
  key.position.set(4.2, 7, 5.4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xB9D2A0, 1.7);
  rim.position.set(-5.5, 3.2, -4.2);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xFFFFFF, 0.55);
  fill.position.set(0, 2, 7);
  scene.add(fill);

  // halo suave: da cuerpo al vidrio y separa la botella del fondo
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshBasicMaterial({
      map: haloTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  halo.position.set(0, 1.7, -3.2);
  scene.add(halo);

  const bottle = buildBottle();
  bottle.group.position.y = 0.04;
  scene.add(bottle.group);

  scene.add(buildPedestal());

  const leaves = buildLeaves();
  scene.add(leaves.group);
  scene.add(buildDroplets());

  const dustGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(100 * 3);
  for (let i = 0; i < 100; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 7;
    positions[i * 3 + 1] = Math.random() * 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xF4EFDC, size: 0.025, transparent: true, opacity: 0.65, depthWrite: false })
  );
  scene.add(dust);

  const state = {
    rotation: 0,
    velocity: 0,
    tilt: 0,
    dragging: false,
    pointer: { x: 0, y: 0 }
  };
  dragControl(canvas, state);
  canvas.style.cursor = 'grab';

  const refreshLabel = () => {
    const old = bottle.labelMat.map;
    const tex = labelTexture();
    tex.anisotropy = 8;
    bottle.labelMat.map = tex;
    bottle.labelMat.needsUpdate = true;
    if (old) old.dispose();
  };

  const hint = document.getElementById('stageHint');
  if (hint) {
    const label = hint.innerHTML;
    canvas.addEventListener('pointerdown', () => { hint.innerHTML = label.replace('Girando · ', ''); }, { once: true });
  }

  let scrollP = 0;
  const onScroll = () => {
    scrollP = THREE.MathUtils.clamp(window.scrollY / Math.max(window.innerHeight * 0.9, 1), 0, 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const narrow = () => canvas.clientWidth < 620;
  const applyFraming = () => {
    camera.position.z = narrow() ? 8.7 : 7.7;
    camera.fov = narrow() ? 36 : 34;
    camera.updateProjectionMatrix();
  };
  applyFraming();
  new ResizeObserver(applyFraming).observe(canvas);

  mountLoop(canvas, renderer, scene, camera, (dt, t) => {
    if (!state.dragging) {
      state.rotation += state.velocity;
      state.velocity *= 0.94;
    }

    const sway = REDUCED ? 0 : Math.sin(t * 0.22) * 0.3;
    bottle.group.rotation.y = -0.42 + state.rotation + sway;
    bottle.group.rotation.x = state.tilt;
    bottle.group.position.y = 0.04 + (REDUCED ? 0 : Math.sin(t * 0.7) * 0.025) - scrollP * 0.45;

    leaves.leaves.forEach((leaf) => {
      const d = leaf.userData;
      leaf.position.y = d.baseY + (REDUCED ? 0 : Math.sin(t * d.speed + d.phase) * 0.16);
      leaf.rotation.y += REDUCED ? 0 : dt * d.spin * 0.30;
      leaf.rotation.z += REDUCED ? 0 : dt * d.spin * 0.10;
    });

    dust.rotation.y = t * 0.014;

    const px = state.pointer.x;
    const py = state.pointer.y;
    camera.position.x += ((px * 0.45) - camera.position.x) * 0.035;
    camera.position.y += ((2.05 - py * 0.22) - camera.position.y) * 0.035;
    camera.lookAt(0, 1.6, 0);
  });

  return { state, refreshLabel };
}

/* ───────────────────────── papel plantable ───────────────────────── */

function seedPaperTexture() {
  return paperTexture(768, 960, (ctx) => {
    ctx.scale(0.75, 0.75);
    const W = 1024;
    const H = 1280;
    ctx.fillStyle = '#F3EFDF';
    ctx.fillRect(0, 0, W, H);

    // fibras
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      ctx.fillStyle = `rgba(122,90,62,${Math.random() * 0.07})`;
      ctx.fillRect(x, y, Math.random() * 3 + 0.5, Math.random() * 2 + 0.5);
    }

    // semillas visibles en el papel
    for (let i = 0; i < 70; i++) {
      const x = 60 + Math.random() * (W - 120);
      const y = 60 + Math.random() * (H - 120);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = 'rgba(90,66,44,.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(27,61,43,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(46, 46, W - 92, H - 92);
    ctx.strokeStyle = 'rgba(27,61,43,.16)';
    ctx.strokeRect(60, 60, W - 120, H - 120);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#5B8A4B';
    ctx.font = '500 22px Montserrat, sans-serif';
    tracked(ctx, 'ECO RESET · ENVOLTORIO PLANTABLE', W / 2, 122, 6);

    // isotipo
    ctx.save();
    ctx.translate(W / 2, 250);
    ctx.strokeStyle = '#1B3D2B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 58, -Math.PI / 2 + 0.36, -Math.PI / 2 - 0.36 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(W / 2 - 60, 190);
    ctx.scale(1, 1);
    ctx.fillStyle = '#1B3D2B';
    ctx.fill(new Path2D('M60 84C46 78 32 60 35 33c15 7 25 29 25 51Z'));
    ctx.fillStyle = '#5B8A4B';
    ctx.fill(new Path2D('M61 84c7-14 21-24 27-38 6 14-6 34-27 38Z'));
    ctx.fillStyle = '#5B8A4B';
    ctx.fill(new Path2D('M62 10c0 6 7 10 7 16a7 7 0 1 1-14 0c0-6 7-10 7-16Z'));
    ctx.restore();

    ctx.fillStyle = '#1B3D2B';
    ctx.font = '300 74px Fraunces, Georgia, serif';
    tracked(ctx, 'Planta este', W / 2, 470, 1);
    ctx.font = 'italic 300 84px Fraunces, Georgia, serif';
    ctx.fillStyle = '#5B8A4B';
    tracked(ctx, 'papel.', W / 2, 560, 1);

    ctx.fillStyle = 'rgba(22,40,29,.62)';
    ctx.font = '300 24px Poppins, sans-serif';
    tracked(ctx, 'Papel reciclado con semillas germinables.', W / 2, 618, 1);

    ctx.strokeStyle = 'rgba(167,184,148,.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 110, 660);
    ctx.lineTo(W / 2 + 110, 660);
    ctx.stroke();

    // pasos
    const steps = [
      ['01', 'HUMEDECE', 'el papel con agua'],
      ['02', 'PLANTA', 'bajo una capa fina de tierra'],
      ['03', 'CUIDA', 'luz indirecta y humedad']
    ];
    steps.forEach(([n, title, sub], i) => {
      const y = 760 + i * 150;
      ctx.fillStyle = 'rgba(27,61,43,.7)';
      ctx.font = '500 20px Montserrat, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(n, 150, y);
      ctx.fillStyle = '#1B3D2B';
      ctx.font = '600 26px Montserrat, sans-serif';
      tracked(ctx, title, 350, y - 2, 6);
      ctx.fillStyle = 'rgba(22,40,29,.55)';
      ctx.font = '300 21px Poppins, sans-serif';
      ctx.fillText(sub, 206, y + 34);
      ctx.strokeStyle = 'rgba(27,61,43,.14)';
      ctx.beginPath();
      ctx.moveTo(150, y + 62);
      ctx.lineTo(W - 150, y + 62);
      ctx.stroke();
    });
  });
}

export function initSeedScene(canvas) {
  const fallback = canvas.parentElement.querySelector('[data-stage-fallback]');
  let renderer;
  try {
    renderer = rendererFor(canvas);
  } catch (err) {
    if (fallback) fallback.hidden = false;
    canvas.style.display = 'none';
    return null;
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0.2, 1.75, 8.4);
  camera.lookAt(0, 1.45, 0);

  scene.add(new THREE.HemisphereLight(0xFFFCF0, 0x2C3F22, 0.7));
  const key = new THREE.DirectionalLight(0xFFF3DC, 2.4);
  key.position.set(4.5, 6.5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xAFC79A, 1.2);
  rim.position.set(-5, 3, -3);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  // maceta de barro
  const potMat = new THREE.MeshStandardMaterial({ color: 0xA9714B, roughness: 0.92, metalness: 0.02 });
  const potPts = [
    [0.00, 0.00], [0.42, 0.00], [0.50, 0.04], [0.55, 0.62], [0.62, 0.72],
    [0.66, 0.92], [0.70, 0.98], [0.70, 1.06], [0.62, 1.06], [0.60, 0.94],
    [0.53, 0.72], [0.46, 0.10], [0.00, 0.10]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 48), potMat);
  pot.position.set(-0.85, 0.02, 0.1);
  group.add(pot);

  const soil = new THREE.Mesh(
    new THREE.CircleGeometry(0.585, 48),
    new THREE.MeshStandardMaterial({ color: 0x3A2A1E, roughness: 1 })
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.set(-0.85, 0.94, 0.1);
  group.add(soil);

  // tallo
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.85, 0.94, 0.10),
    new THREE.Vector3(-0.80, 1.35, 0.06),
    new THREE.Vector3(-0.66, 1.62, 0.02),
    new THREE.Vector3(-0.56, 1.86, 0.00)
  ]);
  const stem = new THREE.Mesh(
    new THREE.TubeGeometry(stemCurve, 32, 0.018, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x5B8A4B, roughness: 0.7 })
  );
  group.add(stem);

  const leafGeo = new THREE.ExtrudeGeometry(leafShape(), {
    depth: 0.01,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.003,
    bevelSegments: 2,
    curveSegments: 20
  });
  leafGeo.center();

  const leafMatA = leafMaterial(0x6E9459, { roughness: 0.6 });
  const leafMatB = leafMaterial(0x4F7B3C, { roughness: 0.6 });

  [
    [-0.62, 1.72, 0.02, 0.55, 1.9, 0.5],
    [-0.50, 1.84, 0.03, 0.42, -1.8, 0.4],
    [-0.76, 1.48, 0.02, 0.38, 2.5, -0.3]
  ].forEach(([x, y, z, s, ry, rz], i) => {
    const leaf = new THREE.Mesh(leafGeo, i % 2 ? leafMatB : leafMatA);
    leaf.position.set(x, y, z);
    leaf.scale.setScalar(s);
    leaf.rotation.set(0.2, ry, rz);
    group.add(leaf);
  });

  // papel plantable
  const paperTex = seedPaperTexture();
  const paperGeo = new THREE.PlaneGeometry(2.05, 2.56, 28, 28);
  const pos = paperGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.cos(x * 1.5) * 0.06 + Math.sin(y * 2.2) * 0.02);
  }
  paperGeo.computeVertexNormals();

  const paperMat = new THREE.MeshStandardMaterial({
    map: paperTex,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide
  });
  const paper = new THREE.Mesh(paperGeo, paperMat);
  paper.position.set(0.72, 1.45, -0.15);
  paper.rotation.set(0.08, -0.42, 0.035);
  paper.scale.setScalar(1.02);
  group.add(paper);

  // semillas flotando
  const seedGeo = new THREE.SphereGeometry(0.035, 14, 10);
  const seedMat = new THREE.MeshStandardMaterial({ color: 0x6B4B31, roughness: 0.8 });
  const seeds = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(seedGeo, seedMat);
    s.scale.set(1, 0.55, 0.7);
    s.position.set(
      -0.4 + Math.random() * 2.2,
      0.8 + Math.random() * 2.1,
      -0.4 + Math.random() * 1.2
    );
    s.userData = { baseY: s.position.y, phase: Math.random() * 6.28, spin: Math.random() * 2 };
    seeds.push(s);
    group.add(s);
  }

  // sombra
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({
      map: radialTexture('rgba(70,54,38,.38)', 'rgba(70,54,38,0)'),
      transparent: true,
      depthWrite: false
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  shadow.position.x = -0.1;
  group.add(shadow);

  const state = { rotation: 0, velocity: 0, tilt: 0, dragging: false, pointer: { x: 0, y: 0 } };
  dragControl(canvas, state);
  canvas.style.cursor = 'grab';

  const applyFraming = () => {
    camera.position.z = canvas.clientWidth < 560 ? 9.6 : 8.4;
    camera.fov = canvas.clientWidth < 560 ? 36 : 32;
    camera.updateProjectionMatrix();
  };
  applyFraming();
  new ResizeObserver(applyFraming).observe(canvas);

  mountLoop(canvas, renderer, scene, camera, (dt, t) => {
    if (!state.dragging) {
      state.rotation += state.velocity;
      state.velocity *= 0.94;
    }
    if (!REDUCED) group.position.y = Math.sin(t * 0.6) * 0.02;
    group.rotation.y = -0.18 + state.rotation + (REDUCED ? 0 : Math.sin(t * 0.18) * 0.16);
    group.rotation.x = state.tilt;
    paper.rotation.z = 0.035 + (REDUCED ? 0 : Math.sin(t * 0.5) * 0.008);

    seeds.forEach((s) => {
      s.position.y = s.userData.baseY + (REDUCED ? 0 : Math.sin(t * 0.8 + s.userData.phase) * 0.05);
      s.rotation.y += REDUCED ? 0 : dt * s.userData.spin;
    });

    camera.position.x += ((0.2 + state.pointer.x * 0.4) - camera.position.x) * 0.04;
    camera.position.y += ((1.75 - state.pointer.y * 0.15) - camera.position.y) * 0.04;
    camera.lookAt(0, 1.4, 0);
  });

  const refreshPaper = () => {
    const old = paperMat.map;
    const next = seedPaperTexture();
    paperMat.map = next;
    paperMat.needsUpdate = true;
    if (old) old.dispose();
  };

  return { state, refreshPaper };
}
