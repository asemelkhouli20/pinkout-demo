// PinkOut Partners — themed days on the venue map (event tour). "Every day" is the venue as built (the default);
// a theme dresses it for that day:
//   light   — the mood of the room (sky, sun, fill, exposure) and the stage background (CSS, via data-theme)
//   colours — a few things change colour: the hall floor, balloons, stage beams and light pools, the LED screen, confetti, sparkle
//   props   — its own things (a glowing dance floor, tents and a campfire, a torii gate, ghosts and pumpkins…)
//   effect  — something always moving (cherry petals, fireflies, fog, projector dust, flickering lanterns…)
// Themes follow the knowledge base's themed-day concepts. Each theme takes over the Rose Hub activation stage (the
// "space for changing pop-ups", seen from the overview and the Rose Hub stop): the everyday tree and panels step aside
// for the theme's centrepiece. More props sit in the passages, at PinkOut Live and around the hall (plan metres).
// Each theme's props are built the first time it is picked; switching pops them in and out, and the light eases over.
import * as THREE from './vendor/three.module.min.js?v=1';
import { toX, toZ, U, W, D, back, LOOK } from './venue.js?v=30';
import { particles, dotTexture } from './crowd.js?v=34';

const M = (m) => m / U;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const lit = (color, i = 1.3, extra = {}) => std(color, { emissive: color, emissiveIntensity: i, ...extra });
const GEO = {
  box: (w, h, d) => new THREE.BoxGeometry(M(w), M(h), M(d)),
  cyl: (rt, rb, h, seg = 20, open = false) => new THREE.CylinderGeometry(M(rt), M(rb), M(h), seg, 1, open),
  sph: (r, seg = 16) => new THREE.SphereGeometry(M(r), seg, Math.max(8, Math.round(seg * 0.75))),
  cone: (r, h, seg = 16, open = false) => new THREE.ConeGeometry(M(r), M(h), seg, 1, open),
  ico: (r, detail = 1) => new THREE.IcosahedronGeometry(M(r), detail),
  torus: (r, tube, arc = Math.PI * 2, seg = 40) => new THREE.TorusGeometry(M(r), M(tube), 10, seg, arc),
};
/** a prop: a group standing at a plan point (metres); its parts are placed relative to it */
function prop(g, x, y, h = 0, yaw = 0) {
  const p = new THREE.Group();
  p.position.set(toX(x), M(h), toZ(y));
  p.rotation.y = yaw;
  g.add(p);
  return p;
}
/** a part of a prop: offset in metres (dx east, dy south, h = height of its centre) */
function part(p, geo, material, dx = 0, dy = 0, h = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(M(dx), M(h), M(dy));
  m.castShadow = true; m.receiveShadow = true;
  p.add(m);
  return m;
}
/** a thin wire hung between two plan points at height h (metres), sagging; returns points along it for bulbs */
function wire(g, [ax, ay], [bx, by], h, sag, n, colour = '#3a2c34') {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3(toX(ax + (bx - ax) * t), M(h - Math.sin(t * Math.PI) * sag), toZ(ay + (by - ay) * t))); }
  const w = new THREE.Group();
  w.userData.fixed = true; // drawn in scene units: it fades in and out with its theme instead of popping
  const up = new THREE.Vector3(0, 1, 0), mat = std(colour);
  for (let i = 0; i < n; i++) {
    const a = pts[i], dir = pts[i + 1].clone().sub(a);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(M(0.01), M(0.01), dir.length(), 4), mat);
    seg.position.copy(a).addScaledVector(dir, 0.5); seg.quaternion.setFromUnitVectors(up, dir.normalize()); w.add(seg);
  }
  g.add(w);
  return pts;
}
function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** a soft additive beam (bright at its source, soft at its sides), like the stage beams in crowd.js */
const beamMaterial = (color, opacity) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
  vertexShader: `varying float vAlong; varying vec3 vN; varying vec3 vV;
    void main() { vAlong = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vAlong; varying vec3 vN; varying vec3 vV;
    void main() { float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.4); gl_FragColor = vec4(uColor, uOpacity * edge * (0.35 + 0.65 * vAlong)); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});

/* where the audience sits at PinkOut Live (venue.js): three rows of six armchairs facing the stage */
const SEATS = [];
for (let c = 0; c < 3; c++) for (let r = 0; r < 6; r++) SEATS.push({ x: 41.2 - c * 1.6, y: 17.1 + r * 1.95, c, r });
/* the arches of the two passages (venue.js): five each */
const ARCHES = [0.6, 28.5].flatMap((y1) => [0, 1, 2, 3, 4].map((i) => y1 + 1.2 + i * ((15.5 - 2.4) / 4)));
/* the Rose Hub activation stage: a round marble stage, 3.3 m radius, 0.12 m high (venue.js) */
const STAGE = [15.5, 21.3], TOP = 0.12;
const onStage = (a, r) => [STAGE[0] + Math.sin(a) * r, STAGE[1] + Math.cos(a) * r]; // a plan point at angle a, r metres from its centre
/* open spots around the hall for single props */
const SPOTS = [[24.0, 18.2], [33.0, 23.4], [18.8, 26.6]];

/* ---------- Light ---------- */
const EVERYDAY = { sky: '#b8c4ff', ground: '#2a2440', hemi: 0.36, sun: '#dfe4ff', sunI: 1.6, fill: '#ffcf9e', fillI: 0.75, exposure: 0.95, bg: '#141b36' }; // night in the park (tour3d.js starts with these); bg: the sky (park.js)

/* ---------- The themes ---------- */
const THEMES = {
  default: { light: EVERYDAY },

  kpop: { // Korean-inspired music, dance, challenges: a night of neon, a dance floor, light sticks in the audience
    light: { sky: '#8f7bff', ground: '#1c0f36', hemi: 0.36, sun: '#c9a6ff', sunI: 1.0, fill: '#ff4fd8', fillI: 0.9, exposure: 0.95, bg: '#140b30' },
    floors: { hub: '#b6a3ff', live: '#43237f' },
    mood: { beams: ['#ff2bd6', '#29e3ff', '#b7ff3c'], beamGain: 1.6, pools: ['#ff2bd6', '#29e3ff', '#b7ff3c'], poolGain: 1.5, screenHue: 0.78,
      balloons: ['#ff2bd6', '#29e3ff', '#b7ff3c'], confetti: ['#ff2bd6', '#29e3ff', '#b7ff3c', '#ffffff', '#ffe600'], sparkle: '#d9c8ff', sparkleGain: 1.3 },
    build(g, ctx) {
      const n = 5, size = 0.9;
      const floor = prop(g, ...STAGE, TOP);
      const tiles = new THREE.InstancedMesh(GEO.box(size - 0.08, 0.02, size - 0.08), new THREE.MeshBasicMaterial({ color: '#ffffff' }), n * n);
      const pal = ['#ff2bd6', '#29e3ff', '#b7ff3c', '#7a3cff'].map((c) => new THREE.Color(c));
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < n * n; i++) { m4.makeTranslation(M(((i % n) - (n - 1) / 2) * size), M(0.035), M((Math.floor(i / n) - (n - 1) / 2) * size)); tiles.setMatrixAt(i, m4); tiles.setColorAt(i, pal[i % 4]); }
      floor.add(tiles);
      const span = n * size;
      [[0, -span / 2, span, 0.08], [0, span / 2, span, 0.08], [-span / 2, 0, 0.08, span], [span / 2, 0, 0.08, span]].forEach(([dx, dy, w, d], i) => part(floor, GEO.box(w, 0.08, d), lit(['#ff2bd6', '#29e3ff'][i % 2], 2.2), dx, dy, 2.9));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => part(floor, GEO.cyl(0.04, 0.04, 2.9), std('#2a2140', { metalness: 0.6 }), sx * span / 2, sy * span / 2, 1.45));
      const sticks = SEATS.filter((s) => (s.c * 6 + s.r) % 5 !== 3).map((s, i) => {
        const st = prop(g, s.x + 0.12, s.y, 1.15);
        part(st, GEO.cyl(0.02, 0.02, 0.22), std('#222'), 0, 0, 0.11);
        part(st, GEO.cyl(0.05, 0.05, 0.22), lit(pal[i % 3].getStyle(), 2.4), 0, 0, 0.33);
        return st;
      });
      let next = 0;
      return {
        step(dt, t, p) {
          const beat = Math.floor(t * 2.6);
          for (let i = 0; i < n * n; i++) tiles.setColorAt(i, pal[(i + beat + Math.floor(i / n)) % 4]);
          tiles.instanceColor.needsUpdate = true;
          sticks.forEach((st, i) => { st.rotation.x = Math.sin(t * 4.2 + i * 0.5) * 0.45; });
          if (p > 0.9 && t > next) { next = t + 0.8; ctx.live.burst(new THREE.Vector3(toX(STAGE[0] + rand(-1.8, 1.8)), M(1.7), toZ(STAGE[1] + rand(-1.8, 1.8))), ['note', 'star'], 1); }
        },
      };
    },
  },

  movie: { // an informal screening: lights down, the stage screen plays, a projector, popcorn on every side table
    light: { sky: '#a8b8ff', ground: '#141530', hemi: 0.32, sun: '#ffe0b8', sunI: 0.85, fill: '#6f8cff', fillI: 0.45, exposure: 0.9, bg: '#0d1226' },
    floors: { live: '#232a52' },
    mood: { beamGain: 0, poolGain: 0, screenHue: 0.6, screenSat: 0.35, screenLight: 0.78, flicker: 1, balloons: ['#e0182d', '#ffffff', '#e6c47e'], sparkle: '#cfd8ff', sparkleGain: 0.6 },
    build(g, ctx) {
      const pro = prop(g, 36.2, 21.5);
      part(pro, GEO.cyl(0.05, 0.08, 1.4), std('#2a2a33', { metalness: 0.5 }), 0, 0, 0.7);
      part(pro, GEO.box(0.5, 0.32, 0.4), std('#1f1f26', { metalness: 0.4 }), 0, 0, 1.55);
      part(pro, GEO.cyl(0.08, 0.08, 0.12), lit('#dfe8ff', 2), 0.3, 0, 1.55).rotation.z = Math.PI / 2;
      // the beam: from the lens to the screen (venue.js: screen at x 48.94, 1.6–5.2 m high)
      const from = new THREE.Vector3(toX(36.55), M(1.55), toZ(21.5)), to = new THREE.Vector3(toX(48.9), M(3.4), toZ(21.5));
      const dir = to.clone().sub(from), len = dir.length();
      const beamGeo = new THREE.ConeGeometry(M(1.9), len, 32, 1, true);
      beamGeo.translate(0, -len / 2, 0);
      const beam = new THREE.Mesh(beamGeo, beamMaterial('#cfe0ff', 0.22));
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
      const beamHolder = new THREE.Group(); beamHolder.position.copy(from); beamHolder.add(beam); g.add(beamHolder); // pops from the lens
      // popcorn: a striped bucket on every side table in the audience, and a cart in the hall
      const red = std('#e0182d', { roughness: 0.45 }), white = std('#ffffff', { roughness: 0.5 }), corn = std('#fff3c4', { roughness: 0.9, flatShading: true });
      const bucket = (p, h) => {
        part(p, GEO.cyl(0.12, 0.09, 0.24, 16), red, 0, 0, h + 0.12);
        for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; part(p, GEO.box(0.03, 0.24, 0.02), white, Math.cos(a) * 0.105, Math.sin(a) * 0.105, h + 0.12).rotation.y = -a; }
        for (let k = 0; k < 6; k++) part(p, GEO.ico(0.05, 0), corn, rand(-0.06, 0.06), rand(-0.06, 0.06), h + 0.27 + rand(0, 0.04));
      };
      SEATS.filter((s) => s.r % 2 === 0).forEach((s) => bucket(prop(g, s.x - 0.25, s.y + 0.98), 0.5));
      const cart = prop(g, ...SPOTS[0]);
      part(cart, GEO.box(1.0, 0.85, 0.6), red, 0, 0, 0.43);
      part(cart, GEO.box(0.9, 0.5, 0.5), std('#ffffff', { transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05 }), 0, 0, 1.12);
      for (let k = 0; k < 14; k++) part(cart, GEO.ico(0.06, 0), corn, rand(-0.35, 0.35), rand(-0.18, 0.18), rand(0.92, 1.05));
      for (let k = 0; k < 6; k++) part(cart, GEO.box(0.18, 0.06, 0.66), k % 2 ? white : red, -0.45 + k * 0.18, 0, 1.42);
      [-0.35, 0.35].forEach((d) => part(cart, GEO.torus(0.12, 0.03), std('#333'), d, 0.32, 0.12));
      const big = prop(g, ...STAGE, TOP);
      part(big, GEO.cyl(0.95, 0.7, 1.6, 24), red, 0, 0, 0.8);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; part(big, GEO.box(0.3, 1.6, 0.04), white, Math.cos(a) * 0.83, Math.sin(a) * 0.83, 0.8).rotation.y = -a + Math.PI / 2; }
      for (let k = 0; k < 26; k++) { const a = rand(0, Math.PI * 2), r = rand(0, 0.8); part(big, GEO.ico(rand(0.12, 0.18), 0), corn, Math.cos(a) * r, Math.sin(a) * r, 1.62 + (0.8 - r) * 0.35 + rand(0, 0.1)); }
      const marquee = [];
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; const [x, y] = onStage(a, 3.15); const b = part(prop(g, x, y, TOP), GEO.sph(0.07, 8), lit('#ffe7a8', 2), 0, 0, 0.08); marquee.push(b); }
      // dust drifting in the projector beam
      const dust = particles(ctx.coarse ? 24 : 48, dotTexture(), { blending: THREE.AdditiveBlending });
      const motes = Array.from({ length: dust.n }, () => ({ k: Math.random(), a: Math.random() * 6, r: Math.random() }));
      for (let i = 0; i < dust.n; i++) { dust.tint(i, '#e8efff'); dust.size.setX(i, rand(0.03, 0.06)); }
      ctx.scene.add(dust.points);
      const q = new THREE.Vector3();
      return {
        points: [dust],
        step(dt, t, p) {
          marquee.forEach((b, i) => { b.material.emissiveIntensity = (i + Math.floor(t * 5)) % 3 === 0 ? 2.6 : 0.6; }); // chasing lights
          motes.forEach((o, i) => {
            o.k = (o.k + dt * 0.02) % 1;
            q.copy(from).addScaledVector(dir, o.k);
            const rr = M(1.9) * o.k * o.r * 0.8;
            dust.pos.setXYZ(i, q.x, q.y + Math.sin(o.a + t * 0.3) * rr, q.z + Math.cos(o.a + t * 0.3) * rr);
            dust.alpha.setX(i, p * (0.35 + 0.35 * Math.sin(t * 2 + i)) * Math.min(1, o.k * 6));
          });
          dust.flush();
        },
      };
    },
  },

  henna: { // Arabic coffee, henna and hospitality: warm amber light, a majlis with a dallah, glowing lanterns
    light: { sky: '#ffe0b8', ground: '#5a3420', hemi: 0.4, sun: '#ffb06a', sunI: 1.7, fill: '#ff9a55', fillI: 0.55, exposure: 0.9, bg: '#2a1a12' },
    floors: { hub: '#f0c08f' },
    mood: { beams: ['#ffb066', '#fff1d6', '#ffb066'], pools: ['#ffb066', '#ffd9a0', '#fff1d6'], screenHue: 0.08, screenSat: 0.9,
      balloons: ['#e6a23c', '#c4572e', '#2f8f83'], confetti: ['#e6a23c', '#c4572e', '#2f8f83', '#fff1d6'], sparkle: '#ffd27a', sparkleGain: 1.4 },
    build(g, ctx) {
      const glows = [];
      const lantern = (p, dx, dy, h, s = 1) => {
        const glass = lit('#ffb347', 1.6); glows.push(glass);
        part(p, GEO.cyl(0.13 * s, 0.13 * s, 0.32 * s, 6), glass, dx, dy, h);
        part(p, GEO.cone(0.17 * s, 0.18 * s, 6), std('#b88a2e', { metalness: 0.7, roughness: 0.3 }), dx, dy, h + 0.25 * s);
        part(p, GEO.cyl(0.15 * s, 0.15 * s, 0.04 * s, 6), std('#b88a2e', { metalness: 0.7, roughness: 0.3 }), dx, dy, h - 0.17 * s);
        part(p, GEO.torus(0.04 * s, 0.012 * s), std('#b88a2e', { metalness: 0.7 }), dx, dy, h + 0.38 * s);
      };
      const rugTex = canvasTexture(256, (c, s) => {
        c.fillStyle = '#8f1d2c'; c.fillRect(0, 0, s, s);
        c.strokeStyle = '#e6c47e'; c.lineWidth = 6; c.strokeRect(10, 10, s - 20, s - 20);
        c.fillStyle = '#1f4f6b'; c.fillRect(26, 26, s - 52, s - 52);
        c.fillStyle = '#e6c47e';
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const x = 46 + i * 33, y = 46 + j * 33; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 9, y); c.lineTo(x, y + 9); c.lineTo(x - 9, y); c.closePath(); c.fill(); }
        c.fillStyle = '#c4572e'; c.beginPath(); c.arc(s / 2, s / 2, 34, 0, Math.PI * 2); c.fill();
      });
      const majlis = prop(g, ...STAGE, TOP);
      part(majlis, GEO.box(5.0, 0.012, 4.2), std('#ffffff', { map: rugTex, roughness: 0.95 }), 0, 0, 0.027);
      const red = std('#9c1c3a', { roughness: 0.9 }), teal = std('#1f5f6b', { roughness: 0.9 }), gold = std('#c9a14a', { metalness: 0.7, roughness: 0.3 });
      part(majlis, GEO.box(0.7, 0.18, 3.8), red, -2.15, 0, 0.12); part(majlis, GEO.box(0.25, 0.5, 3.8), teal, -2.45, 0, 0.37);
      [-1, 1].forEach((s) => { part(majlis, GEO.box(3.6, 0.18, 0.7), red, 0.2, s * 1.75, 0.12); part(majlis, GEO.box(3.6, 0.5, 0.25), teal, 0.2, s * 2.05, 0.37); });
      for (let k = 0; k < 5; k++) part(majlis, GEO.box(0.4, 0.32, 0.12), [red, gold, teal][k % 3], -2.25, -1.6 + k * 0.8, 0.45);
      part(majlis, GEO.cyl(0.55, 0.5, 0.28, 24), gold, 0.2, 0, 0.17);
      const dallah = prop(g, STAGE[0] + 0.2, STAGE[1], TOP + 0.32);
      part(dallah, GEO.cyl(0.07, 0.11, 0.2, 16), gold, 0, 0, 0.1); part(dallah, GEO.cone(0.08, 0.14, 16), gold, 0, 0, 0.27); part(dallah, GEO.sph(0.035), gold, 0, 0, 0.36);
      part(dallah, GEO.cyl(0.012, 0.02, 0.2, 6), gold, 0.11, 0, 0.18).rotation.z = -0.9;
      [[-0.25, 0.15], [-0.25, -0.15], [0.3, 0.2], [0.3, -0.2]].forEach(([dx, dy]) => part(dallah, GEO.cyl(0.03, 0.025, 0.05, 10), std('#ffffff'), dx, dy, 0.025));
      [[-2.4, -2.0], [2.4, -2.0], [-2.4, 2.0], [2.4, 2.0]].forEach(([dx, dy]) => lantern(majlis, dx, dy, 0.25, 1.1));
      // tall floor lanterns around the hall, and a lantern under every passage arch
      SPOTS.forEach(([x, y]) => { const p = prop(g, x, y); part(p, GEO.cyl(0.03, 0.05, 1.0), gold, 0, 0, 0.5); lantern(p, 0, 0, 1.2, 1.3); });
      ARCHES.forEach((y) => { const p = prop(g, 2.8, y); part(p, GEO.cyl(0.006, 0.006, 0.5), gold, 0, 0, 3.4); lantern(p, 0, 0, 3.0, 1.0); });
      return { step(dt, t) { glows.forEach((m, i) => { m.emissiveIntensity = 1.3 + Math.sin(t * 9 + i * 1.7) * 0.15 + Math.sin(t * 23 + i) * 0.1; }); } };
    },
  },

  princess: { // crowns, styling and royal photos: soft lilac light, a giant crown over the hall, a red carpet, a throne
    light: { sky: '#fff0ff', ground: '#e2c4ff', hemi: 0.52, sun: '#fff4f8', sunI: 2.2, fill: '#ffc1ec', fillI: 0.6, exposure: 0.9, bg: '#24163a' },
    floors: { hub: '#f6d6f0' },
    mood: { beams: ['#d6b3ff', '#fff3d6', '#d6b3ff'], pools: ['#d6b3ff', '#ffd1ec', '#fff3d6'], screenHue: 0.8, screenSat: 0.7,
      balloons: ['#c9a3ff', '#ffd1ec', '#e6c47e'], confetti: ['#c9a3ff', '#ffd1ec', '#e6c47e', '#ffffff'], sparkle: '#ffe6a0', sparkleGain: 1.8 },
    build(g, ctx) {
      const gold = std('#e6c47e', { metalness: 0.8, roughness: 0.25 });
      const podium = prop(g, ...STAGE, TOP);
      part(podium, GEO.cyl(0.55, 0.65, 1.1, 32), gold, 0, 0, 0.55); part(podium, GEO.cyl(0.62, 0.62, 0.06, 32), std('#ffffff', { roughness: 0.2 }), 0, 0, 1.13);
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; part(podium, GEO.ico(0.13, 0), std(['#ffb3d1', '#ffffff', '#d6b3ff', '#ff8fb8'][k % 4], { flatShading: true }), Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0.12); }
      const crown = prop(g, ...STAGE, 2.6);
      const band = part(crown, GEO.torus(0.95, 0.09, Math.PI * 2, 48), gold); band.rotation.x = Math.PI / 2;
      const rim = part(crown, GEO.torus(0.95, 0.05, Math.PI * 2, 48), gold, 0, 0, 0.18); rim.rotation.x = Math.PI / 2;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, x = Math.cos(a) * 0.95, y = Math.sin(a) * 0.95;
        part(crown, GEO.cone(0.14, 0.6, 12), gold, x, y, 0.45);
        part(crown, GEO.sph(0.08, 12), lit(['#ff3d8b', '#7a6cff', '#ffffff'][k % 3], 0.5, { metalness: 0.2, roughness: 0.15 }), x, y, 0.8);
        part(crown, GEO.sph(0.06, 10), lit(['#7a6cff', '#ff3d8b'][k % 2], 0.4), x * 1.02, y * 1.02, 0.08);
      }
      [[2.8, 8.35, 15.0], [2.8, 36.55, 15.6]].forEach(([x, y, len]) => {
        const c = prop(g, x, y);
        part(c, GEO.box(1.6, 0.012, len), std('#c1123f', { roughness: 0.9 }), 0, 0, 0.03);
        [-0.84, 0.84].forEach((d) => part(c, GEO.box(0.08, 0.014, len), gold, d, 0, 0.031));
      });
      const throne = prop(g, 48.1, 21.5, 1.0);
      const velvet = std('#7a2c9e', { roughness: 0.9 });
      part(throne, GEO.box(0.9, 0.45, 0.85), gold, 0, 0, 0.22); part(throne, GEO.box(0.8, 0.12, 0.75), velvet, -0.02, 0, 0.5);
      part(throne, GEO.box(0.14, 1.7, 0.95), gold, 0.42, 0, 0.85); part(throne, GEO.box(0.06, 1.4, 0.75), velvet, 0.35, 0, 0.85);
      [-0.45, 0.45].forEach((d) => part(throne, GEO.box(0.8, 0.3, 0.1), gold, 0, d, 0.65));
      part(throne, GEO.cone(0.18, 0.4, 5), gold, 0.42, 0, 1.9);
      let next = 0;
      return {
        step(dt, t, p) {
          crown.rotation.y = t * 0.25;
          crown.position.y = M(2.6 + Math.sin(t * 0.9) * 0.12);
          if (p > 0.9 && t > next) { next = t + 0.9; ctx.live.burst(new THREE.Vector3(toX(STAGE[0]), M(3.4), toZ(STAGE[1])), ['star', 'sparkle'], 1); }
        },
      };
    },
  },

  pajama: { // pajamas, games, snacks: an evening glow, floor pillows and a board game, a moon and stars overhead
    light: { sky: '#b8b0ff', ground: '#2e2448', hemi: 0.36, sun: '#ffcf9e', sunI: 1.15, fill: '#a98bff', fillI: 0.55, exposure: 0.9, bg: '#151a3c' },
    floors: { hub: '#d3c8f4' },
    mood: { beams: ['#b9a8ff', '#fff2c4', '#b9a8ff'], pools: ['#b9a8ff', '#ffd1ec', '#fff2c4'], screenHue: 0.7, screenSat: 0.6,
      balloons: ['#b7d8ff', '#ffd1ec', '#fff0aa'], confetti: ['#b7d8ff', '#ffd1ec', '#fff0aa', '#ffffff'], sparkle: '#fff2b0', sparkleGain: 1.8 },
    build(g) {
      const board = canvasTexture(128, (c, s) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#7a2c5e' : '#fff3f7'; c.fillRect(i * s / 8, j * s / 8, s / 8, s / 8); } });
      const den = prop(g, ...STAGE, TOP);
      part(den, GEO.cyl(2.4, 2.4, 0.012, 48), std('#e7dcff', { roughness: 1 }), 0, 0, 0.027);
      part(den, GEO.cyl(0.55, 0.5, 0.3, 32), std('#ffffff', { roughness: 0.5 }), 0, 0, 0.17);
      part(den, GEO.box(0.7, 0.01, 0.7), std('#ffffff', { map: board, roughness: 0.6 }), 0, 0, 0.325);
      [[0.15, 0.1, '#ff3d8b'], [-0.2, 0.15, '#ffffff'], [0.05, -0.2, '#ff3d8b']].forEach(([dx, dy, col]) => part(den, GEO.cyl(0.035, 0.035, 0.03, 16), std(col), dx, dy, 0.345));
      const soft = ['#ffd1ec', '#b7d8ff', '#fff0aa', '#c7efdf', '#ddcffb', '#ffd9c2'];
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; const pl = part(den, GEO.sph(0.45, 18), std(soft[k], { roughness: 0.95 }), Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0.14); pl.scale.set(1, 0.32, 0.8); pl.rotation.y = -a; }
      [[1.9, -1.1, '#ff8fb8'], [-1.8, 1.2, '#b9a8ff']].forEach(([dx, dy, col]) => { const bb = part(den, GEO.sph(0.5, 20), std(col, { roughness: 0.9 }), dx, dy, 0.3); bb.scale.set(1, 0.65, 1); });
      const sky = prop(g, ...STAGE, 4.6);
      const moonMat = lit('#fff2b0', 0.9);
      part(sky, GEO.torus(0.6, 0.22, Math.PI * 1.3, 32), moonMat, 0, 0, 0).rotation.z = 0.9;
      const starShape = new THREE.Shape();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = M(k % 2 ? 0.12 : 0.3); k ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: M(0.06), bevelEnabled: false });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2, x = Math.cos(a) * 1.7, y = Math.sin(a) * 1.7, h = -0.5 - (k % 3) * 0.35;
        part(sky, starGeo, lit('#ffe680', 0.8), x, y, h);
        part(sky, GEO.cyl(0.006, 0.006, -h + 0.6), std('#d8cfa6'), x, y, h / 2 + 0.3);
      }
      part(sky, GEO.cyl(0.006, 0.006, 1.2), std('#d8cfa6'), 0, 0, 0.9);
      // fairy lights round the den
      const bulbs = [];
      [[[12.4, 18.4], [18.6, 18.4]], [[12.4, 24.2], [18.6, 24.2]]].forEach(([a, b]) => wire(g, a, b, 2.8, 0.3, 12).forEach((v, i) => {
        const m = new THREE.Mesh(GEO.sph(0.05, 8), lit('#ffe7a8', 1.8)); m.position.copy(v); m.position.y -= M(0.06); g.add(m); bulbs.push(m);
      }));
      return { step(dt, t) { sky.rotation.y = t * 0.12; bulbs.forEach((b, i) => { b.material.emissiveIntensity = 1.2 + Math.sin(t * 2 + i * 0.7) * 0.6; }); } };
    },
  },

  japan: { // Japanese pop culture: daylight, a red torii at the entrance, cherry trees, paper lanterns, falling petals
    light: { sky: '#ffffff', ground: '#ffd3df', hemi: 0.5, sun: '#fff4ea', sunI: 2.1, fill: '#ffbfd2', fillI: 0.55, exposure: 0.88, bg: '#2a1424' },
    floors: { hub: '#ffe0e6' },
    mood: { beams: ['#ff8fb8', '#ffffff', '#ff8fb8'], pools: ['#ffb7c9', '#ffffff', '#ff8fb8'], screenHue: 0.97, screenSat: 0.8,
      balloons: ['#e8283c', '#ffffff', '#ffb7c9'], confetti: ['#ffb7c9', '#ffffff', '#e8283c', '#ffd9e2'], sparkle: '#ffe3ec' },
    build(g, ctx) {
      const red = std('#d6312f', { roughness: 0.45 }), black = std('#1d1a1c', { roughness: 0.5 });
      const torii = prop(g, 2.8, -2.8);
      [-1.9, 1.9].forEach((d) => { part(torii, GEO.cyl(0.17, 0.19, 4.2, 16), red, d, 0, 2.1); part(torii, GEO.cyl(0.24, 0.24, 0.25, 16), black, d, 0, 0.12); });
      part(torii, GEO.box(5.4, 0.3, 0.45), red, 0, 0, 4.3); part(torii, GEO.box(5.9, 0.14, 0.55), black, 0, 0, 4.52);
      part(torii, GEO.box(4.4, 0.22, 0.3), red, 0, 0, 3.55); part(torii, GEO.box(0.35, 0.6, 0.1), black, 0, 0, 3.95);
      const blossom = ['#ffb7c9', '#ffc9d6', '#ff9fb8', '#ffd9e2'];
      [[...STAGE, 1.35, TOP], [...SPOTS[0], 0.8, 0]].forEach(([x, y, s, h0]) => {
        const tr = prop(g, x, y, h0);
        part(tr, GEO.cyl(0.11 * s, 0.18 * s, 1.9 * s, 10), std('#6b4433', { roughness: 0.9 }), 0, 0, 0.95 * s);
        [[0.5, 0.2, 2.2], [-0.4, -0.3, 2.3], [0.1, 0.5, 2.6], [-0.2, 0.1, 2.9], [0.45, -0.35, 2.7], [-0.55, 0.35, 2.55], [0, -0.1, 3.15]].forEach(([dx, dy, h], k) => {
          part(tr, GEO.ico((0.5 + (k % 3) * 0.12) * s, 1), std(blossom[k % 4], { roughness: 0.8, flatShading: true }), dx * s, dy * s, h * s);
        });
      });
      ARCHES.forEach((y, i) => {
        const p = prop(g, 2.8, y);
        part(p, GEO.cyl(0.006, 0.006, 0.4), black, 0, 0, 3.45);
        const l = part(p, GEO.sph(0.22, 16), lit(i % 2 ? '#e8283c' : '#ffffff', 0.8, { roughness: 0.7 }), 0, 0, 3.0); l.scale.set(1, 1.25, 1);
        [2.72, 3.28].forEach((h) => part(p, GEO.cyl(0.13, 0.13, 0.05, 12), black, 0, 0, h));
      });
      for (let k = 0; k < 6; k++) {
        const [x, y] = onStage((k / 6) * Math.PI * 2 + 0.3, 3.0);
        const pole = prop(g, x, y, TOP);
        part(pole, GEO.cyl(0.035, 0.045, 2.2, 8), black, 0, 0, 1.1);
        const l = part(pole, GEO.sph(0.2, 16), lit(k % 2 ? '#ffffff' : '#e8283c', 0.8, { roughness: 0.7 }), 0, 0, 2.45); l.scale.set(1, 1.25, 1);
        [2.2, 2.7].forEach((h) => part(pole, GEO.cyl(0.12, 0.12, 0.05, 12), black, 0, 0, h));
      }
      // falling cherry petals all over the venue
      const petals = particles(ctx.coarse ? 70 : 150, dotTexture());
      const ps = Array.from({ length: petals.n }, () => ({ x: (Math.random() - 0.5) * W, y: Math.random() * 1.8, z: (Math.random() - 0.5) * D, s: rand(0.15, 0.3), ph: Math.random() * 6 }));
      for (let i = 0; i < petals.n; i++) { petals.tint(i, pick(blossom)); petals.size.setX(i, rand(0.06, 0.1)); }
      ctx.scene.add(petals.points);
      return {
        points: [petals],
        step(dt, t, p) {
          ps.forEach((o, i) => {
            o.y -= dt * o.s; if (o.y < 0.05) { o.y = 1.8; o.x = (Math.random() - 0.5) * W; o.z = (Math.random() - 0.5) * D; }
            petals.pos.setXYZ(i, o.x + Math.sin(t * 1.3 + o.ph) * 0.25, o.y, o.z + Math.cos(t * 0.9 + o.ph) * 0.2);
            petals.alpha.setX(i, p * clamp01((o.y - 0.05) / 0.3) * clamp01((1.8 - o.y) / 0.3) * 0.95);
          });
          petals.flush();
        },
      };
    },
  },

  camping: { // indoor camping: dusk, tents round a campfire, pine trees, string lights, fireflies
    light: { sky: '#7d93c9', ground: '#14231a', hemi: 0.3, sun: '#ffa45c', sunI: 0.95, fill: '#4a6cff', fillI: 0.4, exposure: 0.92, bg: '#0f1a2b' },
    floors: { hub: '#a8d39a' },
    mood: { beams: ['#ffb066', '#ffe7c4', '#ffb066'], beamGain: 0.6, pools: ['#ff9a3c', '#ffd27a', '#fff1d6'], poolGain: 0.7, screenHue: 0.07, screenSat: 0.8,
      balloons: ['#2f7d4f', '#ff9a3c', '#f3e6c8'], confetti: ['#2f7d4f', '#ff9a3c', '#f3e6c8', '#ffd27a'], sparkle: '#ffd27a', sparkleGain: 0.6 },
    build(g, ctx) {
      const tent = (a, col) => { // at angle a round the stage, door facing the fire
        const [x, y] = onStage(a, 2.35);
        const t = prop(g, x, y, TOP, a + Math.PI);
        const body = part(t, GEO.cyl(0.8, 0.8, 1.6, 3), std(col, { roughness: 0.85, flatShading: true }), 0, 0, 0.4); body.rotation.x = -Math.PI / 2;
        const door = part(t, new THREE.CircleGeometry(M(0.45), 3), std('#3a2a22', { side: THREE.DoubleSide }), 0, 0.81, 0.32); door.rotation.z = Math.PI / 2;
        part(t, GEO.cyl(0.02, 0.02, 1.4), std('#6b4433'), 0, 0.84, 0.7);
      };
      tent(0.05, '#ff8a3d'); tent(1.65, '#2f9e8f'); tent(3.25, '#f3e6c8'); tent(4.75, '#ff8a3d');
      const fire = prop(g, ...STAGE, TOP);
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; part(fire, GEO.ico(0.12, 0), std('#8e8a85', { flatShading: true }), Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.08); }
      [0.6, -0.6].forEach((a) => { const l = part(fire, GEO.cyl(0.07, 0.07, 0.9, 8), std('#6b4433', { roughness: 0.95 }), 0, 0, 0.1); l.rotation.set(0, a, Math.PI / 2); });
      const flame1 = part(fire, GEO.cone(0.25, 0.6, 10), lit('#ff6a1a', 2.2, { transparent: true, opacity: 0.9 }), 0, 0, 0.42);
      const flame2 = part(fire, GEO.cone(0.14, 0.45, 10), lit('#ffd23f', 2.6, { transparent: true, opacity: 0.95 }), 0, 0, 0.4);
      const glowPool = new THREE.Mesh(new THREE.PlaneGeometry(M(3.2), M(3.2)), new THREE.MeshBasicMaterial({ color: '#ff8a3d', map: dotTexture(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      glowPool.rotation.x = -Math.PI / 2; glowPool.position.y = M(0.05); fire.add(glowPool);
      [0.85, 2.45, 4.0, 5.55].forEach((a) => { const s = part(fire, GEO.cyl(0.13, 0.13, 0.75, 10), std('#7a5236', { roughness: 0.95 }), Math.sin(a) * 1.15, Math.cos(a) * 1.15, 0.13); s.rotation.set(0, a, Math.PI / 2); });
      [1.1, 2.6, 4.2, 5.5].map((a) => onStage(a, 4.2)).forEach(([x, y], i) => {
        const t = prop(g, x, y);
        part(t, GEO.cyl(0.08, 0.1, 0.5, 8), std('#6b4433'), 0, 0, 0.25);
        [[0.7, 0.9, 0.75], [0.55, 0.8, 1.25], [0.38, 0.7, 1.7]].forEach(([r, h, y0]) => part(t, GEO.cone(r, h, 9), std(i % 2 ? '#2f6b45' : '#3d7d52', { flatShading: true }), 0, 0, y0));
      });
      const bulbs = [];
      [[[12.2, 18.2], [18.8, 18.2]], [[12.2, 24.4], [18.8, 24.4]]].forEach(([a, b]) => wire(g, a, b, 2.8, 0.3, 12).forEach((v) => {
        const m = new THREE.Mesh(GEO.sph(0.05, 8), lit('#ffd27a', 1.8)); m.position.copy(v); m.position.y -= M(0.06); g.add(m); bulbs.push(m);
      }));
      // fireflies over the camp, embers over the fire
      const flies = particles(ctx.coarse ? 26 : 50, dotTexture(), { blending: THREE.AdditiveBlending });
      const fs = Array.from({ length: flies.n }, () => ({ x: toX(rand(10.5, 20.5)), y: M(rand(0.5, 2.6)), z: toZ(rand(16.5, 26)), ph: Math.random() * 6, sp: rand(0.4, 1) }));
      for (let i = 0; i < flies.n; i++) { flies.tint(i, '#d8ff6a'); flies.size.setX(i, rand(0.05, 0.09)); }
      const embers = particles(ctx.coarse ? 10 : 22, dotTexture(), { blending: THREE.AdditiveBlending });
      const es = Array.from({ length: embers.n }, () => ({ k: Math.random(), ph: Math.random() * 6 }));
      for (let i = 0; i < embers.n; i++) { embers.tint(i, '#ff9a3c'); embers.size.setX(i, rand(0.03, 0.05)); }
      ctx.scene.add(flies.points, embers.points);
      return {
        points: [flies, embers],
        step(dt, t, p) {
          const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 29) * 0.06;
          flame1.scale.set(1, f, 1); flame2.scale.set(1, 2 - f, 1);
          flame1.material.emissiveIntensity = 2.0 + Math.sin(t * 17) * 0.4;
          glowPool.material.opacity = 0.5 + Math.sin(t * 11) * 0.08;
          bulbs.forEach((b, i) => { b.material.emissiveIntensity = 1.4 + Math.sin(t * 1.5 + i) * 0.4; });
          fs.forEach((o, i) => {
            flies.pos.setXYZ(i, o.x + Math.sin(t * 0.5 * o.sp + o.ph) * 0.4, o.y + Math.sin(t * 0.8 + o.ph) * 0.1, o.z + Math.cos(t * 0.4 * o.sp + o.ph) * 0.4);
            flies.alpha.setX(i, p * Math.max(0, Math.sin(t * 1.7 * o.sp + o.ph)) * 0.95);
          });
          es.forEach((o, i) => {
            o.k = (o.k + dt * 0.5) % 1;
            embers.pos.setXYZ(i, toX(STAGE[0]) + Math.sin(o.ph + t) * 0.06 * o.k * 4, M(TOP + 0.4) + o.k * 0.7, toZ(STAGE[1]) + Math.cos(o.ph + t) * 0.06 * o.k * 4);
            embers.alpha.setX(i, p * (1 - o.k));
          });
          flies.flush(); embers.flush();
        },
      };
    },
  },

  horror: { // light, playful horror: dim green light, a mini haunted walk, floating ghosts, pumpkins, ground fog
    light: { sky: '#8fa3a0', ground: '#14141c', hemi: 0.26, sun: '#b8c7ff', sunI: 0.7, fill: '#8a3cff', fillI: 0.55, exposure: 0.92, bg: '#0c100e' },
    floors: { hub: '#a19cb3', live: '#3b2a4a' },
    mood: { beams: ['#7a3cff', '#b9ffb0', '#7a3cff'], pools: ['#7a3cff', '#5aff9a', '#b9b3d6'], screenHue: 0.33, screenSat: 0.8, flicker: 1,
      balloons: ['#1b1b1f', '#ff7a1a', '#7a3cff'], confetti: ['#1b1b1f', '#ff7a1a', '#7a3cff', '#5aff9a'], sparkle: '#b9ffb0', sparkleGain: 0.5 },
    build(g, ctx) {
      const stone = std('#8e8a99', { roughness: 0.9 });
      [0.2, 1.3, 2.4, 3.6, 4.6, 5.6].map((a, i) => [...onStage(a, 2.3), [0.2, -0.1, 0.15, -0.2, 0.05, -0.12][i], a]).forEach(([x, y, tilt, a]) => {
        const gs = prop(g, x, y, TOP, a);
        part(gs, GEO.box(0.6, 0.6, 0.15), stone, 0, 0, 0.3).rotation.x = tilt;
        part(gs, GEO.cyl(0.3, 0.3, 0.15, 16, false), stone, 0, 0, 0.6).rotation.x = Math.PI / 2;
      });
      const tree = prop(g, ...STAGE, TOP);
      const bark = std('#3a2f3f', { roughness: 0.95 });
      part(tree, GEO.cyl(0.08, 0.16, 2.2, 8), bark, 0, 0, 1.1);
      [[0.5, 0.8, 1.6, 0.9], [-0.6, 0.1, 1.9, -1.0], [0.2, -0.5, 2.1, 0.6], [-0.3, 0.4, 2.3, -0.5]].forEach(([dx, dy, h, rz]) => { const b = part(tree, GEO.cyl(0.02, 0.05, 1.0, 6), bark, dx * 0.5, dy * 0.5, h); b.rotation.set(dy * 0.8, 0, rz); });
      const arch = prop(g, ...onStage(Math.PI * 1.5, 3.0), TOP, Math.PI / 2); // the way into the haunted walk, from the hall's west side
      part(arch, GEO.torus(1.2, 0.14, Math.PI, 24), std('#1e1a24', { emissive: '#7a3cff', emissiveIntensity: 0.6 }), 0, 0, 0);
      const orange = std('#ff7a1a', { emissive: '#ff5a00', emissiveIntensity: 0.45, roughness: 0.6 }), stem = std('#3d7d52');
      [[23.8, 13.0], [34.6, 13.0], [31.0, 30.2], [10.9, 29.6], [6.0, 18.3], [6.0, 26.4], onStage(0.75, 1.3), onStage(3.9, 1.3), [43.2, 15.6], [43.2, 27.6]].forEach(([x, y], i) => {
        const pk = prop(g, x, y);
        const s = i % 3 ? 1 : 1.35;
        part(pk, GEO.sph(0.26 * s, 16), orange, 0, 0, 0.2 * s).scale.set(1, 0.75, 1);
        part(pk, GEO.cyl(0.03, 0.04, 0.12), stem, 0, 0, 0.42 * s);
      });
      const sheet = std('#ffffff', { emissive: '#e8f0ff', emissiveIntensity: 0.35, roughness: 0.8, side: THREE.DoubleSide });
      const eye = std('#111');
      const ghosts = [onStage(1.0, 1.6), onStage(4.1, 1.8), ...SPOTS].map(([x, y], i) => {
        const gh = prop(g, x, y, 2.4);
        part(gh, GEO.sph(0.28, 16), sheet, 0, 0, 0.3);
        part(gh, GEO.cone(0.36, 0.6, 16, true), sheet, 0, 0, 0.02);
        [-0.1, 0.1].forEach((d) => part(gh, GEO.sph(0.045, 8), eye, d, 0.24, 0.35));
        return { gh, x: toX(x), z: toZ(y), ph: i * 1.7 };
      });
      // ground fog drifting through the hall and the passages
      const fog = particles(ctx.coarse ? 14 : 28, dotTexture());
      const fg = Array.from({ length: fog.n }, (_, i) => ({ x: i % 4 === 0 ? toX(2.8) : toX(rand(6, 43)), z: i % 4 === 0 ? toZ(rand(1, 44)) : toZ(rand(13, 29)), ph: Math.random() * 6, s: rand(1.4, 2.4) }));
      for (let i = 0; i < fog.n; i++) { fog.tint(i, '#c9c3e6'); fog.size.setX(i, fg[i].s); }
      ctx.scene.add(fog.points);
      return {
        points: [fog],
        step(dt, t, p) {
          ghosts.forEach((o) => {
            o.gh.position.set(o.x + Math.cos(t * 0.35 + o.ph) * 0.35, M(2.4) + Math.sin(t * 1.3 + o.ph) * 0.06, o.z + Math.sin(t * 0.35 + o.ph) * 0.35);
            o.gh.rotation.y = -t * 0.35 - o.ph;
          });
          fg.forEach((o, i) => { fog.pos.setXYZ(i, o.x + Math.sin(t * 0.1 + o.ph) * 0.8, 0.12, o.z + Math.cos(t * 0.08 + o.ph) * 0.6); fog.alpha.setX(i, p * 0.16); });
          fog.flush();
          // now and then the lights flicker
          return { jitter: Math.sin(t * 0.7) > 0.93 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 40)) : 1 };
        },
      };
    },
  },
};

/* ---------- How each theme dresses the whole venue ----------
   tint: multiplied into every floor and room wall · outfits / hair / bags / hat: the visitors (crowd.js setMood)
   door(i, j): one item of the garland across every doorway · float(i): things drifting over the worlds · crest(p): on top of the stage */
const DOORWAYS = [ // plan metres, on walls along x; out = which side of the wall the garland hangs (the hall side)
  { x: 17.75, y: 12.0, w: 12.2, out: 0.4, h: 2.45 }, { x: 39.85, y: 12.0, w: 10.6, out: 0.35, h: 2.75 },
  { x: 37.1, y: 30.7, w: 8.4, out: -0.4, h: 2.45 }, { x: 14.8, y: 30.0, w: 7.6, out: -0.35, h: 2.75 },
  { x: 2.8, y: -0.25, w: 4.0, out: -0.7, h: 3.1 }, { x: 2.8, y: 45.25, w: 4.0, out: 0.7, h: 3.1 },
];
const FLOATS = [[9, 15.5], [22, 16.5], [30, 26.5], [38, 14.8], [17.7, 6.4], [39.8, 6.4], [14.8, 37.3], [37.1, 37.6], [46.5, 21.5], [2.8, 8], [2.8, 36.5], [26, 22.5], [28, 9], [10, 8], [30, 38], [20, 40]];
const starGeo = (outer, inner, depth = 0.06) => {
  const sh = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = M(k % 2 ? inner : outer); k ? sh.lineTo(Math.cos(a) * r, -Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, -Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: M(depth), bevelEnabled: false }); g.center(); return g;
};
const heartGeo = (size, depth = 0.08) => {
  const k = M(size) / 2, sh = new THREE.Shape();
  sh.moveTo(0, -k); sh.bezierCurveTo(-k * 1.6, -k * 0.2, -k * 0.9, k * 1.1, 0, k * 0.45); sh.bezierCurveTo(k * 0.9, k * 1.1, k * 1.6, -k * 0.2, 0, -k);
  const g = new THREE.ExtrudeGeometry(sh, { depth: M(depth), bevelEnabled: false, curveSegments: 12 }); g.center(); return g;
};
const group = (...meshes) => { const o = new THREE.Group(); meshes.forEach((x) => o.add(x)); return o; };
const mesh = (geo, material, dx = 0, dy = 0, h = 0) => { const x = new THREE.Mesh(geo, material); x.position.set(M(dx), M(h), M(dy)); x.castShadow = true; return x; };
const wing = (material, side) => { // a flat triangle, hinged at the body
  const w = new THREE.Mesh(new THREE.CircleGeometry(M(0.22), 3), material);
  w.rotation.x = -Math.PI / 2; const hinge = new THREE.Group(); w.position.x = side * M(0.11); hinge.add(w); return hinge;
};
const NEON = ['#ff2bd6', '#29e3ff', '#b7ff3c'];
const DRESS = {
  kpop: {
    tint: '#c9b8ff', outfits: ['#ff2bd6', '#29e3ff', '#1b1b2f', '#ffffff', '#b7ff3c', '#7a3cff'], bags: ['#ff2bd6', '#29e3ff', '#b7ff3c'], hat: 'headband',
    door: (i) => (i % 4 === 2 ? group(mesh(heartGeo(0.35), lit('#ff2bd6', 2.2), 0, 0, -0.15)) : mesh(GEO.sph(0.07, 8), lit(NEON[i % 3], 2.6))),
    float: (i) => { const o = group(mesh(heartGeo(0.8, 0.12), lit(NEON[i % 3], 1.8))); o.userData.spin = 0.8; return o; },
    crest: (c) => { c.add(mesh(starGeo(1.6, 0.7, 0.15), lit('#ff2bd6', 2.2), 0, 0, 0)); [-2.3, 2.3].forEach((d, k) => c.add(mesh(starGeo(0.7, 0.3, 0.12), lit(NEON[k + 1], 2.2), d, 0, -0.6))); },
  },
  movie: {
    tint: '#aab4dd', outfits: ['#c81d32', '#1d2a52', '#f3e6c8', '#2b1220', '#e6c47e'], bags: ['#e0182d', '#ffffff'], hat: 'glasses',
    door: (i) => (i % 3 === 1 ? group(mesh(GEO.box(0.32, 0.24, 0.04), std('#1b1b1f'), 0, 0, -0.15), mesh(GEO.box(0.22, 0.14, 0.05), lit('#e8efff', 0.9), 0, 0, -0.15)) : mesh(GEO.sph(0.065, 8), lit('#ffe7a8', 2.4))),
    float: () => {
      const silver = std('#c9ccd6', { metalness: 0.8, roughness: 0.3 });
      const reel = group(mesh(GEO.torus(0.45, 0.06), silver), mesh(GEO.cyl(0.1, 0.1, 0.08, 16), silver));
      reel.children[1].rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) { const sp = mesh(GEO.box(0.8, 0.06, 0.03), silver); sp.rotation.z = (k * Math.PI) / 3; reel.add(sp); }
      reel.userData.spin = 0.6; return reel;
    },
    crest: (c) => {
      c.add(mesh(GEO.box(3.2, 2.0, 0.2), std('#1b1b1f'), 0, 0, 0));
      const bar = group(); for (let k = 0; k < 8; k++) bar.add(mesh(GEO.box(0.42, 0.42, 0.22), std(k % 2 ? '#ffffff' : '#1b1b1f'), -1.47 + k * 0.42, 0, 0));
      bar.position.y = M(1.35); bar.rotation.z = 0.18; c.add(bar);
      c.add(mesh(GEO.box(2.6, 0.12, 0.22), lit('#ffe7a8', 1.6), 0, 0, -0.2));
    },
  },
  henna: {
    tint: '#f3cf9f', outfits: ['#1b1b1f', '#2b1220', '#1f4f6b', '#7a1f2e', '#3a2a22'], hair: ['#c9a14a', '#1f4f6b', '#7a1f2e', '#e6a23c', '#2f8f83', '#1b1b1f'], bags: ['#c9a14a', '#c4572e'], hat: 'band',
    door: (i) => (i % 2 ? mesh(GEO.sph(0.045, 8), std('#c9a14a', { metalness: 0.7, roughness: 0.3 })) : group(mesh(GEO.cyl(0.09, 0.09, 0.22, 6), lit('#ffb347', 1.6), 0, 0, -0.15), mesh(GEO.cone(0.12, 0.12, 6), std('#b88a2e', { metalness: 0.7 }), 0, 0, 0.02))),
    float: () => { const o = group(mesh(GEO.cyl(0.2, 0.2, 0.5, 6), lit('#ffb347', 1.5)), mesh(GEO.cone(0.26, 0.26, 6), std('#b88a2e', { metalness: 0.7, roughness: 0.3 }), 0, 0, 0.38), mesh(GEO.cyl(0.22, 0.22, 0.05, 6), std('#b88a2e', { metalness: 0.7 }), 0, 0, -0.27)); o.userData.spin = 0.2; return o; },
    crest: (c) => { const moon = mesh(GEO.torus(1.1, 0.25, Math.PI * 1.35, 40), lit('#e6c47e', 1.2)); moon.rotation.z = 0.9; c.add(moon); [-1.9, 0, 1.9].forEach((d, k) => c.add(mesh(GEO.cyl(0.25, 0.25, 0.6, 6), lit('#ffb347', 1.6), d, 0, k === 1 ? -1.6 : -1.2))); },
  },
  princess: {
    tint: '#f5d9ff', outfits: ['#ffd1ec', '#d6b3ff', '#ffffff', '#bfe3ff', '#fff0aa', '#ff9fc8'], bags: ['#e6c47e', '#ffffff'], hat: 'crown',
    door: (i) => (i % 4 === 2 ? mesh(heartGeo(0.26), std('#e6c47e', { metalness: 0.8, roughness: 0.25 }), 0, 0, -0.12) : mesh(GEO.ico(0.11, 0), std(['#ffb3d1', '#ffffff', '#d6b3ff', '#ff8fb8'][i % 4], { flatShading: true }))),
    float: (i) => {
      const gold = std('#e6c47e', { metalness: 0.8, roughness: 0.25 });
      if (i % 2) { const h = group(mesh(heartGeo(0.6, 0.12), lit('#ff8fb8', 0.6))); h.userData.spin = 0.6; return h; }
      const cr = group(mesh(GEO.cyl(0.3, 0.32, 0.18, 12, true), gold));
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cr.add(mesh(GEO.cone(0.06, 0.2, 8), gold, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.18)); }
      cr.userData.spin = 0.5; return cr;
    },
    crest: (c) => {
      const wall = std('#e7d2ff', { roughness: 0.5 }), roof = std('#ff8fb8', { roughness: 0.4 }), gold = std('#e6c47e', { metalness: 0.8, roughness: 0.25 });
      [[-1.5, 2.2], [0, 3.0], [1.5, 2.2]].forEach(([d, h]) => { c.add(mesh(GEO.cyl(0.45, 0.5, h, 16), wall, d, 0, h / 2 - 1.2)); c.add(mesh(GEO.cone(0.6, 0.9, 16), roof, d, 0, h - 0.75)); c.add(mesh(GEO.sph(0.08), gold, d, 0, h - 0.25)); });
      c.add(mesh(GEO.box(3.2, 1.0, 0.6), wall, 0, 0, -0.7));
    },
  },
  pajama: {
    tint: '#dcd6ff', outfits: ['#b7d8ff', '#ffd1ec', '#fff0aa', '#c7efdf', '#ddcffb', '#ffffff'], bags: ['#ffffff', '#ffd1ec'], hat: 'nightcap',
    door: (i) => (i % 2 ? mesh(starGeo(0.16, 0.07), lit('#ffe680', 1.4)) : mesh(GEO.torus(0.1, 0.035, Math.PI * 1.3, 16), lit('#fff2b0', 1.2))),
    float: (i) => {
      if (i % 3 === 2) { const st = group(mesh(starGeo(0.35, 0.15, 0.1), lit('#ffe680', 1.2))); st.userData.spin = 0.7; return st; }
      const white = std('#ffffff', { roughness: 0.95 });
      return group(mesh(GEO.sph(0.35), white, 0, 0, 0), mesh(GEO.sph(0.28), white, 0.35, 0.05, -0.05), mesh(GEO.sph(0.25), white, -0.35, -0.05, -0.06), mesh(GEO.sph(0.22), white, 0.1, 0.2, 0.1));
    },
    crest: (c) => { const moon = mesh(GEO.torus(1.15, 0.38, Math.PI * 1.3, 40), lit('#fff2b0', 1.0)); moon.rotation.z = 0.8; c.add(moon); [[-2.1, 0.5], [2.0, -0.2], [1.4, 1.1]].forEach(([d, h]) => c.add(mesh(starGeo(0.4, 0.17, 0.1), lit('#ffe680', 1.4), d, 0, h))); },
  },
  japan: {
    tint: '#ffe6ec', outfits: ['#ffb7c9', '#ffffff', '#e8283c', '#c9e7ff', '#fff0aa', '#2b1220'], bags: ['#e8283c', '#ffffff', '#ffb7c9'], hat: 'ears',
    door: (i) => (i % 3 === 1 ? group(mesh(GEO.sph(0.12, 12), lit('#e8283c', 0.7), 0, 0, -0.15)) : mesh(GEO.box(0.45, 0.55, 0.02), std(i % 2 ? '#e8283c' : '#ffffff', { roughness: 0.9, side: THREE.DoubleSide }), 0, 0, -0.32)),
    float: (i) => {
      const paper = std(i % 2 ? '#ffffff' : '#ffb7c9', { roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
      const crane = group(mesh(GEO.cone(0.06, 0.4, 4), paper)); crane.children[0].rotation.x = Math.PI / 2;
      const l = wing(paper, -1), r = wing(paper, 1); crane.add(l, r); crane.userData.wings = [l, r]; crane.userData.circle = 1; return crane;
    },
    crest: (c) => {
      c.add(mesh(GEO.cyl(1.5, 1.5, 0.15, 48), std('#ffffff', { roughness: 0.6 }))); c.children[c.children.length - 1].rotation.x = Math.PI / 2;
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + Math.PI / 2; const pe = mesh(GEO.sph(0.48, 16), std('#ffb7c9', { roughness: 0.6 }), Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62); pe.scale.set(1, 1, 0.25); pe.position.z = M(0.12); c.add(pe); }
      c.add(mesh(GEO.sph(0.22, 12), std('#e8283c'), 0, 0.15, 0));
    },
  },
  camping: {
    tint: '#d6e6c4', outfits: ['#a0302a', '#2f6b45', '#c9b38a', '#3a4a63', '#e07a2e', '#f3e6c8'], bags: ['#2f6b45', '#c9b38a'], hat: 'beanie',
    door: (i) => (i % 2 ? mesh(GEO.sph(0.06, 8), lit('#ffd27a', 2)) : mesh(GEO.ico(0.12, 0), std(i % 4 ? '#2f6b45' : '#7a5236', { flatShading: true }))),
    float: () => { const o = group(mesh(GEO.cyl(0.18, 0.13, 0.4, 12, true), lit('#ff9a3c', 1.4, { side: THREE.DoubleSide })), mesh(GEO.sph(0.06, 8), lit('#fff1c4', 2.5), 0, 0, -0.12)); return o; },
    crest: (c) => {
      [[-1.3, 1.5, 2.6], [0.4, 1.8, 3.4], [1.9, 1.2, 2.2]].forEach(([d, r, h]) => { c.add(mesh(GEO.cone(r, h, 6), std('#7d8aa3', { flatShading: true }), d, 0.1, h / 2 - 1.4)); c.add(mesh(GEO.cone(r * 0.35, h * 0.35, 6), std('#ffffff', { flatShading: true }), d, 0.05, h - 1.4 - h * 0.175 + 0.02)); });
      [-2.6, 2.8].forEach((d) => [[0.6, 0.9, -0.9], [0.45, 0.8, -0.4], [0.3, 0.7, 0.05]].forEach(([r, h, y]) => c.add(mesh(GEO.cone(r, h, 8), std('#2f6b45', { flatShading: true }), d, -0.2, y))));
    },
  },
  horror: {
    tint: '#a8a4b8', outfits: ['#1b1b1f', '#3b2a4a', '#ff7a1a', '#5a2a7a', '#2f3a33', '#ffffff'], bags: ['#ff7a1a', '#1b1b1f'], hat: 'witch',
    door: (i) => {
      if (i % 3) return mesh(GEO.cyl(0.004, 0.004, 0.5, 4), std('#e8e8f0'), 0, 0, -0.25); // cobweb strands
      const black = std('#1b1b1f', { side: THREE.DoubleSide }), bat = group(mesh(GEO.sph(0.05, 8), black)), l = wing(black, -1), r = wing(black, 1);
      bat.add(l, r); bat.scale.setScalar(0.7); bat.position.y = -M(0.2); return group(bat);
    },
    float: () => {
      const black = std('#1b1b1f', { side: THREE.DoubleSide });
      const bat = group(mesh(GEO.sph(0.07, 10), black), mesh(GEO.cone(0.025, 0.06, 4), black, -0.04, 0.03, 0.07), mesh(GEO.cone(0.025, 0.06, 4), black, 0.04, 0.03, 0.07));
      const l = wing(black, -1), r = wing(black, 1); l.scale.setScalar(1.4); r.scale.setScalar(1.4); bat.add(l, r);
      bat.userData.wings = [l, r]; bat.userData.circle = 1.6; return bat;
    },
    crest: (c) => {
      c.add(mesh(GEO.cyl(1.6, 1.6, 0.12, 48), lit('#f3f0d8', 0.9))); c.children[c.children.length - 1].rotation.x = Math.PI / 2;
      const black = std('#1b1b1f', { side: THREE.DoubleSide });
      [[-0.6, 0.4, 0.8], [0.7, -0.3, 0.6], [0.1, 0.9, 0.5]].forEach(([d, h, s]) => { const b = group(mesh(GEO.sph(0.09, 8), black)); const l = wing(black, -1), r = wing(black, 1); b.add(l, r); l.rotation.z = 0.3; r.rotation.z = -0.3; b.rotation.x = Math.PI / 2; b.scale.setScalar(s * 2.2); b.position.set(M(d), M(h), M(0.25)); c.add(b); });
    },
  },
};
/** hang the doorway garlands, the floating things and the stage crest of a theme into its group; returns what moves */
function decorate(g, d) {
  const moving = [];
  if (d.door) DOORWAYS.forEach((dw, j) => {
    const n = Math.max(5, Math.round(dw.w / 0.6));
    wire(g, [dw.x - dw.w / 2, dw.y + dw.out], [dw.x + dw.w / 2, dw.y + dw.out], dw.h, 0.35, n);
    for (let i = 0; i <= n; i++) {
      const t = i / n, o = d.door(i, j);
      o.scale.multiplyScalar(1.5); // big enough to read from the overview
      const hold = new THREE.Group(); hold.add(o);
      hold.position.set(toX(dw.x - dw.w / 2 + dw.w * t), M(dw.h - Math.sin(t * Math.PI) * 0.35 - 0.05), toZ(dw.y + dw.out));
      g.add(hold);
    }
  });
  if (d.float) FLOATS.forEach(([x, y], i) => {
    const o = d.float(i);
    o.scale.multiplyScalar(2.2);
    const hold = new THREE.Group(); hold.add(o);
    hold.position.set(toX(x), M(3.9 + (i % 3) * 0.45), toZ(y));
    g.add(hold);
    moving.push({ o, hold, base: hold.position.y, ph: i * 1.3, x: hold.position.x, z: hold.position.z });
  });
  if (d.crest) { const c = prop(g, 48.9, 21.5, 7.6, -Math.PI / 2); d.crest(c); }
  return moving;
}
const sway = (moving, t) => moving.forEach((f) => {
  f.hold.position.y = f.base + Math.sin(t * 0.8 + f.ph) * 0.06;
  if (f.o.userData.spin) f.o.rotation.y = t * f.o.userData.spin + f.ph;
  if (f.o.userData.circle) { // birds and bats fly little circles
    const r = f.o.userData.circle * 0.3;
    f.hold.position.x = f.x + Math.cos(t * 0.5 + f.ph) * r; f.hold.position.z = f.z + Math.sin(t * 0.5 + f.ph) * r;
    f.o.rotation.y = -(t * 0.5 + f.ph);
  }
  if (f.o.userData.wings) { const a = Math.sin(t * 7 + f.ph) * 0.7; f.o.userData.wings[0].rotation.z = a; f.o.userData.wings[1].rotation.z = -a; }
});

/** Mount the themed-day switcher on the tour scene. ctx: { scene, renderer, hemi, sun, fill, venue, live, stageEl, coarse, reduced } */
export function mountThemes(ctx) {
  const { renderer, hemi, sun, fill, venue, live, stageEl } = ctx;
  const floors = {};
  venue.root.traverse((o) => { if (o.userData.floor && !floors[o.userData.floor]) floors[o.userData.floor] = { mat: o.material, base: o.material.color.clone() }; });
  // room walls (and the pieces painted the same colour, like the portals): their own colour, tinted for a themed day
  const wallHex = new Set(['passage', 'make', 'market', 'beauty', 'move'].map((z) => new THREE.Color(LOOK[z].wall).getHexString()));
  const walls = [];
  venue.root.traverse((o) => { if (o.isMesh && !o.userData.floor && wallHex.has(o.material.color.getHexString()) && !walls.some((w) => w.mat === o.material)) walls.push({ mat: o.material, base: o.material.color.clone() }); });
  const cur = {
    sky: hemi.color.clone(), ground: hemi.groundColor.clone(), hemi: hemi.intensity, sun: sun.color.clone(), sunI: sun.intensity,
    fill: fill.color.clone(), fillI: fill.intensity, exposure: renderer.toneMappingExposure,
    bg: ctx.scene.background?.isColor ? ctx.scene.background.clone() : new THREE.Color(EVERYDAY.bg),
  };
  const target = {};
  const built = {}; // id → { group, api, items, p, from, since }
  let active = 'default';
  let last = performance.now() / 1000;
  const now = () => performance.now() / 1000; // real time: a slow device or a background tab still finishes the switch on time
  // the everyday decorations of the hub's activation stage (tree, panels, podiums) step aside on a themed day
  const act = venue.activation ? { items: venue.activation.children.slice(), p: 1, from: 1, since: now() } : null;
  act?.items.forEach((o) => { o.userData.s0 = o.scale.clone(); });

  const build = (id) => {
    if (built[id] || !THEMES[id].build) return built[id];
    const group = new THREE.Group();
    ctx.scene.add(group);
    const api = THEMES[id].build(group, ctx) || {};
    const moving = DRESS[id] ? decorate(group, DRESS[id]) : [];
    const inner = api.step;
    api.step = (dt, t, p) => { sway(moving, t); return inner?.(dt, t, p); };
    const items = group.children.slice(); // each pops in on its own
    items.forEach((o) => { o.userData.s0 = o.scale.clone(); });
    (api.points || []).forEach((pool) => { for (let i = 0; i < pool.n; i++) pool.alpha.setX(i, 0); pool.flush(); });
    built[id] = { group, api, items, p: 0, from: 0, since: now() };
    return built[id];
  };
  const aim = (id) => {
    const L = THEMES[id].light;
    Object.assign(target, { sky: new THREE.Color(L.sky), ground: new THREE.Color(L.ground), hemi: L.hemi, sun: new THREE.Color(L.sun), sunI: L.sunI, fill: new THREE.Color(L.fill), fillI: L.fillI, exposure: L.exposure, bg: new THREE.Color(L.bg || EVERYDAY.bg) });
    target.floors = {};
    const tint = DRESS[id]?.tint ? new THREE.Color(DRESS[id].tint) : null;
    Object.entries(floors).forEach(([zone, f]) => { target.floors[zone] = THEMES[id].floors?.[zone] ? new THREE.Color(THEMES[id].floors[zone]) : tint ? f.base.clone().multiply(tint) : f.base.clone(); });
    target.walls = walls.map((w) => (tint ? w.base.clone().multiply(tint) : w.base.clone()));
  };
  const ease = (k) => {
    cur.sky.lerp(target.sky, k); cur.ground.lerp(target.ground, k); cur.bg.lerp(target.bg, k); cur.sun.lerp(target.sun, k); cur.fill.lerp(target.fill, k);
    cur.hemi += (target.hemi - cur.hemi) * k; cur.sunI += (target.sunI - cur.sunI) * k; cur.fillI += (target.fillI - cur.fillI) * k; cur.exposure += (target.exposure - cur.exposure) * k;
    Object.entries(target.floors).forEach(([zone, c]) => floors[zone].mat.color.lerp(c, k));
    walls.forEach((w, i) => w.mat.color.lerp(target.walls[i], k));
  };
  const apply = (jitter = 1) => {
    hemi.color.copy(cur.sky); hemi.groundColor.copy(cur.ground); hemi.intensity = cur.hemi * jitter;
    sun.color.copy(cur.sun); sun.intensity = cur.sunI * jitter; fill.color.copy(cur.fill); fill.intensity = cur.fillI;
    renderer.toneMappingExposure = cur.exposure;
    if (ctx.scene.background?.isColor) ctx.scene.background.copy(cur.bg); // the sky (and the haze over the far lawns)
    ctx.scene.fog?.color.copy(cur.bg);
  };
  const pop = (b) => {
    const n = b.items.length, d = Math.min(0.03, 0.5 / Math.max(1, n));
    b.items.forEach((o, i) => {
      const f = back(clamp01((b.p - i * d) / Math.max(0.2, 1 - (n - 1) * d)));
      if (!o.userData.fixed) o.scale.copy(o.userData.s0).multiplyScalar(Math.max(0.0001, f));
    });
    b.group.visible = b.p > 0.001;
    (b.api.points || []).forEach((pool) => { pool.points.visible = b.group.visible; });
  };
  aim('default');

  return {
    get active() { return active; },
    set(id) {
      if (!THEMES[id] || id === active) return;
      active = id;
      stageEl.dataset.theme = id;
      build(id);
      Object.values(built).forEach((b) => { b.from = b.p; b.since = now(); });
      if (act) { act.from = act.p; act.since = now(); }
      aim(id);
      const dress = DRESS[id] || {};
      live.setMood(id === 'default' ? {} : { ...THEMES[id].mood, outfits: dress.outfits, hair: dress.hair, bags: dress.bags, hat: dress.hat });
      if (ctx.reduced()) this.step(0, performance.now() / 1000, true);
    },
    step(dt, t, instant = false) {
      const tn = now(), real = Math.min(0.5, tn - last);
      last = tn;
      const k = instant || ctx.reduced() ? 1 : 1 - Math.exp(-3.5 * real);
      ease(k);
      let jitter = 1;
      if (act) {
        const want = active === 'default' ? 1 : 0;
        act.p = instant || ctx.reduced() ? want : act.from + (want - act.from) * clamp01((tn - act.since) / 0.5);
        const f = Math.max(0.0001, back(clamp01(act.p)));
        act.items.forEach((o) => o.scale.copy(o.userData.s0).multiplyScalar(f));
        venue.activation.visible = act.p > 0.001;
      }
      Object.entries(built).forEach(([id, b]) => {
        const want = id === active ? 1 : 0;
        b.p = instant || ctx.reduced() ? want : b.from + (want - b.from) * clamp01((tn - b.since) / 0.6);
        pop(b);
        if (b.group.visible && b.api.step && !ctx.reduced()) { const r = b.api.step(dt, t, b.p); if (id === active && r?.jitter) jitter = r.jitter; }
      });
      apply(jitter);
    },
  };
}

export const THEME_IDS = Object.keys(THEMES);
