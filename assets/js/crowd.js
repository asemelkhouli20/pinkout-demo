// PinkOut Partners — the people in the venue, plus the stage show.
// Residents: one per activity spot from venue.js (sitting at the café, queueing for matcha, making at a station,
//   browsing a shop bay, doing yoga or dancing in class, watching the stage…), each moving the way that activity moves.
// Visitors: walk in through the Entrance passage (north door), spend a while in a few worlds, and leave through
//   the Exit passage (south door), then come round again. Outside the building they grow in / shrink away,
//   so nobody pops into or out of thin air.
// The stop on show (tour3d.js → setFocus) comes alive: now and then a heart or sparkle floats up from its people,
//   photo spots flash, a group walks in at the entrance or out through the exit, the stage fires confetti.
//   burst() pops the stop's own icons (cups, bags, notes…) once from a spot when its bubble appears.
// Always on: steam over the café counters, soft light beams and light pools at the stage, balloon bunches swaying at
//   each world's doorway (in its colours), sparkles in the air.
// People are two instanced meshes (bodies + heads), so a hundred people cost two draw calls; each effect is one more.
import * as THREE from './vendor/three.module.min.js?v=1';
import { toX, toZ, W, D, U, LOOK } from './venue.js?v=30';

const OUTFITS = ['#ff3d8b', '#2b1220', '#ffffff', '#ff8fb8', '#ddcffb', '#2b1220', '#fff0aa', '#c7efdf', '#df004c', '#ffd9c2', '#2b1220', '#f6d3dd'];
const SKIN = ['#f1c7a8', '#d9a37f', '#b97f5c', '#e8b896'];
const SCARF = ['#2b1220', '#f6d3dd', '#ddcffb', '#f4f4f4', '#e98fb0'];
const HAIR = ['#2b1a14', '#3b2318', '#1c1210', '#5a3a24', '#7a4a2a'];
const BAGS = ['#e6c47e', '#ff3d8b', '#ffffff', '#2b1220', '#df004c', '#ddcffb'];
/* headwear for themed days: parts placed on the head (head centre = origin, +z = the way she faces) */
const HATS = {
  crown: [{ geo: () => new THREE.CylinderGeometry(0.05, 0.056, 0.05, 7, 1, true), color: '#e6c47e', metal: true, at: [0, 0.078, 0] }],
  witch: [{ geo: () => new THREE.ConeGeometry(0.068, 0.17, 12), color: '#2b1a3a', at: [0, 0.14, -0.01], rx: -0.25 },
    { geo: () => new THREE.CylinderGeometry(0.125, 0.125, 0.008, 20), color: '#2b1a3a', at: [0, 0.06, 0] },
    { geo: () => new THREE.TorusGeometry(0.07, 0.008, 6, 20), color: '#ff7a1a', at: [0, 0.07, 0], rx: Math.PI / 2 }],
  nightcap: [{ geo: () => new THREE.ConeGeometry(0.078, 0.18, 12), color: '#b9a8ff', at: [0, 0.11, -0.03], rx: -0.75 },
    { geo: () => new THREE.SphereGeometry(0.025, 8, 6), color: '#ffffff', at: [0, 0.15, -0.12] }],
  ears: [{ geo: () => new THREE.ConeGeometry(0.03, 0.065, 4), color: '#ffb7c9', at: [-0.045, 0.075, 0], rz: 0.35 },
    { geo: () => new THREE.ConeGeometry(0.03, 0.065, 4), color: '#ffb7c9', at: [0.045, 0.075, 0], rz: -0.35 }],
  beanie: [{ geo: () => new THREE.SphereGeometry(0.084, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), color: '#a0302a', at: [0, 0.012, 0] },
    { geo: () => new THREE.SphereGeometry(0.024, 8, 6), color: '#f3e6c8', at: [0, 0.1, 0] }],
  headband: [{ geo: () => new THREE.TorusGeometry(0.079, 0.012, 8, 24), color: '#29e3ff', glow: true, at: [0, 0.035, -0.005], rx: Math.PI / 2 - 0.35 }],
  glasses: [{ geo: () => new THREE.BoxGeometry(0.11, 0.028, 0.012), color: '#1b1b1f', at: [0, 0.012, 0.07] },
    { geo: () => new THREE.BoxGeometry(0.036, 0.018, 0.004), color: '#e0182d', glow: true, at: [-0.026, 0.012, 0.077] },
    { geo: () => new THREE.BoxGeometry(0.036, 0.018, 0.004), color: '#29e3ff', glow: true, at: [0.026, 0.012, 0.077] }],
  band: [{ geo: () => new THREE.TorusGeometry(0.084, 0.01, 6, 24), color: '#e6c47e', metal: true, at: [0, 0.03, -0.01], rx: Math.PI / 2 - 0.25 }],
};
const CONFETTI = ['#ff3d8b', '#ffffff', '#ff8fb8', '#fff0aa', '#ddcffb', '#c7efdf', '#e6c47e', '#df004c'];
const BADGES = ['#ffffff', '#ffd6e6', '#ddcffb', '#fff0aa', '#c7efdf'];
/* the icon sheet: cell, look (badge = a white sticker with a dark glyph, tinted pastel), tints, size in scene units */
const ICONS = {
  heart: { cell: 0, tints: ['#ff3d8b', '#df004c', '#ff8fb8'], size: 0.17 },
  sparkle: { cell: 1, tints: ['#ffe08a', '#ffffff', '#ffd6e6'], size: 0.16 },
  star: { cell: 2, tints: ['#ffe08a', '#ff8fb8', '#ffffff'], size: 0.19 },
  drop: { cell: 3, tints: ['#f6d7c3', '#c98d6b', '#df004c', '#ff8fb8', '#8a4a35', '#ddcffb'], size: 0.18 }, // shades
  camera: { cell: 4, tints: BADGES, size: 0.26 },
  cup: { cell: 5, tints: BADGES, size: 0.26 },
  bag: { cell: 6, tints: BADGES, size: 0.26 },
  gift: { cell: 7, tints: BADGES, size: 0.26 },
  note: { cell: 8, tints: BADGES, size: 0.26 },
};

/* The walking route (plan metres): in through the north door and the Entrance passage, out through the Exit passage */
const IN = [[2.8, -10], [2.8, 0.4], [2.8, 8], [2.8, 15.6], [4.4, 18.2], [9, 20.6], [21.5, 21.0]];
const OUT = [[21.5, 21.0], [9, 23.6], [4.4, 26.6], [2.8, 29.2], [2.8, 44.2], [2.8, 46.2], [2.8, 55]];
const HUB = [21.5, 21.0];
/* What a visitor does in each world: through its doorway, then stands a while in an area, facing what's on */
const VISITS = {
  make: { via: [[17.75, 13.2]], area: [[12, 23], [8.6, 9.6]], look: [null, 5] },
  market: { via: [[39.85, 13.2]], area: [[37.2, 42.6], [10.4, 11.4]], look: [null, 2] },
  live: { via: [], area: [[35.8, 36.3], [18.6, 24.4]], look: [47, null] },
  beauty: { via: [[37.1, 29.4]], area: [[33.5, 40.5], [32.2, 33.4]], look: [null, 40] },
  move: { via: [[14.8, 29.4]], area: [[11.5, 18], [32.0, 33.2]], look: [null, 38] },
  cafe: { via: [], area: [[25.6, 27.2], [23.0, 24.0]], look: [29.9, 20.6] },
  activation: { via: [], area: [[19.4, 19.9], [20.2, 22.4]], look: [15.5, 21.3] },
};
const VISIT_ZONE = { make: 'make', market: 'market', live: 'live', beauty: 'beauty', move: 'move', cafe: 'hub', activation: 'hub' };
/* Where the café steams (plan metres + height in metres): the espresso machine and the matcha bar */
const STEAM = [[27.8, 20.6, 1.75], [31.3, 21.3, 1.3]];
/* Balloon bunches beside each world's doorway (zone, plan metres) */
const BALLOONS = [['make', 24.7, 12.9], ['market', 33.8, 12.9], ['live', 43.4, 12.9], ['beauty', 31.6, 30.1], ['move', 10.2, 29.5], ['passage', 6.0, 16.9], ['passage', 6.0, 28.0]];
/* Confetti cannons at the front corners of the stage, firing over the audience (plan metres) */
const CANNONS = [[43.6, 16.2], [43.6, 26.8]];
const P = ([x, y]) => new THREE.Vector2(toX(x), toZ(y));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * Math.min(1, k); // shortest way round

/* soft round dot, and the icon sheet (3 × 3 cells of 64 px), drawn once */
function sprite(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}
export const dotTexture = () => sprite(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});
const iconSheet = () => sprite(192, 192, (g) => {
  const cell = (i, draw) => { g.save(); g.translate((i % 3) * 64, Math.floor(i / 3) * 64); draw(); g.restore(); };
  const badge = (draw) => () => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(43,18,32,0.18)'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = g.fillStyle = '#2b1220'; g.lineWidth = 3.5; g.lineCap = g.lineJoin = 'round';
    draw();
  };
  g.fillStyle = '#ffffff';
  cell(0, () => { g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 36, 6, 9, 21, 9); g.bezierCurveTo(27, 9, 31, 13, 32, 18); g.bezierCurveTo(33, 13, 37, 9, 43, 9); g.bezierCurveTo(58, 9, 60, 36, 32, 54); g.fill(); });
  cell(1, () => { g.beginPath(); g.moveTo(32, 6); g.quadraticCurveTo(35, 29, 58, 32); g.quadraticCurveTo(35, 35, 32, 58); g.quadraticCurveTo(29, 35, 6, 32); g.quadraticCurveTo(29, 29, 32, 6); g.fill(); });
  cell(2, () => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 11 : 26; g.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); } g.fill(); });
  cell(3, () => { g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(40, 20, 50, 30, 50, 40); g.arc(32, 40, 18, 0, Math.PI); g.bezierCurveTo(14, 30, 24, 20, 32, 6); g.fill(); });
  cell(4, badge(() => { g.strokeRect(17, 24, 30, 20); g.beginPath(); g.moveTo(25, 24); g.lineTo(28, 19); g.lineTo(36, 19); g.lineTo(39, 24); g.stroke(); g.beginPath(); g.arc(32, 34, 6, 0, Math.PI * 2); g.stroke(); }));
  cell(5, badge(() => { g.beginPath(); g.moveTo(20, 27); g.lineTo(23, 46); g.lineTo(37, 46); g.lineTo(40, 27); g.closePath(); g.stroke(); g.beginPath(); g.arc(42, 33, 5, -Math.PI / 2, Math.PI / 2); g.stroke(); [26, 33].forEach((x) => { g.beginPath(); g.moveTo(x, 22); g.quadraticCurveTo(x + 3, 18, x, 14); g.stroke(); }); }));
  cell(6, badge(() => { g.beginPath(); g.moveTo(19, 26); g.lineTo(45, 26); g.lineTo(47, 48); g.lineTo(17, 48); g.closePath(); g.stroke(); g.beginPath(); g.arc(32, 26, 7, Math.PI, 0); g.stroke(); }));
  cell(7, badge(() => { g.strokeRect(19, 30, 26, 18); g.strokeRect(17, 24, 30, 6); g.beginPath(); g.moveTo(32, 24); g.lineTo(32, 48); g.stroke(); g.beginPath(); g.ellipse(27, 20, 5, 3.5, 0.5, 0, Math.PI * 2); g.ellipse(37, 20, 5, 3.5, -0.5, 0, Math.PI * 2); g.stroke(); }));
  cell(8, badge(() => { g.beginPath(); g.ellipse(26, 43, 6, 4.5, -0.4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(31.5, 42); g.lineTo(31.5, 17); g.quadraticCurveTo(38, 22, 43, 27); g.stroke(); }));
});

/** A pool of camera-facing sprites with their own size (scene units), alpha, colour and (on a sheet) icon cell. */
export function particles(n, map, { blending = THREE.NormalBlending, grid = [1, 1] } = {}) {
  const geo = new THREE.BufferGeometry();
  const attr = (name, size) => { const a = new THREE.BufferAttribute(new Float32Array(n * size), size); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, a); return a; };
  const pool = { n, pos: attr('position', 3), size: attr('aSize', 1), alpha: attr('aAlpha', 1), color: attr('aColor', 3), icon: attr('aIcon', 1) };
  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uScale: { value: 500 }, uGrid: { value: new THREE.Vector2(...grid) } },
    vertexShader: `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; attribute float aIcon; uniform float uScale;
      varying float vAlpha; varying vec3 vColor; varying float vIcon;
      void main() { vAlpha = aAlpha; vColor = aColor; vIcon = aIcon; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; uniform vec2 uGrid; varying float vAlpha; varying vec3 vColor; varying float vIcon;
      void main() {
        vec2 pc = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
        float col = mod(vIcon, uGrid.x), row = floor(vIcon / uGrid.x + 0.001);
        vec4 t = texture2D(uMap, vec2((col + pc.x) / uGrid.x, (uGrid.y - 1.0 - row + pc.y) / uGrid.y));
        float a = t.a * vAlpha; if (a < 0.01) discard; gl_FragColor = vec4(vColor * t.rgb, a); }`,
    transparent: true, depthWrite: false, blending,
  });
  pool.points = new THREE.Points(geo, material);
  pool.points.frustumCulled = false; // particles move anywhere; the pool is small
  const px = new THREE.Vector2();
  pool.points.onBeforeRender = (renderer, scene, camera) => { // world size → pixels for this camera
    material.uniforms.uScale.value = (renderer.getDrawingBufferSize(px).y * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  };
  const c = new THREE.Color();
  pool.tint = (i, hex) => { c.set(hex).convertLinearToSRGB(); pool.color.setXYZ(i, c.r, c.g, c.b); }; // the shader writes straight to the sRGB canvas
  pool.flush = () => { pool.pos.needsUpdate = pool.size.needsUpdate = pool.alpha.needsUpdate = pool.color.needsUpdate = pool.icon.needsUpdate = true; };
  return pool;
}

export function liveLayer(scene, zoneData, zones, { coarse = false, spots = [] } = {}) {
  const root = new THREE.Group();
  scene.add(root);
  const dot = dotTexture();

  /* ---------- People ---------- */
  const residents = spots.filter((_, i) => !coarse || i % 2 === 0);
  const walkers = coarse ? 14 : 34;
  const guests = coarse ? 3 : 6; // wait outside the north door until the tour arrives at the entrance, then walk in
  const count = residents.length + walkers + guests;
  // a visitor: a dress, a head, hair or a headscarf, two arms that swing, a handbag for some, and on a themed day
  // something on her head (setMood({ hat })). One instanced mesh per part: a hundred people stay a handful of draw calls.
  const bodyGeo = new THREE.CylinderGeometry(0.07, 0.13, 0.42, 12);
  bodyGeo.translate(0, 0.21, 0);
  const headGeo = new THREE.SphereGeometry(0.075, 14, 10);
  const hairGeo = new THREE.SphereGeometry(0.083, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62); // a cap over the top, sides and back
  const armGeo = new THREE.CylinderGeometry(0.02, 0.017, 0.2, 6);
  armGeo.translate(0, -0.1, 0); // hangs from the shoulder
  const bagGeo = new THREE.BoxGeometry(0.06, 0.05, 0.025);
  const instanced = (geo, material) => {
    const im = new THREE.InstancedMesh(geo, material, count);
    im.castShadow = !coarse;
    im.frustumCulled = false; // three.js measures an instanced mesh once; people walk away from where they started
    return im;
  };
  const bodies = instanced(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.75 }));
  const heads = instanced(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.55 }));
  const hair = instanced(hairGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }));
  const armsL = instanced(armGeo, new THREE.MeshStandardMaterial({ roughness: 0.75 }));
  const armsR = instanced(armGeo, new THREE.MeshStandardMaterial({ roughness: 0.75 }));
  const bags = instanced(bagGeo, new THREE.MeshStandardMaterial({ roughness: 0.4 }));
  const c = new THREE.Color();
  const people = [];
  const dress = (i, outfit) => { bodies.setColorAt(i, c.set(outfit)); armsL.setColorAt(i, c); armsR.setColorAt(i, c); };
  for (let i = 0; i < count; i++) {
    const outfit = OUTFITS[i % OUTFITS.length], covered = outfit === '#2b1220', scarf = i % 3 === 0;
    dress(i, outfit);
    heads.setColorAt(i, c.set(covered ? '#2b1220' : SKIN[i % SKIN.length]));
    hair.setColorAt(i, c.set(covered ? '#2b1220' : scarf ? SCARF[i % SCARF.length] : HAIR[i % HAIR.length]));
    bags.setColorAt(i, c.set(BAGS[i % BAGS.length]));
    people.push({ pos: new THREE.Vector2(), yaw: 0, pitch: 0, roll: 0, sit: 0, bob: 0, show: 1, phase: Math.random() * 10, speed: rand(0.42, 0.6),
      armL: 0.05, armR: 0.05, bag: i % 9 === 0 || i % 9 === 4 || i % 9 === 6, wears: i % 2 === 0 });
  }
  residents.forEach((s, i) => Object.assign(people[i], { spot: s, pose: s.pose, yaw: s.yaw, pos: new THREE.Vector2(s.wx, s.wz) }));

  let focus = null;     // the stop on show (from tour.json), or null
  let focusZone = null; // the venue zone it films
  let focusRects = [];  // the part of the venue it covers, in scene units [x1, z1, x2, z2]
  const inFocus = (v) => focusRects.some(([x1, z1, x2, z2]) => v.x >= x1 && v.x <= x2 && v.y >= z1 && v.y <= z2);
  const plan = () => {
    const keys = Object.keys(VISITS);
    const picks = [];
    if (focusZone && Math.random() < 0.6) { const f = keys.find((k) => VISIT_ZONE[k] === focusZone); if (f) picks.push(f); }
    while (picks.length < 3) { const k = keys[Math.floor(Math.random() * keys.length)]; if (!picks.includes(k)) picks.push(k); }
    const legs = [{ path: IN.map(P), entering: true }];
    picks.forEach((k) => {
      const vz = VISITS[k];
      const stand = [rand(...vz.area[0]), rand(...vz.area[1])];
      legs.push({ path: [...vz.via.map(P), P(stand)], stay: rand(5, 11), look: [vz.look[0] ?? stand[0], vz.look[1] ?? stand[1]], zone: VISIT_ZONE[k] });
      legs.push({ path: [...[...vz.via].reverse().map(P), P(HUB)] });
    });
    legs.push({ path: OUT.map(P), done: true });
    return legs;
  };
  for (let j = 0; j < walkers + guests; j++) {
    const p = people[residents.length + j];
    p.walker = true;
    p.legs = j < walkers ? plan().slice(Math.floor(Math.random() * 7)) : plan();
    p.target = 0;
    p.pos.copy(p.legs[0].path[0]);
    p.wait = j < walkers ? Math.random() * 2 : Infinity;
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3();
  const sv = new THREE.Vector3();
  const headUp = new THREE.Vector3();
  let cheer = 0; // 1 right after a confetti burst, fading: the audience jumps
  const hats = {}; // headwear meshes, built the first time a theme asks for them
  // the day's mood (themes3d.js → setMood): light gains, the stage screen's colour, a flickering screen, sparkle
  const mood = { beamGain: 1, poolGain: 1, screenHue: 0.93, screenSat: 1, screenLight: 0.5, flicker: 0, sparkleGain: 1 };

  /* how each activity moves (t = seconds; a class moves together) */
  // arm angles: 0 = hanging, negative = forward and up (-π = straight up)
  const animate = (p, t) => {
    p.pitch = 0; p.bob = 0; p.sit = 0; p.armL = p.armR = 0.05;
    const s = p.spot;
    const yaw0 = s.yaw;
    switch (p.pose) {
      case 'sit': case 'perform': // chatting, hands on the lap, now and then a gesture
        p.sit = s.seat; p.yaw = yaw0 + Math.sin(t * 0.4 + p.phase) * 0.25; p.bob = Math.max(0, Math.sin(t * 1.3 + p.phase)) * 0.006;
        p.armL = -0.9; p.armR = -0.9 - Math.max(0, Math.sin(t * 0.9 + p.phase)) * 0.7; break;
      case 'watch': { // eyes on the stage; when the confetti flies, hands go up
        p.sit = s.seat; p.yaw = yaw0; p.bob = (Math.sin(t * 0.35 + p.phase) > 0.85 ? Math.abs(Math.sin(t * 9)) * 0.02 : 0) + cheer * Math.abs(Math.sin(t * 8 + p.phase)) * 0.05;
        const up = cheer > 0.3 ? -2.7 : -0.9;
        p.armL = up + Math.sin(t * 6 + p.phase) * 0.25 * cheer; p.armR = up + Math.cos(t * 6 + p.phase) * 0.25 * cheer; break;
      }
      case 'browse': { // drift along the shelf, looking left and right, reaching for things
        const off = Math.sin(t * 0.22 + p.phase) * 0.1;
        p.pos.set(s.wx + Math.cos(yaw0) * off, s.wz - Math.sin(yaw0) * off);
        p.yaw = yaw0 + Math.sin(t * 0.45 + p.phase) * 0.55;
        p.armR = -0.6 - Math.max(0, Math.sin(t * 0.6 + p.phase)) * 0.6; break;
      }
      case 'queue': p.yaw = yaw0 + Math.sin(t * 0.3 + p.phase) * 0.15; p.bob = Math.max(0, Math.sin(t * 0.9 + p.phase) - 0.7) * 0.03; p.armR = -0.5; break; // shifting weight, phone in hand
      case 'photo': p.yaw = yaw0 + Math.sin(t * 0.8 + p.phase) * 0.35; p.bob = Math.max(0, Math.sin(t * 1.6 + p.phase)) * 0.025; p.armR = -1.9; p.armL = -0.5; break; // phone up
      case 'yoga': p.pitch = (Math.sin(t * 0.7) * 0.5 + 0.5) * 1.1; p.yaw = yaw0; p.armL = p.armR = -2.9; break;
      case 'dance': case 'lead': p.bob = Math.abs(Math.sin(t * 4.2)) * 0.05; p.yaw = yaw0 + Math.sin(t * 2.1) * 0.7; p.armL = -2.3 + Math.sin(t * 4.2) * 0.7; p.armR = -2.3 + Math.cos(t * 4.2) * 0.7; break;
      default: p.yaw = yaw0 + Math.sin(t * 0.25 + p.phase) * 0.12; // stand
    }
  };
  const hm = new THREE.Matrix4(), pm = new THREE.Matrix4(), lm = new THREE.Matrix4();
  const none = new THREE.Matrix4().makeScale(0, 0, 0);
  const hairAt = new THREE.Matrix4().makeTranslation(0, 0.008, -0.012);
  const bagAt = new THREE.Matrix4().makeTranslation(0.105, 0.2, 0.02);
  const shoulder = (side, angle) => lm.makeRotationX(angle).setPosition(side * 0.088, 0.37, 0);
  let hat = null; // the themed day's headwear: [{ mesh, at }] (see HATS)
  const place = () => {
    people.forEach((p, i) => {
      if (p.walker) { // grow in after the north door, shrink away after the south door
        const my = (p.pos.y + D / 2) * U;
        p.show = smooth(1 - Math.max(0, -my - 1, my - 46) / 6);
      }
      e.set(p.pitch, p.yaw, p.roll); q.setFromEuler(e);
      const base = p.sit ? p.sit - 0.06 : 0;
      sv.set(p.show, p.show * (p.sit ? 0.6 : 1), p.show);
      m.compose(v.set(p.pos.x, base + p.bob, p.pos.y), q, sv); bodies.setMatrixAt(i, m);
      armsL.setMatrixAt(i, pm.multiplyMatrices(m, shoulder(-1, p.armL)));
      armsR.setMatrixAt(i, pm.multiplyMatrices(m, shoulder(1, p.armR)));
      bags.setMatrixAt(i, p.bag ? pm.multiplyMatrices(m, bagAt) : none);
      headUp.set(0, (p.sit ? 0.29 : 0.5) * p.show, 0).applyQuaternion(q);
      sv.setScalar(p.show);
      hm.compose(v.set(p.pos.x + headUp.x, base + p.bob + headUp.y, p.pos.y + headUp.z), q, sv); heads.setMatrixAt(i, hm);
      hair.setMatrixAt(i, pm.multiplyMatrices(hm, hairAt));
      if (hat) hat.forEach((h) => h.mesh.setMatrixAt(i, p.wears ? pm.multiplyMatrices(hm, h.at) : none));
    });
    [bodies, heads, hair, armsL, armsR, bags].forEach((im) => { im.instanceMatrix.needsUpdate = true; });
    if (hat) hat.forEach((h) => { h.mesh.instanceMatrix.needsUpdate = true; });
  };
  people.forEach((p) => { if (!p.walker) animate(p, 0); });
  place();
  root.add(bodies, heads, hair, armsL, armsR, bags);

  const walk = (p, dt, t) => {
    p.roll += (0 - p.roll) * Math.min(1, dt * 8);
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.look) p.yaw = turn(p.yaw, Math.atan2(toX(p.look[0]) - p.pos.x, toZ(p.look[1]) - p.pos.y) + Math.sin(t * 0.5 + p.phase) * 0.4, dt * 4); // looking around
      p.bob += (0 - p.bob) * Math.min(1, dt * 10);
      p.armL += (0.05 - p.armL) * Math.min(1, dt * 6); p.armR += (0.05 - p.armR) * Math.min(1, dt * 6);
      return;
    }
    p.look = null; p.at = null;
    const leg = p.legs[0];
    const goal = leg.path[p.target];
    const dx = goal.x - p.pos.x, dz = goal.y - p.pos.y;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) {
      p.target++;
      if (p.target >= leg.path.length) {
        if (leg.stay) { p.wait = leg.stay; p.look = leg.look; p.at = leg.zone; }
        p.legs.shift(); p.target = 0;
        if (leg.done || !p.legs.length) { p.legs = plan(); p.pos.copy(p.legs[0].path[0]); p.wait = rand(0.5, 4); }
      }
      return;
    }
    p.yaw = turn(p.yaw, Math.atan2(dx, dz), dt * 7); // ease round corners instead of snapping
    const stepLen = Math.min(dist, p.speed * dt);
    p.pos.x += (dx / dist) * stepLen; p.pos.y += (dz / dist) * stepLen;
    p.bob = Math.abs(Math.sin(t * 7 + p.phase)) * 0.022;
    p.roll = Math.sin(t * 7 + p.phase) * 0.05; // a little sway from step to step
    p.armL = Math.sin(t * 7 + p.phase) * 0.45; p.armR = -p.armL;  // arms swing with the steps
  };

  /* waves: a group walks in through the north door, or heads home through the exit */
  const waveIn = () => {
    people.filter((p) => p.walker && p.legs[0].entering && p.target === 0 && p.wait > 0).slice(0, guests + 2)
      .forEach((p, j) => { p.wait = 0.3 + j * 0.9; });
  };
  const exitAt = P([9, 23.6]);
  const waveOut = () => {
    people.filter((p) => p.walker && !p.legs[0].done && !p.legs[0].entering && p.show > 0.9)
      .sort((a, b) => a.pos.distanceTo(exitAt) - b.pos.distanceTo(exitAt)).slice(0, coarse ? 3 : 5)
      .forEach((p, j) => { p.legs = [{ path: OUT.slice(1).map(P), done: true }]; p.target = 0; p.wait = j * 0.6; p.look = null; p.at = null; });
  };

  /* ---------- PinkOut Live: moving light beams over the stage, a breathing LED screen ---------- */
  // Soft volumetric beams: bright at the lamp, fading out before the stage floor, and fading at the sides, so a
  // swinging beam never shows a hard cone edge or a cut line where it would pass through the stage.
  const beamGeo = new THREE.ConeGeometry(0.75, 2.1, 32, 8, true);
  beamGeo.translate(0, -1.05, 0);
  const beamMaterial = (color) => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.1 } },
    vertexShader: `varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main() { vAlong = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main() { float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float along = smoothstep(0.0, 0.75, vAlong);
        gl_FragColor = vec4(uColor, uOpacity * edge * along); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const beams = [16.5, 21.5, 26.5].map((y, i) => {
    const b = new THREE.Mesh(beamGeo, beamMaterial(i === 1 ? '#ffffff' : '#ff3d8b'));
    b.position.set(toX(44.3), 2.55, toZ(y));
    root.add(b);
    return b;
  });
  let screen = null;
  zones.find((z) => z.data.id === 'live')?.group.traverse((o) => { if (o.userData.screen) screen = o; });

  /* light pools sweeping the audience floor */
  const poolGeo = new THREE.PlaneGeometry(1.5, 1.5);
  poolGeo.rotateX(-Math.PI / 2);
  const pools = ['#ff3d8b', '#ddcffb', '#ffffff'].map((col) => {
    const pm = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ color: col, map: dot, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    pm.position.set(toX(40), 0.035, toZ(21.5));
    pm.renderOrder = 1;
    root.add(pm);
    return pm;
  });

  /* confetti: one instanced mesh, launched in bursts, flutters down and settles on the floor */
  const nConfetti = coarse ? 60 : 130;
  const confettiGeo = new THREE.PlaneGeometry(0.075, 0.045);
  const confetti = new THREE.InstancedMesh(confettiGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), nConfetti);
  confetti.frustumCulled = false;
  const bits = [];
  for (let i = 0; i < nConfetti; i++) {
    confetti.setColorAt(i, c.set(CONFETTI[i % CONFETTI.length]));
    bits.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), rest: 0, s: 0, ph: Math.random() * 6 });
    m.makeScale(0, 0, 0); confetti.setMatrixAt(i, m);
  }
  root.add(confetti);
  let nextBurst = rand(2, 4);
  let lastBurst = -99;
  let lastT = 0;
  const burst = (t) => {
    lastBurst = t;
    bits.forEach((b, i) => {
      if (b.on && b.rest <= 0) return; // still in the air
      const [cx, cy] = CANNONS[i % 2];
      b.on = true; b.rest = 0; b.s = 1;
      b.p.set(toX(cx), 0.6, toZ(cy));
      b.v.set(-rand(1.0, 2.6), rand(1.8, 3.0), (i % 2 ? -1 : 1) * rand(0.1, 1.4));
      b.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      b.w.set(rand(-9, 9), rand(-6, 6), rand(-9, 9));
    });
  };
  const flutter = (dt, t) => {
    bits.forEach((b, i) => {
      if (!b.on) return;
      if (b.rest > 0) { // lying on the floor, then gone
        b.rest -= dt;
        b.s = smooth(b.rest / 0.6);
        if (b.rest <= 0) { b.on = false; b.s = 0; }
      } else {
        const drag = Math.exp(-1.6 * dt);
        b.v.x *= drag; b.v.z *= drag;
        b.v.y = Math.max(-0.42, b.v.y - 3.2 * dt); // paper falls slowly
        b.p.addScaledVector(b.v, dt);
        b.p.x += Math.sin(t * 4 + b.ph) * 0.18 * dt; b.p.z += Math.cos(t * 3.3 + b.ph) * 0.18 * dt;
        b.r.x += b.w.x * dt; b.r.y += b.w.y * dt; b.r.z += b.w.z * dt;
        if (b.p.y <= 0.03 && b.v.y < 0) { b.p.y = 0.03; b.r.set(-Math.PI / 2, 0, b.r.z); b.rest = rand(2.5, 4.5); } // on top of the raised audience floor
      }
      q.setFromEuler(b.r); sv.setScalar(b.s);
      m.compose(b.p, q, sv); confetti.setMatrixAt(i, m);
    });
    confetti.instanceMatrix.needsUpdate = true;
  };

  /* ---------- Balloon bunches: three balloons on gold strings per doorway, bobbing and swaying ---------- */
  const balloonGeo = new THREE.SphereGeometry(0.12, 16, 12);
  balloonGeo.scale(1, 1.18, 1);
  const stringGeo = new THREE.CylinderGeometry(0.004, 0.004, 1, 4);
  stringGeo.translate(0, 0.5, 0);
  const bunch = [];
  BALLOONS.forEach(([zone, mx, my], j) => [0, 1, 2].forEach((i) => bunch.push({
    zone, i, base: new THREE.Vector3(toX(mx), 0.02, toZ(my)), h: 1.05 + i * 0.16, a: i * 2.1 + j, ph: Math.random() * 6,
  })));
  const balloons = new THREE.InstancedMesh(balloonGeo, new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0.05 }), bunch.length);
  const strings = new THREE.InstancedMesh(stringGeo, new THREE.MeshBasicMaterial({ color: '#c9a96a' }), bunch.length);
  balloons.castShadow = !coarse;
  balloons.frustumCulled = strings.frustumCulled = false;
  bunch.forEach((b, i) => { const look = LOOK[b.zone]; balloons.setColorAt(i, c.set([look.edge, look.wall, '#ffffff'][b.i])); });
  root.add(balloons, strings);
  const tip = new THREE.Vector3(), lift = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), qs = new THREE.Quaternion();
  const sway = (t) => {
    bunch.forEach((b, i) => {
      tip.set(b.base.x + Math.cos(b.a) * 0.13 + Math.sin(t * 0.7 + b.ph) * 0.05, b.h + Math.sin(t * 1.1 + b.ph) * 0.03, b.base.z + Math.sin(b.a) * 0.13 + Math.cos(t * 0.6 + b.ph) * 0.05);
      m.makeTranslation(tip.x, tip.y, tip.z); balloons.setMatrixAt(i, m);
      lift.copy(tip).sub(b.base);
      const len = lift.length() - 0.13;
      qs.setFromUnitVectors(up, lift.normalize()); sv.set(1, len, 1);
      m.compose(b.base, qs, sv); strings.setMatrixAt(i, m);
    });
    balloons.instanceMatrix.needsUpdate = strings.instanceMatrix.needsUpdate = true;
  };
  sway(0);

  /* ---------- Steam over the café counters ---------- */
  const steam = particles(coarse ? 10 : 18, dot);
  const puffs = Array.from({ length: steam.n }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0 }));
  for (let i = 0; i < steam.n; i++) steam.tint(i, '#ffffff');
  let nextPuff = 0, puffAt = 0;

  /* ---------- Photo flashes at the photo spots of the stop on show ---------- */
  const flash = particles(6, dot, { blending: THREE.AdditiveBlending });
  const flashes = Array.from({ length: flash.n }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0 }));
  for (let i = 0; i < flash.n; i++) flash.tint(i, '#ffffff');
  let nextFlash = 0;

  /* ---------- Icons: what people are doing, floating up (hearts everywhere; cups, bags, notes… at the stop on show) ---------- */
  const icons = particles(coarse ? 34 : 64, iconSheet(), { grid: [3, 3] });
  const pops = Array.from({ length: icons.n }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vz: 0, rise: 0, size: 0.2, ph: 0 }));
  let nextIcon = 1;
  const emitter = () => { // someone in the stop on show (when there is one), else anyone enjoying something
    const here = focus ? people.filter((p) => p.show > 0.9 && inFocus(p.pos)) : [];
    const from = here.length ? here : people.filter((p) => p.show > 0.9 && (p.spot ? p.pose !== 'stand' : p.at));
    return from.length ? pick(from) : null;
  };

  /* ---------- A little sparkle in the air (fades in near the floor and out near the ceiling, and twinkles) ---------- */
  const sparkle = particles(coarse ? 60 : 130, dot, { blending: THREE.AdditiveBlending });
  for (let i = 0; i < sparkle.n; i++) { sparkle.pos.setXYZ(i, (Math.random() - 0.5) * W, Math.random() * 3.5, (Math.random() - 0.5) * D); sparkle.size.setX(i, rand(0.06, 0.12)); sparkle.tint(i, '#ffe3ec'); }

  const spawn = (list, max, x, y, z) => { // → the slot used, or -1 when every one is busy
    const i = list.findIndex((o) => o.life <= 0);
    if (i >= 0) Object.assign(list[i], { life: max, max, x, y, z, ph: Math.random() * 6 });
    return i;
  };
  const emit = (name, x, y, z, spread = 0) => {
    const ic = ICONS[name] || ICONS.heart;
    const i = spawn(pops, rand(2.0, 2.8), x, y, z);
    if (i < 0) return;
    const a = Math.random() * Math.PI * 2;
    Object.assign(pops[i], { vx: Math.cos(a) * spread, vz: Math.sin(a) * spread, rise: rand(0.7, 1.0), size: ic.size * rand(0.9, 1.1) });
    icons.icon.setX(i, ic.cell);
    icons.tint(i, pick(ic.tints));
  };
  const effects = (dt, t) => {
    // steam: rises, swells and thins out
    if (t >= nextPuff) { nextPuff = t + (coarse ? 0.35 : 0.22); const [sx, sy, sh] = STEAM[puffAt++ % STEAM.length]; spawn(puffs, rand(2, 2.8), toX(sx) + rand(-0.03, 0.03), sh / U, toZ(sy) + rand(-0.03, 0.03)); }
    puffs.forEach((o, i) => {
      if (o.life > 0) o.life -= dt;
      const k = 1 - Math.max(0, o.life) / o.max; // 0 → 1 over its life
      steam.pos.setXYZ(i, o.x + Math.sin(t * 1.3 + i) * 0.04 * k, o.y + k * 0.55, o.z);
      steam.size.setX(i, 0.08 + k * 0.28);
      steam.alpha.setX(i, o.life > 0 ? smooth(k / 0.15) * (1 - k) * 0.4 : 0);
    });
    steam.flush();

    // photo flashes: someone at a photo spot of the stop on show takes a picture
    if (focus?.moment?.flash && t >= nextFlash) {
      nextFlash = t + rand(0.7, 1.5);
      const p = pick(people.filter((x) => x.pose === 'photo' && inFocus(x.pos)).concat(people.filter((x) => x.walker && x.show > 0.9 && inFocus(x.pos))));
      if (p) {
        const fx = p.pos.x + Math.sin(p.yaw) * 0.25, fz = p.pos.y + Math.cos(p.yaw) * 0.25;
        spawn(flashes, 0.35, fx, 0.5, fz);
        if (Math.random() < 0.15) emit('camera', p.pos.x, 0.7, p.pos.y, 0.15);
      }
    }
    flashes.forEach((o, i) => {
      if (o.life > 0) o.life -= dt;
      const k = 1 - Math.max(0, o.life) / o.max;
      flash.pos.setXYZ(i, o.x, o.y, o.z);
      flash.size.setX(i, 0.35 + k * 0.6);
      flash.alpha.setX(i, o.life > 0 ? (1 - k) * 0.95 : 0);
    });
    flash.flush();

    // little glyphs over someone's head now and then (hearts, sparkles, colour drops: never the sticker badges, which
    // only pop once when a bubble appears, so the room doesn't fill up with repeated tags)
    if (t >= nextIcon) {
      nextIcon = t + (focus ? rand(0.55, 1.1) : rand(0.8, 1.6));
      const p = emitter();
      const kinds = (focus?.moment?.icons || []).filter((n) => ICONS[n] && ICONS[n].cell < 4);
      if (p) emit(kinds.length && Math.random() < 0.6 ? pick(kinds) : 'heart', p.pos.x, p.sit ? p.sit + 0.3 : 0.62, p.pos.y);
    }
    pops.forEach((o, i) => {
      if (o.life > 0) o.life -= dt;
      const age = o.max - Math.max(0, o.life), k = age / o.max;
      const out = (1 - Math.exp(-3 * age)) / 3; // spread out fast, then drift
      icons.pos.setXYZ(i, o.x + o.vx * out + Math.sin(t * 2.4 + o.ph) * 0.05 * k, o.y + o.rise * (1 - (1 - k) * (1 - k)), o.z + o.vz * out);
      const grow = Math.min(1, k / 0.08);
      icons.size.setX(i, o.size * grow * (1 + Math.sin(grow * Math.PI) * 0.35)); // a little pop as it appears
      icons.alpha.setX(i, o.life > 0 ? smooth(k / 0.08) * smooth((1 - k) / 0.3) : 0);
    });
    icons.flush();

    // sparkle drifts up and wraps round while invisible
    for (let i = 0; i < sparkle.n; i++) {
      let y = sparkle.pos.getY(i) + dt * 0.2;
      if (y > 3.5) y = 0.2;
      sparkle.pos.setY(i, y);
      sparkle.alpha.setX(i, smooth((y - 0.2) / 0.8) * smooth((3.5 - y) / 0.8) * (0.45 + 0.4 * Math.sin(t * 2.6 + i * 1.7)) * mood.sparkleGain);
    }
    sparkle.flush();
  };
  effects(0, 0);
  root.add(steam.points, flash.points, icons.points, sparkle.points);

  return {
    root,
    /** the stop on show (an entry of tour.json zones), or null between stops and at the overview / finale */
    setFocus(stop) {
      if (stop === focus) return;
      focus = stop;
      focusZone = stop ? stop.zone || stop.id : null;
      const rects = stop ? stop.rects || zoneData.find((z) => z.id === focusZone)?.plan.rects || [] : [];
      focusRects = rects.map(([x1, y1, x2, y2]) => [toX(x1), toZ(y1), toX(x2), toZ(y2)]);
      if (!stop) return;
      if (stop.moment?.confetti) nextBurst = Math.min(nextBurst, lastT + 0.8); // arriving at the stage: confetti
      if (stop.moment?.wave === 'in') waveIn();
      if (stop.moment?.wave === 'out') waveOut();
      nextIcon = lastT + 0.3;
    },
    /** dress the stage show and decorations for a themed day; with no argument, back to the everyday look */
    setMood(m = {}) {
      const beamCols = m.beams || ['#ff3d8b', '#ffffff', '#ff3d8b'];
      beams.forEach((b, i) => b.material.uniforms.uColor.value.set(beamCols[i % beamCols.length]));
      const poolCols = m.pools || ['#ff3d8b', '#ddcffb', '#ffffff'];
      pools.forEach((pm, i) => pm.material.color.set(poolCols[i % poolCols.length]));
      Object.assign(mood, { beamGain: m.beamGain ?? 1, poolGain: m.poolGain ?? 1, screenHue: m.screenHue ?? 0.93, screenSat: m.screenSat ?? 1,
        screenLight: m.screenLight ?? 0.5, flicker: m.flicker ?? 0, sparkleGain: m.sparkleGain ?? 1 });
      for (let i = 0; i < sparkle.n; i++) sparkle.tint(i, m.sparkle || '#ffe3ec');
      sparkle.flush();
      bunch.forEach((b, i) => balloons.setColorAt(i, c.set(m.balloons ? m.balloons[b.i % m.balloons.length] : [LOOK[b.zone].edge, LOOK[b.zone].wall, '#ffffff'][b.i])));
      balloons.instanceColor.needsUpdate = true;
      const cc = m.confetti || CONFETTI;
      bits.forEach((_, i) => confetti.setColorAt(i, c.set(cc[i % cc.length])));
      confetti.instanceColor.needsUpdate = true;
      if (screen && !m.screenHue && !m.flicker) { screen.material.emissive.setHSL(0.93, 1, 0.5); screen.material.emissiveIntensity = 0.55; }
      // the visitors dress for the day: outfits, hair or scarves, bags, and something on every other head
      people.forEach((p, i) => {
        const outfit = OUTFITS[i % OUTFITS.length], covered = outfit === '#2b1220';
        dress(i, m.outfits ? m.outfits[i % m.outfits.length] : outfit);
        hair.setColorAt(i, c.set(m.hair ? m.hair[i % m.hair.length] : covered ? '#2b1220' : i % 3 === 0 ? SCARF[i % SCARF.length] : HAIR[i % HAIR.length]));
        bags.setColorAt(i, c.set(m.bags ? m.bags[i % m.bags.length] : BAGS[i % BAGS.length]));
      });
      [bodies, armsL, armsR, hair, bags].forEach((im) => { im.instanceColor.needsUpdate = true; });
      if (hat) hat.forEach((h) => { h.mesh.visible = false; });
      hat = m.hat ? (hats[m.hat] ||= HATS[m.hat].map((d) => {
        const material = d.glow ? new THREE.MeshBasicMaterial({ color: d.color }) : new THREE.MeshStandardMaterial({ color: d.color, roughness: d.metal ? 0.3 : 0.7, metalness: d.metal ? 0.7 : 0 });
        const mesh = instanced(d.geo(), material);
        root.add(mesh);
        const at = new THREE.Matrix4().compose(new THREE.Vector3(...d.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(d.rx || 0, 0, d.rz || 0)), new THREE.Vector3(1, 1, 1));
        return { mesh, at };
      })) : null;
      if (hat) hat.forEach((h) => { h.mesh.visible = true; });
      place();
    },
    /** pop a few icons from a point (scene units), e.g. where a bubble just appeared */
    burst(at, kinds = ['heart'], n = 5) { for (let i = 0; i < n; i++) emit(pick(kinds), at.x, at.y, at.z, rand(0.25, 0.55)); },
    step(dt, t) {
      lastT = t;
      people.forEach((p) => (p.walker ? walk(p, dt, t) : animate(p, t)));
      cheer = smooth(1 - (t - lastBurst) / 3.5);
      place();
      beams.forEach((b, i) => {
        b.rotation.z = Math.sin(t * 1.1 + i * 2.1) * 0.38;
        b.rotation.x = Math.cos(t * 0.8 + i) * 0.22;
        b.material.uniforms.uOpacity.value = (0.32 + Math.sin(t * 1.2 + i * 1.7) * 0.06 + cheer * 0.12) * mood.beamGain; // steady haze, never blinking off
      });
      pools.forEach((pm, i) => {
        pm.position.x = toX(39.8 + Math.sin(t * 0.5 + i * 2.1) * 3.4);
        pm.position.z = toZ(21.5 + Math.sin(t * 0.37 + i * 1.3) * 4.6);
        pm.material.opacity = (0.24 + Math.sin(t * 1.1 + i * 2.3) * 0.06 + cheer * 0.08) * mood.poolGain;
      });
      if (screen) {
        screen.material.emissive.setHSL(mood.screenHue + Math.sin(t * 0.6) * 0.04, mood.screenSat, mood.screenLight);
        const film = mood.flicker ? 0.8 + 0.2 * Math.sin(t * 23) * Math.sin(t * 7.3) : 1; // a film playing
        screen.material.emissiveIntensity = (0.55 + Math.sin(t * 1.5) * 0.12 + cheer * 0.15) * film;
      }
      if (t >= nextBurst) { burst(t); nextBurst = t + rand(8, 12); }
      flutter(dt, t);
      sway(t);
      effects(dt, t);
    },
  };
}
