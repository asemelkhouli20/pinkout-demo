// PinkOut Partners — themed days on the venue map (event tour). "Every day" is the venue as built (the default);
// a theme dresses it for that day:
//   light   — the mood of the room (sky, sun, fill, exposure) and the stage background (CSS, via data-theme)
//   colours — a few things change colour: the hall floor, balloons, stage beams and light pools, the LED screen, confetti, sparkle
//   props   — its own things (a glowing dance floor, tents and a campfire, a torii gate, ghosts and pumpkins…)
//   effect  — something always moving (cherry petals, fireflies, fog, projector dust, flickering lanterns…)
// Themes follow the knowledge base's themed-day concepts (plus sport, gaming, anime, art, fashion, science, travel and other days added for partners). Each theme takes over the Rose Hub activation stage (the
// "space for changing pop-ups", seen from the overview and the Rose Hub stop): the everyday tree and panels step aside
// for the theme's centrepiece. More props sit in the passages, at PinkOut Live and around the hall (plan metres).
// Each theme's props are built the first time it is picked; switching pops them in and out, and the light eases over.
import * as THREE from './vendor/three.module.min.js?v=1';
import { toX, toZ, U, W, D, back, LOOK } from './venue.js?v=32';
import { particles, dotTexture } from './crowd.js?v=38';

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

  gaming: { // gaming and e-sports: an RGB night, gaming stations round a giant controller on the hub stage, arcade cabinets, pixels rising
    light: { sky: '#7f8cff', ground: '#0d1030', hemi: 0.34, sun: '#a9b8ff', sunI: 1.0, fill: '#00e5ff', fillI: 0.85, exposure: 0.95, bg: '#0a0d2a' },
    floors: { hub: '#9aa6ff', live: '#1d2350' },
    mood: { beams: ['#00e5ff', '#ff2bd6', '#7cff4f'], beamGain: 1.5, pools: ['#00e5ff', '#ff2bd6', '#7cff4f'], poolGain: 1.4, screenHue: 0.55,
      balloons: ['#00e5ff', '#ff2bd6', '#7cff4f'], confetti: ['#00e5ff', '#ff2bd6', '#7cff4f', '#ffe600', '#ffffff'], sparkle: '#9ff3ff', sparkleGain: 1.2 },
    build(g, ctx) {
      const RGB = ['#00e5ff', '#ff2bd6', '#7cff4f', '#ffe600'];
      const dark = std('#1a1d2e', { metalness: 0.4, roughness: 0.4 });
      const screens = [];
      for (let k = 0; k < 6; k++) { // six stations round the stage, players facing out to the hall
        const a = (k / 6) * Math.PI * 2 + 0.5;
        const st = prop(g, ...onStage(a, 2.3), TOP, a);
        part(st, GEO.box(1.1, 0.06, 0.55), dark, 0, 0.15, 0.75);
        [-0.5, 0.5].forEach((d) => part(st, GEO.box(0.05, 0.72, 0.5), dark, d, 0.15, 0.37));
        screens.push(part(st, GEO.box(0.85, 0.48, 0.04), lit(RGB[k % 4], 1.5), 0, 0.38, 1.12));
        part(st, GEO.box(0.5, 0.1, 0.5), std(RGB[k % 4], { roughness: 0.5 }), 0, -0.45, 0.48);
        part(st, GEO.box(0.5, 0.75, 0.1), dark, 0, -0.72, 0.9);
        part(st, GEO.box(0.12, 0.6, 0.11), std(RGB[k % 4]), 0, -0.72, 0.9);
      }
      const pad = prop(g, ...STAGE, 2.5); // the giant controller, turning over the stage
      const shell = std('#f2f2f7', { roughness: 0.35 });
      part(pad, GEO.box(1.4, 0.3, 0.8), shell);
      [-0.72, 0.72].forEach((d) => part(pad, GEO.sph(0.42, 20), shell, d, 0.25, -0.02).scale.set(1, 0.7, 1.25));
      part(pad, GEO.box(0.42, 0.1, 0.13), dark, -0.45, 0, 0.18); part(pad, GEO.box(0.13, 0.1, 0.42), dark, -0.45, 0, 0.18);
      [[0.45, -0.14], [0.59, 0], [0.45, 0.14], [0.31, 0]].forEach(([dx, dy], k) => part(pad, GEO.cyl(0.06, 0.06, 0.08, 14), lit(RGB[k], 1.6), dx, dy, 0.18));
      [-0.2, 0.2].forEach((d) => part(pad, GEO.cyl(0.08, 0.1, 0.12, 14), dark, d, 0.22, 0.2));
      const ring = part(prop(g, ...STAGE, TOP), GEO.torus(3.2, 0.06, Math.PI * 2, 64), lit('#00e5ff', 2.2), 0, 0, 0.06); ring.rotation.x = Math.PI / 2;
      // arcade cabinets in the hall
      SPOTS.forEach(([x, y], k) => {
        const cab = prop(g, x, y, 0, k * 1.3);
        part(cab, GEO.box(0.8, 1.8, 0.7), std(['#3a1d6e', '#1d2a6e', '#6e1d4f'][k], { roughness: 0.5 }), 0, 0, 0.9);
        part(cab, GEO.box(0.6, 0.45, 0.02), lit(RGB[k], 1.4), 0, 0.36, 1.35);
        part(cab, GEO.box(0.78, 0.2, 0.05), lit(RGB[(k + 1) % 4], 2), 0, 0.34, 1.72);
        part(cab, GEO.box(0.8, 0.08, 0.3), dark, 0, 0.45, 0.98);
      });
      // pixels rising from the stage
      const n = ctx.coarse ? 24 : 48;
      const pix = new THREE.InstancedMesh(GEO.box(0.16, 0.16, 0.16), new THREE.MeshBasicMaterial({ color: '#ffffff' }), n);
      const ps = Array.from({ length: n }, (_, i) => ({ a: rand(0, Math.PI * 2), r: rand(0.5, 6), k: Math.random(), sp: rand(0.12, 0.25) }));
      ps.forEach((_, i) => pix.setColorAt(i, new THREE.Color(RGB[i % 4])));
      const hold = prop(g, ...STAGE, TOP); hold.add(pix);
      const m4 = new THREE.Matrix4();
      let next = 0;
      return {
        step(dt, t, p) {
          pad.rotation.y = t * 0.4; pad.rotation.x = -0.45 + Math.sin(t * 0.8) * 0.1;
          pad.position.y = M(2.5 + Math.sin(t * 1.1) * 0.12);
          ring.material.emissive.setHSL((t * 0.12) % 1, 1, 0.5); ring.material.color.copy(ring.material.emissive);
          screens.forEach((s, i) => { s.material.emissiveIntensity = 1.2 + Math.sin(t * 6 + i * 2) * 0.4; });
          ps.forEach((o, i) => {
            o.k = (o.k + dt * o.sp) % 1;
            const s = Math.sin(o.k * Math.PI);
            m4.makeScale(s, s, s).setPosition(M(Math.sin(o.a) * o.r), M(o.k * 5.5), M(Math.cos(o.a) * o.r));
            pix.setMatrixAt(i, m4);
          });
          pix.instanceMatrix.needsUpdate = true;
          if (p > 0.9 && t > next) { next = t + 0.9; const [x, y] = onStage(rand(0, Math.PI * 2), 2.4); ctx.live.burst(new THREE.Vector3(toX(x), M(1.6), toZ(y)), ['star', 'sparkle'], 2); }
        },
      };
    },
  },

  anime: { // anime and manga: candy-bright light, a giant magic wand on the hub stage, manga panels round it, sparkles spiralling up
    light: { sky: '#ffe0fb', ground: '#4a2a6a', hemi: 0.48, sun: '#fff2fb', sunI: 1.9, fill: '#8fd8ff', fillI: 0.7, exposure: 0.92, bg: '#2a1440' },
    floors: { hub: '#ffd0f0' },
    mood: { beams: ['#ff7ac8', '#7ad7ff', '#ffe066'], pools: ['#ff7ac8', '#7ad7ff', '#ffffff'], screenHue: 0.86, screenSat: 0.8,
      balloons: ['#ff7ac8', '#7ad7ff', '#ffe066', '#b18bff'], confetti: ['#ff7ac8', '#7ad7ff', '#ffe066', '#b18bff', '#ffffff'], sparkle: '#fff2a8', sparkleGain: 1.8 },
    build(g, ctx) {
      const manga = canvasTexture(256, (c, s) => { // a manga page: panels, speed lines, halftone, a big star
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, s, s);
        c.strokeStyle = '#1b1b1f'; c.lineWidth = 2;
        for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; c.beginPath(); c.moveTo(s / 2 + Math.cos(a) * 40, s * 0.62 + Math.sin(a) * 40); c.lineTo(s / 2 + Math.cos(a) * 200, s * 0.62 + Math.sin(a) * 200); c.stroke(); }
        c.fillStyle = '#ff7ac8'; for (let i = 0; i < 12; i++) for (let j = 0; j < 5; j++) { c.beginPath(); c.arc(14 + i * 21, 14 + j * 16, 4, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#ffe066'; c.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 18 : 40; c.lineTo(s / 2 + Math.cos(a) * r, s * 0.62 + Math.sin(a) * r); }
        c.fill(); c.stroke();
        c.lineWidth = 8; c.strokeRect(4, 4, s - 8, s - 8); c.beginPath(); c.moveTo(4, 92); c.lineTo(s - 4, 92); c.moveTo(128, 4); c.lineTo(110, 92); c.stroke();
      });
      const page = std('#ffffff', { map: manga, roughness: 0.8 });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.6;
        const b = prop(g, ...onStage(a, 2.9), TOP, a);
        part(b, GEO.box(1.3, 1.7, 0.05), page, 0, 0, 1.15);
        [-0.6, 0.6].forEach((d) => part(b, GEO.cyl(0.03, 0.03, 1.1), std('#ff7ac8'), d, -0.08, 0.3));
      }
      const wand = prop(g, ...STAGE, TOP);
      part(wand, GEO.cyl(0.06, 0.08, 3.0, 12), std('#ffffff', { roughness: 0.3 }), 0, 0, 1.5);
      for (let k = 0; k < 6; k++) part(wand, GEO.torus(0.09, 0.025), std('#ff7ac8'), 0, 0, 0.4 + k * 0.45).rotation.x = Math.PI / 2;
      part(wand, GEO.cyl(0.5, 0.6, 0.15, 24), std('#b18bff', { roughness: 0.4 }), 0, 0, 0.08);
      const top = prop(g, ...STAGE, TOP + 3.45);
      part(top, starGeo(0.95, 0.42, 0.2), lit('#ffe066', 1.2, { metalness: 0.3, roughness: 0.3 }));
      part(top, heartGeo(0.5, 0.22), lit('#ff3d8b', 1.0), 0, 0.12, 0);
      const halo = part(top, GEO.torus(1.25, 0.04, Math.PI * 2, 48), lit('#7ad7ff', 2.2));
      // sparkles spiralling up round the wand
      const sp = particles(ctx.coarse ? 30 : 60, dotTexture(), { blending: THREE.AdditiveBlending });
      const ss = Array.from({ length: sp.n }, () => ({ k: Math.random(), a: rand(0, 6.3) }));
      const pastel = ['#ff7ac8', '#7ad7ff', '#ffe066', '#b18bff', '#ffffff'];
      for (let i = 0; i < sp.n; i++) { sp.tint(i, pick(pastel)); sp.size.setX(i, rand(0.06, 0.11)); }
      ctx.scene.add(sp.points);
      let next = 0;
      return {
        points: [sp],
        step(dt, t, p) {
          top.rotation.y = t * 0.9; halo.rotation.x = Math.sin(t * 0.7) * 0.6;
          top.position.y = M(TOP + 3.45 + Math.sin(t * 1.4) * 0.1);
          ss.forEach((o, i) => {
            o.k = (o.k + dt * 0.18) % 1;
            const a = o.a + o.k * 9, r = M(0.4 + o.k * 1.4);
            sp.pos.setXYZ(i, toX(STAGE[0]) + Math.sin(a) * r, M(TOP + o.k * 4.2), toZ(STAGE[1]) + Math.cos(a) * r);
            sp.alpha.setX(i, p * Math.sin(o.k * Math.PI) * (0.6 + 0.4 * Math.sin(t * 8 + i)));
          });
          sp.flush();
          if (p > 0.9 && t > next) { next = t + 0.7; ctx.live.burst(new THREE.Vector3(toX(STAGE[0]), M(3.6), toZ(STAGE[1])), ['heart', 'star', 'sparkle'], 2); }
        },
      };
    },
  },

  padel: { // padel and sports: a bright day, a mini padel court on the hub stage with a rally that never ends, ball baskets
    light: { sky: '#ffffff', ground: '#2f5d4a', hemi: 0.55, sun: '#fff6e8', sunI: 2.2, fill: '#9fd8ff', fillI: 0.5, exposure: 0.88, bg: '#3d7fb8' },
    floors: { hub: '#bfe3f0' },
    mood: { beams: ['#e6ff3c', '#ffffff', '#2f7fd1'], pools: ['#e6ff3c', '#9fd8ff', '#ffffff'], screenHue: 0.58, screenSat: 0.8,
      balloons: ['#2f7fd1', '#e6ff3c', '#ffffff'], confetti: ['#2f7fd1', '#e6ff3c', '#ffffff', '#ff6f61'], sparkle: '#ffffff', sparkleGain: 0.6 },
    build(g, ctx) {
      const court = prop(g, ...STAGE, TOP);
      const white = std('#ffffff', { roughness: 0.5 });
      part(court, GEO.box(5.6, 0.02, 3.0), std('#2f7fd1', { roughness: 0.95 }), 0, 0, 0.02);
      [[0, -1.47, 5.6, 0.06], [0, 1.47, 5.6, 0.06], [-2.77, 0, 0.06, 3.0], [2.77, 0, 0.06, 3.0], [-1.6, 0, 0.05, 3.0], [1.6, 0, 0.05, 3.0], [0, 0, 3.2, 0.05]].forEach(([dx, dy, w, d]) => part(court, GEO.box(w, 0.01, d), white, dx, dy, 0.035));
      part(court, GEO.box(0.03, 0.85, 3.0), std('#1b1b1f', { transparent: true, opacity: 0.55, depthWrite: false }), 0, 0, 0.45);
      part(court, GEO.box(0.05, 0.06, 3.05), white, 0, 0, 0.88);
      [-1.52, 1.52].forEach((d) => part(court, GEO.cyl(0.04, 0.04, 0.95), std('#1b1b1f'), 0, d, 0.47));
      const glass = std('#cfefff', { transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
      [-2.8, 2.8].forEach((d) => { part(court, GEO.box(0.04, 1.5, 3.0), glass, d, 0, 0.77); part(court, GEO.box(0.08, 0.08, 3.0), std('#1b1b1f'), d, 0, 1.52); });
      const ballMat = lit('#e6ff3c', 0.35, { roughness: 0.7 });
      const ball = part(court, GEO.sph(0.11, 14), ballMat, 0, 0, 0.5);
      const racket = (side) => {
        const r = new THREE.Group(); r.position.set(M(side * 2.35), M(1.0), 0); court.add(r);
        const head = new THREE.Mesh(GEO.cyl(0.24, 0.24, 0.05, 24), std(side < 0 ? '#ff6f61' : '#1b1b1f', { roughness: 0.4 })); head.rotation.z = Math.PI / 2; head.position.y = M(0.25); r.add(head);
        const grip = new THREE.Mesh(GEO.cyl(0.03, 0.03, 0.3, 8), white); grip.position.y = M(-0.1); r.add(grip);
        return r;
      };
      const rk = [racket(-1), racket(1)];
      SPOTS.forEach(([x, y]) => { // baskets of balls
        const b = prop(g, x, y);
        part(b, GEO.cyl(0.3, 0.25, 0.6, 16, true), std('#1b1b1f', { wireframe: true }), 0, 0, 0.5);
        part(b, GEO.cyl(0.02, 0.02, 0.5), std('#1b1b1f'), 0, 0, 0.25);
        for (let k = 0; k < 10; k++) part(b, GEO.sph(0.07, 10), ballMat, rand(-0.18, 0.18), rand(-0.18, 0.18), rand(0.4, 0.8));
      });
      let lastHit = 0;
      return {
        step(dt, t, p) {
          const P = 1.3, n = Math.floor(t / P), k = (t / P) % 1, dir = n % 2 ? 1 : -1;
          const k2 = (k * 2) % 1, h = k < 0.5 ? 0.9 + Math.sin(k2 * Math.PI) * 0.7 - k2 * 0.8 : 0.1 + Math.sin(k2 * Math.PI) * 0.9; // over the net, one bounce
          ball.position.set(M(dir * (-2.2 + k * 4.4)), M(Math.max(0.1, h + (k < 0.5 ? 0 : k2 * 0.8))), M(Math.sin(n * 2.3) * 0.8 * (k - 0.5)));
          rk.forEach((r, i) => { const near = (i === 0) === (dir > 0) ? k : 1 - k; r.rotation.y = (i ? -1 : 1) * Math.max(0, 1 - near * 6) * 1.2; });
          if (p > 0.9 && n !== lastHit) { lastHit = n; ctx.live.burst(new THREE.Vector3(toX(STAGE[0] - dir * 2.3), M(1.4), toZ(STAGE[1])), ['star'], 1); }
        },
      };
    },
  },

  football: { // football night: floodlights, a pitch on the hub stage, Team Pink and Team Mint flags in the audience, a goal now and then
    light: { sky: '#c8d8ff', ground: '#0f2a1a', hemi: 0.38, sun: '#f2f6ff', sunI: 2.0, fill: '#7affc8', fillI: 0.5, exposure: 0.95, bg: '#0b1a2a' },
    floors: { hub: '#8fd49c', live: '#1e5a34' },
    mood: { beams: ['#ffffff', '#7affc8', '#ff3d8b'], pools: ['#ffffff', '#7affc8', '#ff3d8b'], screenHue: 0.33, screenSat: 0.7,
      balloons: ['#ff3d8b', '#3fe0a8', '#ffffff'], confetti: ['#ff3d8b', '#3fe0a8', '#ffffff', '#ffe600'], sparkle: '#ffffff', sparkleGain: 0.7 },
    build(g, ctx) {
      const white = std('#ffffff', { roughness: 0.5 });
      const pitch = prop(g, ...STAGE, TOP);
      part(pitch, GEO.cyl(3.2, 3.2, 0.02, 48), std('#3f9f4f', { roughness: 0.95 }), 0, 0, 0.02);
      const circle = part(pitch, GEO.torus(0.9, 0.03, Math.PI * 2, 40), white, 0, 0, 0.035); circle.rotation.x = Math.PI / 2;
      part(pitch, GEO.box(0.05, 0.01, 5.6), white, 0, 0, 0.035);
      const goals = [-2.5, 2.5].map((d) => {
        const gl = new THREE.Group(); gl.position.set(M(d), 0, 0); pitch.add(gl);
        [-0.9, 0.9].forEach((w) => { const post = new THREE.Mesh(GEO.cyl(0.04, 0.04, 1.0, 8), white); post.position.set(0, M(0.5), M(w)); gl.add(post); });
        const bar = new THREE.Mesh(GEO.box(0.08, 0.08, 1.88), white); bar.position.y = M(1.0); gl.add(bar);
        const net = new THREE.Mesh(GEO.box(0.6, 1.0, 1.8), std('#ffffff', { wireframe: true })); net.position.set(M(Math.sign(d) * 0.3), M(0.5), 0); gl.add(net);
        return d;
      });
      const ball = football(0.28); ball.position.y = M(0.3); pitch.add(ball);
      // floodlight towers in the hall, aimed at the pitch
      SPOTS.forEach(([x, y]) => {
        const tw = prop(g, x, y);
        part(tw, GEO.cyl(0.07, 0.1, 4.8, 8), std('#c9ccd6', { metalness: 0.6 }), 0, 0, 2.4);
        const lamp = part(tw, GEO.box(0.9, 0.6, 0.12), lit('#ffffff', 2.4), 0, 0, 4.9);
        lamp.lookAt(new THREE.Vector3(toX(STAGE[0]), 0, toZ(STAGE[1])));
        const from = new THREE.Vector3(toX(x), M(4.9), toZ(y)), to = new THREE.Vector3(toX(STAGE[0]), 0, toZ(STAGE[1]));
        const dir = to.clone().sub(from), len = dir.length();
        const geo = new THREE.ConeGeometry(M(1.6), len, 24, 1, true); geo.translate(0, -len / 2, 0);
        const beam = new THREE.Mesh(geo, beamMaterial('#f2f6ff', 0.12));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
        const h = new THREE.Group(); h.position.copy(from); h.add(beam); g.add(h);
      });
      // team flags in the audience
      const flags = SEATS.filter((s) => (s.c + s.r) % 2 === 0).map((s, i) => {
        const f = prop(g, s.x + 0.12, s.y, 1.1);
        part(f, GEO.cyl(0.012, 0.012, 0.6), std('#ddd'), 0, 0, 0.3);
        const cloth = part(f, new THREE.PlaneGeometry(M(0.36), M(0.24)), std(i % 2 ? '#3fe0a8' : '#ff3d8b', { side: THREE.DoubleSide }), 0.18, 0, 0.5);
        return f;
      });
      let lastGoal = -1, flash = 0;
      return {
        step(dt, t, p) {
          const P = 6, n = Math.floor(t / P), k = (t / P) % 1, side = goals[n % 2];
          const run = clamp01((k - 0.2) / 0.25), back = clamp01((k - 0.7) / 0.2);
          ball.position.set(M(side * 1.08 * run * (1 - back)), M(0.3 + Math.sin(run * Math.PI) * 0.5 * (1 - back)), 0);
          ball.rotation.z = -Math.sign(side) * run * 8; ball.rotation.y = t * 0.3;
          if (k > 0.45 && n !== lastGoal) { lastGoal = n; flash = 0.35; if (p > 0.9) ctx.live.burst(new THREE.Vector3(toX(STAGE[0] + side), M(1.5), toZ(STAGE[1])), ['star', 'heart', 'sparkle'], 6); }
          flash = Math.max(0, flash - dt);
          flags.forEach((f, i) => { f.rotation.x = Math.sin(t * (flash > 0 ? 10 : 3) + i * 0.7) * (flash > 0 ? 0.6 : 0.25); });
          return { jitter: flash > 0 ? 1.25 : 1 }; // the floodlights flare for a goal
        },
      };
    },
  },

  space: { // galaxy night: deep violet light, a ringed planet over the hub stage with moons, a rocket, stars twinkling everywhere
    light: { sky: '#8b8cff', ground: '#0a0820', hemi: 0.32, sun: '#c9c4ff', sunI: 1.0, fill: '#b44cff', fillI: 0.8, exposure: 0.95, bg: '#05041a' },
    floors: { hub: '#9a90e0', live: '#1c1640' },
    mood: { beams: ['#b44cff', '#4cc9ff', '#ffffff'], beamGain: 1.3, pools: ['#b44cff', '#4cc9ff', '#ffffff'], screenHue: 0.72, screenSat: 0.8,
      balloons: ['#b44cff', '#4cc9ff', '#c9ccd6'], confetti: ['#b44cff', '#4cc9ff', '#ffffff', '#ffe066'], sparkle: '#e0d8ff', sparkleGain: 1.6 },
    build(g, ctx) {
      const bands = canvasTexture(128, (c, s) => { ['#ff8fd8', '#b44cff', '#7a5cff', '#ffc6ec', '#4cc9ff', '#b44cff', '#ff8fd8', '#ffd6a8'].forEach((col, i) => { c.fillStyle = col; c.fillRect(0, (i * s) / 8, s, s / 8 + 1); }); });
      const planet = prop(g, ...STAGE, TOP + 2.7);
      const globe = part(planet, GEO.sph(1.1, 32), std('#ffffff', { map: bands, roughness: 0.6, emissive: '#3a1a6a', emissiveIntensity: 0.4 }));
      const ring = part(planet, GEO.torus(1.75, 0.16, Math.PI * 2, 64), lit('#ffd6f5', 0.6, { roughness: 0.4 })); ring.rotation.x = Math.PI / 2 - 0.35; ring.scale.set(1, 1, 0.25);
      const moons = [0.25, 0.18].map((r, k) => part(planet, GEO.sph(r, 16), std(k ? '#c9ccd6' : '#ffe066', { emissive: k ? '#555' : '#ffb000', emissiveIntensity: 0.4 })));
      part(prop(g, ...STAGE, TOP), GEO.cyl(0.08, 0.3, 1.6, 12), std('#c9ccd6', { metalness: 0.7, roughness: 0.3 }), 0, 0, 0.8);
      const rocket = prop(g, ...onStage(2.2, 2.4), TOP);
      part(rocket, GEO.cyl(0.32, 0.36, 2.0, 20), std('#ffffff', { roughness: 0.35 }), 0, 0, 1.3);
      part(rocket, GEO.cone(0.32, 0.8, 20), std('#ff3d8b', { roughness: 0.4 }), 0, 0, 2.7);
      part(rocket, GEO.cyl(0.13, 0.13, 0.05, 16), lit('#4cc9ff', 1.6), 0, 0.33, 1.7).rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; part(rocket, GEO.box(0.06, 0.6, 0.45), std('#ff3d8b'), Math.sin(a) * 0.4, Math.cos(a) * 0.4, 0.45).rotation.y = a; }
      const flame = part(rocket, GEO.cone(0.22, 0.5, 12), lit('#ffb03c', 2.4, { transparent: true, opacity: 0.85 }), 0, 0, 0.2); flame.rotation.x = Math.PI;
      // stars over every world, twinkling
      const stars = particles(ctx.coarse ? 70 : 150, dotTexture(), { blending: THREE.AdditiveBlending });
      const st = Array.from({ length: stars.n }, () => ({ x: (Math.random() - 0.5) * W * 1.1, y: rand(1.5, 2.6), z: (Math.random() - 0.5) * D * 1.1, ph: rand(0, 6), sp: rand(1, 3) }));
      for (let i = 0; i < stars.n; i++) { stars.tint(i, pick(['#ffffff', '#e0d8ff', '#bfe9ff', '#ffe6f5'])); stars.size.setX(i, rand(0.05, 0.11)); }
      ctx.scene.add(stars.points);
      return {
        points: [stars],
        step(dt, t, p) {
          globe.rotation.y = t * 0.3; planet.position.y = M(TOP + 2.7 + Math.sin(t * 0.8) * 0.1);
          moons.forEach((m, k) => { const a = t * (0.7 - k * 0.25) + k * 3; m.position.set(M(Math.cos(a) * (2.3 + k * 0.5)), M(Math.sin(a) * 0.5), M(Math.sin(a) * (2.3 + k * 0.5))); });
          flame.scale.set(1, 1 + Math.sin(t * 19) * 0.15, 1);
          st.forEach((o, i) => { stars.pos.setXYZ(i, o.x, o.y, o.z); stars.alpha.setX(i, p * (0.35 + 0.6 * Math.max(0, Math.sin(t * o.sp + o.ph)))); });
          stars.flush();
        },
      };
    },
  },

  ocean: { // mermaid day under the sea: aqua light, a giant open clam with a pearl, coral and swaying seaweed, bubbles rising
    light: { sky: '#9ff5ff', ground: '#0b3a4a', hemi: 0.45, sun: '#d8fbff', sunI: 1.5, fill: '#3fd0ff', fillI: 0.7, exposure: 0.92, bg: '#05283a' },
    floors: { hub: '#a8ece6' },
    mood: { beams: ['#3fd0ff', '#7affd8', '#ffffff'], pools: ['#3fd0ff', '#7affd8', '#ff9fc8'], screenHue: 0.52, screenSat: 0.8,
      balloons: ['#3fd0ff', '#ff9fc8', '#7affd8', '#b18bff'], confetti: ['#3fd0ff', '#ff9fc8', '#7affd8', '#ffffff'], sparkle: '#c8fbff', sparkleGain: 1.5 },
    build(g, ctx) {
      const shellMat = std('#ffd6e8', { roughness: 0.3, metalness: 0.3, side: THREE.DoubleSide });
      const clam = prop(g, ...STAGE, TOP);
      const half = () => new THREE.SphereGeometry(M(1.3), 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const low = part(clam, half(), shellMat, 0, 0, 0.5); low.rotation.x = Math.PI; low.scale.set(1, 0.4, 1);
      const lid = new THREE.Group(); lid.position.set(0, M(0.52), M(-1.2)); clam.add(lid);
      const up = new THREE.Mesh(half(), shellMat); up.scale.set(1, 0.4, 1); up.position.z = M(1.2); lid.add(up);
      const pearl = part(clam, GEO.sph(0.35, 24), lit('#fff8f0', 0.5, { metalness: 0.4, roughness: 0.15 }), 0, 0, 0.75);
      const sea = [];
      const coral = ['#ff7f6e', '#ff9fc8', '#ffb36b', '#b18bff'];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2, p = prop(g, ...onStage(a, 2.6), TOP);
        if (k % 2) { // coral: a few branches
          for (let b = 0; b < 4; b++) part(p, GEO.cyl(0.04, 0.08, 0.9 + b * 0.15, 8), std(coral[k % 4], { roughness: 0.8 }), 0, 0, 0.45).rotation.set(rand(-0.6, 0.6), 0, rand(-0.6, 0.6));
          part(p, GEO.sph(0.18, 10), std(coral[(k + 1) % 4]), 0, 0, 0.15);
        } else for (let b = 0; b < 3; b++) { // seaweed, swaying
          const w = part(p, GEO.box(0.12, 1.6 + b * 0.4, 0.03), std(['#2fae8f', '#3fd0a0', '#1f8f7a'][b], { side: THREE.DoubleSide }), (b - 1) * 0.15, 0, 0); w.geometry.translate(0, M(0.8 + b * 0.2), 0); sea.push(w);
        }
      }
      [onStage(0.9, 1.9), onStage(4.0, 1.8), SPOTS[1]].forEach(([x, y], k) => part(prop(g, x, y, TOP), starGeo(0.35, 0.15, 0.06), std(['#ff8a3d', '#ff7ac8', '#ffd23f'][k], { roughness: 0.7 }), 0, 0, 0.05).rotation.x = -Math.PI / 2);
      // bubbles rising all over the venue
      const bub = particles(ctx.coarse ? 60 : 130, dotTexture(), { blending: THREE.AdditiveBlending });
      const bs = Array.from({ length: bub.n }, () => ({ x: (Math.random() - 0.5) * W, y: Math.random() * 2, z: (Math.random() - 0.5) * D, s: rand(0.15, 0.35), ph: rand(0, 6) }));
      for (let i = 0; i < bub.n; i++) { bub.tint(i, pick(['#c8fbff', '#ffffff', '#9ff5ff'])); bub.size.setX(i, rand(0.05, 0.12)); }
      ctx.scene.add(bub.points);
      return {
        points: [bub],
        step(dt, t, p) {
          lid.rotation.x = -0.9 - Math.sin(t * 0.8) * 0.15;
          pearl.material.emissiveIntensity = 0.45 + Math.sin(t * 2) * 0.2;
          sea.forEach((w, i) => { w.rotation.z = Math.sin(t * 1.2 + i) * 0.25; });
          bs.forEach((o, i) => {
            o.y += dt * o.s; if (o.y > 2) { o.y = 0.05; o.x = (Math.random() - 0.5) * W; o.z = (Math.random() - 0.5) * D; }
            bub.pos.setXYZ(i, o.x + Math.sin(t * 2 + o.ph) * 0.06, o.y, o.z);
            bub.alpha.setX(i, p * 0.6 * clamp01(o.y / 0.2) * clamp01((2 - o.y) / 0.4));
          });
          bub.flush();
        },
      };
    },
  },

  disco: { // disco night: a giant mirror ball over the hub stage throwing rays and light flecks, glowing pillars, roller skates
    light: { sky: '#ff9fe0', ground: '#2a0a2a', hemi: 0.32, sun: '#ffd1a8', sunI: 1.0, fill: '#ff4fa8', fillI: 0.9, exposure: 0.95, bg: '#1a0620' },
    floors: { hub: '#eab0e4', live: '#4a1240' },
    mood: { beams: ['#ff4fa8', '#ffb03c', '#b44cff'], beamGain: 1.5, pools: ['#ff4fa8', '#ffb03c', '#b44cff'], poolGain: 1.3, screenHue: 0.9,
      balloons: ['#e6c47e', '#ff4fa8', '#b44cff', '#c9ccd6'], confetti: ['#e6c47e', '#c9ccd6', '#ff4fa8', '#ffffff'], sparkle: '#ffe6a0', sparkleGain: 2 },
    build(g, ctx) {
      const mirror = std('#e8e8f0', { metalness: 1, roughness: 0.08, flatShading: true, emissive: '#553355', emissiveIntensity: 0.4 });
      const ballHold = prop(g, ...STAGE, TOP + 3.9);
      const ball = part(ballHold, GEO.ico(0.9, 2), mirror);
      part(ballHold, GEO.cyl(0.015, 0.015, 1.4), std('#c9ccd6'), 0, 0, 1.6);
      const rays = new THREE.Group(); ballHold.add(rays);
      const cols = ['#ff4fa8', '#ffb03c', '#b44cff', '#4cc9ff'];
      for (let k = 0; k < 8; k++) {
        const len = M(4.2), geo = new THREE.ConeGeometry(M(0.55), len, 16, 1, true); geo.translate(0, -len / 2, 0);
        const r = new THREE.Mesh(geo, beamMaterial(cols[k % 4], 0.3)); r.rotation.set(0.75, (k / 8) * Math.PI * 2, 0, 'YXZ'); rays.add(r);
      }
      const pillars = [];
      for (let k = 0; k < 8; k++) { const p = prop(g, ...onStage((k / 8) * Math.PI * 2, 3.0), TOP); pillars.push(part(p, GEO.cyl(0.12, 0.12, 1.6, 12), lit(cols[k % 4], 1.4, { transparent: true, opacity: 0.85 }), 0, 0, 0.8)); }
      const skate = (x, y, yaw, col) => {
        const s = prop(g, x, y, 0, yaw);
        part(s, GEO.box(0.5, 0.5, 0.9), std(col, { roughness: 0.4 }), 0, -0.1, 0.55);
        part(s, GEO.box(0.5, 0.4, 0.45), std(col, { roughness: 0.4 }), 0, 0.3, 0.45);
        part(s, GEO.box(0.55, 0.08, 1.2), std('#ffffff'), 0, 0.05, 0.25);
        [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.45], [0.3, 0.45]].forEach(([dx, dy], k) => part(s, GEO.cyl(0.13, 0.13, 0.12, 16), lit(cols[k], 1), dx, dy, 0.13).rotation.z = Math.PI / 2);
      };
      skate(...SPOTS[0], 0.5, '#ff8fd8'); skate(...SPOTS[2], 2.2, '#ffffff');
      // light flecks from the ball sweeping round the hall
      const fl = particles(ctx.coarse ? 40 : 80, dotTexture(), { blending: THREE.AdditiveBlending });
      const fs = Array.from({ length: fl.n }, () => ({ a: rand(0, 6.3), r: M(rand(1.5, 11)), h: rand(0.05, 1.2) }));
      for (let i = 0; i < fl.n; i++) { fl.tint(i, pick(['#ffffff', '#ffe6a0', '#ffc6ec', '#c6e8ff'])); fl.size.setX(i, rand(0.05, 0.09)); }
      ctx.scene.add(fl.points);
      return {
        points: [fl],
        step(dt, t, p) {
          ball.rotation.y = t * 0.5; rays.rotation.y = t * 0.5;
          pillars.forEach((m, i) => { m.material.emissiveIntensity = (i + Math.floor(t * 4)) % 4 === 0 ? 2.6 : 0.7; });
          fs.forEach((o, i) => { const a = o.a + t * 0.35; fl.pos.setXYZ(i, toX(STAGE[0]) + Math.sin(a) * o.r, o.h, toZ(STAGE[1]) + Math.cos(a) * o.r); fl.alpha.setX(i, p * (0.5 + 0.4 * Math.sin(t * 5 + i))); });
          fl.flush();
        },
      };
    },
  },

  garden: { // flower festival: a golden afternoon, giant blooms growing on the hub stage, tulip planters, pollen drifting
    light: { sky: '#fff1d6', ground: '#4a7a3a', hemi: 0.52, sun: '#ffd9a8', sunI: 2.1, fill: '#ffb3d1', fillI: 0.55, exposure: 0.9, bg: '#c9707f' },
    floors: { hub: '#dcf0c4' },
    mood: { beams: ['#ffb3d1', '#fff3d6', '#c7efdf'], pools: ['#ffb3d1', '#fff3d6', '#c7efdf'], screenHue: 0.25, screenSat: 0.6,
      balloons: ['#ff8fb8', '#ffe066', '#c9a3ff', '#ffffff'], confetti: ['#ff8fb8', '#ffe066', '#c9a3ff', '#7fd08a', '#ffffff'], sparkle: '#fff2a8', sparkleGain: 1.4 },
    build(g, ctx) {
      const stem = std('#4f9a4a', { roughness: 0.8 }), leaf = std('#6fbf5a', { roughness: 0.8 });
      const petals = ['#ff8fb8', '#ff6f61', '#c9a3ff', '#ffffff', '#ffd23f', '#ffb3d1', '#ff3d8b'];
      const heads = [];
      const bloom = (p, h, r, col, n = 8) => {
        const head = new THREE.Group(); head.position.y = M(h); p.add(head);
        for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; const pe = new THREE.Mesh(GEO.sph(r, 14), std(col, { roughness: 0.6 })); pe.scale.set(0.55, 0.18, 1); pe.position.set(Math.sin(a) * M(r * 1.1), 0, Math.cos(a) * M(r * 1.1)); pe.rotation.y = a; pe.castShadow = true; head.add(pe); }
        const c = new THREE.Mesh(GEO.sph(r * 0.55, 14), std('#ffcf3f', { roughness: 0.9 })); c.scale.y = 0.5; head.add(c);
        return head;
      };
      [[0, 0, 3.2, 0.55], [1.5, 0.6, 2.2, 0.42], [-1.4, 0.9, 2.6, 0.45], [0.6, -1.6, 1.8, 0.38], [-0.9, -1.2, 2.0, 0.4], [2.0, -1.0, 1.5, 0.34], [-2.1, -0.3, 1.6, 0.36]].forEach(([dx, dy, h, r], k) => {
        const f = prop(g, STAGE[0] + dx, STAGE[1] + dy, TOP);
        part(f, GEO.cyl(0.05, 0.07, h, 8), stem, 0, 0, h / 2);
        [0.35, 0.6].forEach((q, j) => { const l = part(f, GEO.sph(0.25, 10), leaf, j ? -0.15 : 0.15, 0, h * q); l.scale.set(1, 0.15, 0.45); l.rotation.z = j ? 0.5 : -0.5; });
        heads.push({ h: bloom(f, h, r, petals[k % petals.length]), ph: k });
      });
      SPOTS.forEach(([x, y], k) => { // tulip planters
        const pl = prop(g, x, y);
        part(pl, GEO.cyl(0.55, 0.45, 0.5, 20), std('#f3e6c8', { roughness: 0.6 }), 0, 0, 0.25);
        for (let j = 0; j < 7; j++) {
          const a = (j / 7) * Math.PI * 2, dx = Math.cos(a) * 0.3, dy = Math.sin(a) * 0.3;
          part(pl, GEO.cyl(0.015, 0.015, 0.5, 6), stem, dx, dy, 0.75);
          part(pl, GEO.sph(0.09, 10), std(petals[(j + k) % petals.length]), dx, dy, 1.02).scale.set(1, 1.4, 1);
        }
      });
      const pol = particles(ctx.coarse ? 30 : 60, dotTexture(), { blending: THREE.AdditiveBlending });
      const po = Array.from({ length: pol.n }, () => ({ x: toX(rand(9, 22)), y: M(rand(0.5, 4)), z: toZ(rand(15, 28)), ph: rand(0, 6) }));
      for (let i = 0; i < pol.n; i++) { pol.tint(i, pick(['#fff2a8', '#ffffff', '#ffd6e6'])); pol.size.setX(i, rand(0.03, 0.06)); }
      ctx.scene.add(pol.points);
      return {
        points: [pol],
        step(dt, t, p) {
          heads.forEach((o) => { o.h.rotation.z = Math.sin(t * 0.9 + o.ph) * 0.12; o.h.rotation.x = 0.25 + Math.cos(t * 0.7 + o.ph) * 0.1; o.h.rotation.y = t * 0.1 + o.ph; });
          po.forEach((o, i) => { pol.pos.setXYZ(i, o.x + Math.sin(t * 0.4 + o.ph) * 0.3, o.y + Math.sin(t * 0.6 + o.ph) * 0.08, o.z + Math.cos(t * 0.3 + o.ph) * 0.3); pol.alpha.setX(i, p * (0.4 + 0.4 * Math.sin(t * 2 + o.ph))); });
          pol.flush();
        },
      };
    },
  },

  winter: { // winter wonderland: icy light, a giant snow globe on the hub stage, ice crystals in the hall, snow falling everywhere
    light: { sky: '#e8f6ff', ground: '#3a5a7a', hemi: 0.5, sun: '#eaf4ff', sunI: 1.8, fill: '#9fd0ff', fillI: 0.6, exposure: 0.9, bg: '#0f1e36' },
    floors: { hub: '#e6f2ff' },
    mood: { beams: ['#bfe9ff', '#ffffff', '#ffc6ec'], pools: ['#bfe9ff', '#ffffff', '#ffc6ec'], screenHue: 0.56, screenSat: 0.6,
      balloons: ['#ffffff', '#bfe9ff', '#ffc6ec'], confetti: ['#ffffff', '#bfe9ff', '#ffc6ec', '#c9ccd6'], sparkle: '#e6f6ff', sparkleGain: 1.6 },
    build(g, ctx) {
      const snow = std('#ffffff', { roughness: 0.9 });
      const globe = prop(g, ...STAGE, TOP);
      part(globe, GEO.cyl(2.3, 2.5, 0.5, 48), std('#e6c47e', { metalness: 0.7, roughness: 0.3 }), 0, 0, 0.25);
      part(globe, GEO.cyl(2.2, 2.2, 0.06, 48), snow, 0, 0, 0.53);
      part(globe, GEO.sph(2.3, 40), std('#dff2ff', { transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false }), 0, 0, 2.3);
      [[0, 0, 1], [0, 0, 0.75], [0, 0, 0.55]].reduce((h, [dx, dy, r]) => { part(globe, GEO.sph(r * 0.5, 20), snow, -0.6, 0.2, h + r * 0.45); return h + r * 0.85; }, 0.55);
      part(globe, GEO.cone(0.05, 0.25, 8), std('#ff8a3d'), -0.6, 0.38, 1.82).rotation.x = Math.PI / 2;
      part(globe, GEO.torus(0.27, 0.06), std('#ff3d8b'), -0.6, 0.2, 1.42).rotation.x = Math.PI / 2;
      [-0.08, 0.08].forEach((d) => part(globe, GEO.sph(0.035, 8), std('#1b1b1f'), -0.6 + d, 0.42, 1.92));
      [[0.9, -0.3, 1], [1.4, 0.6, 0.7]].forEach(([dx, dy, s]) => [[0.7, 0.9, 1.0], [0.55, 0.8, 1.5], [0.38, 0.7, 1.95]].forEach(([r, h, y0]) => {
        part(globe, GEO.cone(r * s, h * s, 9), std('#2f6b55', { flatShading: true }), dx, dy, 0.55 + y0 * s);
        part(globe, GEO.cone(r * s * 0.6, h * s * 0.35, 9), snow, dx, dy, 0.55 + y0 * s + h * s * 0.3);
      }));
      const ice = lit('#bfe9ff', 0.6, { transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.2 });
      SPOTS.forEach(([x, y]) => { const c = prop(g, x, y); [[0, 0, 1.6, 0], [0.3, 0.1, 1.1, 0.3], [-0.25, 0.15, 0.9, -0.35], [0.05, -0.3, 1.2, 0.2]].forEach(([dx, dy, h, tilt]) => { const m = part(c, GEO.cyl(0.14, 0.18, h, 6), ice, dx, dy, h / 2); m.rotation.set(tilt * 0.5, 0, tilt); part(c, GEO.cone(0.14, 0.3, 6), ice, dx + Math.sin(tilt) * -h * 0.5, dy, h + 0.1).rotation.set(tilt * 0.5, 0, tilt); }); });
      // snow falling over the whole venue, and swirling in the globe
      const fall = particles(ctx.coarse ? 90 : 180, dotTexture());
      const fs = Array.from({ length: fall.n }, () => ({ x: (Math.random() - 0.5) * W * 1.1, y: Math.random() * 2.2, z: (Math.random() - 0.5) * D * 1.1, s: rand(0.1, 0.22), ph: rand(0, 6) }));
      for (let i = 0; i < fall.n; i++) { fall.tint(i, '#ffffff'); fall.size.setX(i, rand(0.05, 0.1)); }
      const glob = particles(ctx.coarse ? 20 : 40, dotTexture());
      const gs = Array.from({ length: glob.n }, () => ({ a: rand(0, 6.3), r: rand(0.2, 1.8), k: Math.random() }));
      for (let i = 0; i < glob.n; i++) { glob.tint(i, '#ffffff'); glob.size.setX(i, rand(0.04, 0.07)); }
      ctx.scene.add(fall.points, glob.points);
      return {
        points: [fall, glob],
        step(dt, t, p) {
          fs.forEach((o, i) => {
            o.y -= dt * o.s; if (o.y < 0.05) { o.y = 2.2; o.x = (Math.random() - 0.5) * W * 1.1; o.z = (Math.random() - 0.5) * D * 1.1; }
            fall.pos.setXYZ(i, o.x + Math.sin(t * 0.8 + o.ph) * 0.15, o.y, o.z + Math.cos(t * 0.6 + o.ph) * 0.12);
            fall.alpha.setX(i, p * 0.9 * clamp01((o.y - 0.05) / 0.3) * clamp01((2.2 - o.y) / 0.3));
          });
          gs.forEach((o, i) => { o.k = (o.k + dt * 0.12) % 1; const a = o.a + t * 0.6; glob.pos.setXYZ(i, toX(STAGE[0]) + Math.sin(a) * M(o.r), M(TOP + 0.6 + (1 - o.k) * 3.2), toZ(STAGE[1]) + Math.cos(a) * M(o.r)); glob.alpha.setX(i, p * 0.9); });
          fall.flush(); glob.flush();
        },
      };
    },
  },

  candy: { // candy land: pastel sugar light, a giant cupcake on the hub stage, lollipops round it, candy canes, sprinkles falling
    light: { sky: '#fff0fa', ground: '#ffb3d9', hemi: 0.52, sun: '#fff6fb', sunI: 2.0, fill: '#a8f0ff', fillI: 0.55, exposure: 0.88, bg: '#3a1838' },
    floors: { hub: '#ffe0f0' },
    mood: { beams: ['#ff8fd8', '#a8f0ff', '#fff0aa'], pools: ['#ff8fd8', '#a8f0ff', '#fff0aa'], screenHue: 0.92, screenSat: 0.7,
      balloons: ['#ff8fd8', '#a8f0ff', '#fff0aa', '#c9ffb3'], confetti: ['#ff8fd8', '#a8f0ff', '#fff0aa', '#c9ffb3', '#ffffff'], sparkle: '#ffe6f5', sparkleGain: 1.6 },
    build(g, ctx) {
      const swirl = (a, b) => canvasTexture(256, (c, s) => {
        c.fillStyle = a; c.fillRect(0, 0, s, s); c.strokeStyle = b; c.lineWidth = 16; c.beginPath();
        for (let k = 0; k < 300; k++) { const q = k / 300, ang = q * Math.PI * 8, r = q * s * 0.48; c.lineTo(s / 2 + Math.cos(ang) * r, s / 2 + Math.sin(ang) * r); }
        c.stroke();
      });
      const stripes = canvasTexture(128, (c, s) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, s, s); c.fillStyle = '#ff3d6e'; for (let k = -4; k < 8; k++) { c.beginPath(); c.moveTo(k * 24, 0); c.lineTo(k * 24 + 12, 0); c.lineTo(k * 24 + 12 + s, s); c.lineTo(k * 24 + s, s); c.fill(); } });
      const cake = prop(g, ...STAGE, TOP);
      const wrap = canvasTexture(128, (c, s) => { for (let k = 0; k < 16; k++) { c.fillStyle = k % 2 ? '#ff8fd8' : '#ffb3e6'; c.fillRect((k * s) / 16, 0, s / 16 + 1, s); } });
      part(cake, GEO.cyl(1.25, 0.95, 1.1, 32), std('#ffffff', { map: wrap, roughness: 0.6 }), 0, 0, 0.55);
      [[1.35, 0.45, 1.3], [1.05, 0.4, 1.7], [0.7, 0.35, 2.05]].forEach(([r, tube, h], k) => part(cake, GEO.torus(r - tube, tube, Math.PI * 2, 32), std(k % 2 ? '#fff6fb' : '#ffd1ec', { roughness: 0.5 }), 0, 0, h).rotation.x = Math.PI / 2);
      part(cake, GEO.sph(0.5, 20), std('#fff6fb', { roughness: 0.5 }), 0, 0, 2.3);
      const cherry = part(cake, GEO.sph(0.28, 20), std('#e0182d', { roughness: 0.2 }), 0, 0, 2.9);
      part(cake, GEO.cyl(0.02, 0.02, 0.4, 6), std('#4f9a4a'), 0.1, 0, 3.25).rotation.z = -0.4;
      const sprinkleCols = ['#ff3d8b', '#29c7ff', '#ffe066', '#7fd08a', '#b18bff'];
      for (let k = 0; k < 40; k++) { const a = rand(0, Math.PI * 2), r = rand(0.4, 1.2), h = 1.35 + (1.2 - r) * 0.9; part(cake, GEO.box(0.12, 0.04, 0.04), lit(pick(sprinkleCols), 0.4), Math.cos(a) * r, Math.sin(a) * r, h + 0.2).rotation.set(rand(0, 3), rand(0, 3), 0); }
      const lollies = [];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.25;
        const l = prop(g, ...onStage(a, 2.75), TOP, a);
        part(l, GEO.cyl(0.04, 0.04, 2.0, 8), std('#ffffff'), 0, 0, 1.0);
        const disc = part(l, GEO.cyl(0.55, 0.55, 0.14, 32), std('#ffffff', { map: swirl('#ffffff', sprinkleCols[k % 5]), roughness: 0.3 }), 0, 0, 2.4); disc.rotation.x = Math.PI / 2;
        lollies.push(disc);
      }
      SPOTS.forEach(([x, y], k) => { // candy canes
        const c = prop(g, x, y, 0, k);
        const cane = std('#ffffff', { map: stripes, roughness: 0.3 });
        part(c, GEO.cyl(0.12, 0.12, 2.2, 16), cane, 0, 0, 1.1);
        part(c, GEO.torus(0.4, 0.12, Math.PI, 20), cane, 0.4, 0, 2.2);
      });
      [[0.9, 1.9], [2.4, 1.5], [4.0, 1.7], [5.4, 1.9]].forEach(([a, r], k) => { const d = part(prop(g, ...onStage(a, r), TOP), GEO.sph(0.3, 16), std(sprinkleCols[k], { roughness: 0.3, transparent: true, opacity: 0.9 }), 0, 0, 0.12); d.scale.set(1, 0.8, 1); });
      // sprinkles falling over the hall
      const fall = particles(ctx.coarse ? 50 : 110, dotTexture());
      const fs = Array.from({ length: fall.n }, () => ({ x: toX(rand(6, 43)), y: Math.random() * 1.8, z: toZ(rand(13, 30)), s: rand(0.2, 0.4) }));
      for (let i = 0; i < fall.n; i++) { fall.tint(i, pick(sprinkleCols)); fall.size.setX(i, rand(0.05, 0.08)); }
      ctx.scene.add(fall.points);
      return {
        points: [fall],
        step(dt, t, p) {
          lollies.forEach((d, i) => { d.rotation.y = t * (i % 2 ? 1 : -1) * 0.8; });
          cherry.position.y = M(2.9 + Math.abs(Math.sin(t * 2.2)) * 0.15);
          fs.forEach((o, i) => {
            o.y -= dt * o.s; if (o.y < 0.05) { o.y = 1.8; o.x = toX(rand(6, 43)); o.z = toZ(rand(13, 30)); }
            fall.pos.setXYZ(i, o.x, o.y, o.z); fall.alpha.setX(i, p * clamp01((o.y - 0.05) / 0.3) * clamp01((1.8 - o.y) / 0.3));
          });
          fall.flush();
        },
      };
    },
  },

  art: { // art day: a sunny studio, a giant palette and paintbrush on the hub stage, easels with fresh paintings, paint tubes
    light: { sky: '#fff6ea', ground: '#6a4a6a', hemi: 0.5, sun: '#fff0dc', sunI: 2.0, fill: '#7ad7ff', fillI: 0.5, exposure: 0.9, bg: '#2a1a30' },
    floors: { hub: '#fbeee0' },
    mood: { beams: ['#ff5a5f', '#ffd23f', '#3fa9f5'], pools: ['#ff5a5f', '#ffd23f', '#3fa9f5'], screenHue: 0.1,
      balloons: ['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a'], confetti: ['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a', '#b44cff'], sparkle: '#fff2a8', sparkleGain: 1.2 },
    build(g, ctx) {
      const PAINT = ['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a', '#b44cff', '#ff8fd8'];
      const painting = (seed) => canvasTexture(128, (c, s) => {
        c.fillStyle = '#fffaf2'; c.fillRect(0, 0, s, s);
        for (let k = 0; k < 9; k++) { c.fillStyle = PAINT[(k + seed) % 6]; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(((k * 37 + seed * 23) % 100) + 14, ((k * 53 + seed * 31) % 100) + 14, 10 + (k % 3) * 9, 6 + (k % 4) * 6, k, 0, Math.PI * 2); c.fill(); }
        c.globalAlpha = 1; c.strokeStyle = '#2b1220'; c.lineWidth = 3; c.beginPath(); c.moveTo(10, 90 - seed * 4); c.bezierCurveTo(40, 20, 80, 120, 118, 40); c.stroke();
      });
      const wood = std('#c98d5b', { roughness: 0.8 });
      for (let k = 0; k < 5; k++) { // easels facing the hall
        const a = (k / 5) * Math.PI * 2 + 0.4, e = prop(g, ...onStage(a, 2.7), TOP, a);
        [-0.35, 0.35].forEach((d) => part(e, GEO.box(0.06, 2.0, 0.06), wood, d, 0, 1.0).rotation.z = -d * 0.15);
        part(e, GEO.box(0.06, 1.9, 0.06), wood, 0, -0.35, 0.95).rotation.x = -0.3;
        part(e, GEO.box(1.0, 0.8, 0.05), std('#ffffff', { map: painting(k), roughness: 0.8 }), 0, 0.06, 1.4);
        part(e, GEO.box(1.0, 0.06, 0.15), wood, 0, 0.06, 0.97);
      }
      const pal = prop(g, ...STAGE, TOP + 0.6);
      const board = part(pal, GEO.cyl(1.5, 1.5, 0.08, 40), wood); board.scale.set(1.25, 1, 1);
      part(prop(g, ...STAGE, TOP), GEO.cyl(0.15, 0.3, 0.6, 12), wood, 0, 0, 0.3);
      PAINT.forEach((col, k) => { const a = (k / 6) * Math.PI * 1.6 + 0.6; const b = part(pal, GEO.sph(0.3, 14), std(col, { roughness: 0.3 }), Math.cos(a) * 1.35, Math.sin(a) * 1.05, 0.1); b.scale.set(1, 0.35, 1); });
      const brush = prop(g, ...STAGE, TOP + 0.75); // the brush paints circles over the palette
      const arm = new THREE.Group(); brush.add(arm);
      const handle = new THREE.Mesh(GEO.cyl(0.07, 0.1, 2.4, 12), std('#2b1220', { roughness: 0.4 })); handle.position.set(M(0.7), M(1.4), 0); handle.rotation.z = 0.35; arm.add(handle);
      const tip = new THREE.Mesh(GEO.cone(0.14, 0.4, 12), std('#ff5a5f', { roughness: 0.6 })); tip.rotation.z = Math.PI + 0.35; tip.position.set(M(0.27), M(0.15), 0); arm.add(tip);
      SPOTS.forEach(([x, y], k) => { // giant paint tubes
        const t = prop(g, x, y, 0.3, k * 1.7);
        part(t, GEO.cyl(0.3, 0.3, 1.4, 16), std('#e8e8f0', { metalness: 0.5, roughness: 0.3 }), 0, 0, 0.7).rotation.z = Math.PI / 2;
        part(t, GEO.cyl(0.31, 0.31, 0.6, 16), std(PAINT[k + 1]), 0, 0, 0.7).rotation.z = Math.PI / 2;
        part(t, GEO.cyl(0.12, 0.15, 0.3, 12), std('#1b1b1f'), 0.85, 0, 0.7).rotation.z = Math.PI / 2;
        const blob = part(t, GEO.sph(0.4, 14), std(PAINT[k + 1], { roughness: 0.2 }), 1.3, 0, -0.2); blob.scale.set(1.4, 0.3, 1);
      });
      let next = 0;
      return {
        step(dt, t, p) {
          arm.rotation.y = t * 0.6;
          tip.material.color.set(PAINT[Math.floor(t * 0.6 / (Math.PI / 3)) % 6]);
          if (p > 0.9 && t > next) { next = t + 0.8; ctx.live.burst(new THREE.Vector3(toX(STAGE[0]), M(1.6), toZ(STAGE[1])), ['drop', 'heart', 'sparkle'], 2); }
        },
      };
    },
  },

  fashion: { // fashion week: a white-lit catwalk across the hub stage, models walking it, camera flashes, clothing rails
    light: { sky: '#ffffff', ground: '#2a2a2a', hemi: 0.42, sun: '#fff6f0', sunI: 2.2, fill: '#ffb3d1', fillI: 0.5, exposure: 0.92, bg: '#141016' },
    floors: { hub: '#f2e8ec', live: '#1b1b1f' },
    mood: { beams: ['#ffffff', '#ffd1e6', '#ffffff'], beamGain: 1.6, pools: ['#ffffff', '#ffd1e6', '#ffffff'], poolGain: 1.3, screenHue: 0.95, screenSat: 0.2, screenLight: 0.85,
      balloons: ['#1b1b1f', '#ffffff', '#e6c47e'], confetti: ['#1b1b1f', '#ffffff', '#e6c47e', '#c9ccd6'], sparkle: '#ffffff', sparkleGain: 1.6 },
    build(g, ctx) {
      const walk = prop(g, ...STAGE, TOP);
      part(walk, GEO.box(6.4, 0.2, 1.2), std('#ffffff', { roughness: 0.15, metalness: 0.1 }), 0, 0, 0.1);
      [-0.62, 0.62].forEach((d) => part(walk, GEO.box(6.4, 0.04, 0.05), lit('#ffd1e6', 2.2), 0, d, 0.18));
      const models = ['#1b1b1f', '#ff3d8b', '#ffffff'].map((col, k) => {
        const m = new THREE.Group(); walk.add(m);
        const dress = new THREE.Mesh(GEO.cone(0.32, 1.1, 16), std(col, { roughness: 0.5 })); dress.position.y = M(0.75); m.add(dress);
        const body = new THREE.Mesh(GEO.cyl(0.1, 0.12, 0.35, 10), std(col)); body.position.y = M(1.4); m.add(body);
        const head = new THREE.Mesh(GEO.sph(0.12, 14), std('#c98d6b')); head.position.y = M(1.7); m.add(head);
        const hair = new THREE.Mesh(GEO.sph(0.13, 14, 8), std('#2b1a14')); hair.position.set(0, M(1.74), M(-0.03)); m.add(hair);
        return { m, ph: k / 3 };
      });
      const flashes = [];
      [-1, 1].forEach((side) => { for (let k = 0; k < 5; k++) { // photographers' cameras on tripods, both sides of the catwalk
        const c = prop(g, STAGE[0] - 2.4 + k * 1.2, STAGE[1] + side * 1.7, TOP);
        part(c, GEO.cyl(0.02, 0.02, 1.2, 6), std('#1b1b1f'), 0, 0, 0.6);
        part(c, GEO.box(0.22, 0.15, 0.15), std('#1b1b1f'), 0, 0, 1.25);
        flashes.push({ m: part(c, GEO.box(0.12, 0.06, 0.03), lit('#ffffff', 0), 0, -side * 0.09, 1.36), at: Math.random() * 3 });
      } });
      SPOTS.forEach(([x, y], k) => { // clothing rails
        const r = prop(g, x, y, 0, k * 0.8), gold = std('#e6c47e', { metalness: 0.8, roughness: 0.3 });
        [-0.8, 0.8].forEach((d) => part(r, GEO.cyl(0.025, 0.025, 1.7, 8), gold, d, 0, 0.85));
        part(r, GEO.cyl(0.02, 0.02, 1.7, 8), gold, 0, 0, 1.7).rotation.z = Math.PI / 2;
        for (let j = 0; j < 6; j++) part(r, GEO.box(0.06, 0.9, 0.45), std(['#1b1b1f', '#ff3d8b', '#ffffff', '#e6c47e', '#ddcffb', '#c81d32'][(j + k) % 6], { roughness: 0.7 }), -0.6 + j * 0.24, 0, 1.2);
      });
      return {
        step(dt, t, p) {
          models.forEach((o) => { // up the catwalk, a turn at the end, back
            const k = (t * 0.08 + o.ph) % 1, out = k < 0.5, q = out ? k * 2 : (1 - k) * 2;
            o.m.position.x = M(-2.8 + q * 5.6); o.m.position.y = M(0.2 + Math.abs(Math.sin(t * 6 + o.ph * 9)) * 0.03);
            o.m.rotation.y = out ? Math.PI / 2 : -Math.PI / 2;
          });
          flashes.forEach((f) => { const ph = (t + f.at) % 2.6; f.m.material.emissiveIntensity = ph < 0.08 ? 6 : 0; });
        },
      };
    },
  },

  science: { // science lab day: cool mint light, a giant DNA helix turning on the hub stage, lab benches with bubbling flasks
    light: { sky: '#e8fff6', ground: '#1a3a3a', hemi: 0.45, sun: '#f0fffa', sunI: 1.8, fill: '#7affc8', fillI: 0.7, exposure: 0.9, bg: '#0a1e1e' },
    floors: { hub: '#d8f5ec' },
    mood: { beams: ['#7affc8', '#4cc9ff', '#b7ff3c'], pools: ['#7affc8', '#4cc9ff', '#b7ff3c'], screenHue: 0.45, screenSat: 0.8,
      balloons: ['#7affc8', '#4cc9ff', '#b7ff3c'], confetti: ['#7affc8', '#4cc9ff', '#b7ff3c', '#ffffff'], sparkle: '#c8fff0', sparkleGain: 1.2 },
    build(g, ctx) {
      const helix = prop(g, ...STAGE, TOP);
      const strand = [lit('#ff3d8b', 0.8), lit('#4cc9ff', 0.8)], rung = std('#ffffff', { roughness: 0.4 });
      for (let k = 0; k < 18; k++) {
        const a = k * 0.55, h = 0.4 + k * 0.2;
        [0, Math.PI].forEach((o, s) => part(helix, GEO.sph(0.14, 12), strand[s], Math.cos(a + o) * 0.75, Math.sin(a + o) * 0.75, h));
        const r = part(helix, GEO.cyl(0.03, 0.03, 1.5, 6), rung, 0, 0, h); r.rotation.z = Math.PI / 2; r.rotation.y = -a;
      }
      part(helix, GEO.cyl(0.9, 1.0, 0.25, 32), std('#e8e8f0', { metalness: 0.5, roughness: 0.3 }), 0, 0, 0.12);
      const glass = std('#e8fff6', { transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false });
      const LIQ = ['#7affc8', '#ff3d8b', '#4cc9ff', '#b7ff3c'];
      const tops = [];
      for (let k = 0; k < 4; k++) { // lab benches with flasks and test tubes
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4, b = prop(g, ...onStage(a, 2.6), TOP, a);
        part(b, GEO.box(1.4, 0.08, 0.6), std('#ffffff', { roughness: 0.3 }), 0, 0, 0.9);
        part(b, GEO.box(1.3, 0.85, 0.5), std('#3a5a5a'), 0, 0, 0.45);
        part(b, GEO.cone(0.22, 0.4, 16), lit(LIQ[k], 0.9, { transparent: true, opacity: 0.85 }), -0.35, 0, 1.13);
        part(b, GEO.cyl(0.05, 0.05, 0.25, 10), glass, -0.35, 0, 1.45);
        for (let j = 0; j < 3; j++) part(b, GEO.cyl(0.04, 0.04, 0.3, 8), lit(LIQ[(k + j + 1) % 4], 0.9), 0.15 + j * 0.15, 0, 1.1);
        part(b, GEO.box(0.5, 0.04, 0.12), std('#c9ccd6'), 0.3, 0, 0.98);
        tops.push(new THREE.Vector3(toX(onStage(a, 2.6)[0]), M(TOP + 1.6), toZ(onStage(a, 2.6)[1])));
      }
      SPOTS.forEach(([x, y]) => { const at = prop(g, x, y, 2.2); at.add(atom(0.5)); });
      const bub = particles(ctx.coarse ? 24 : 48, dotTexture(), { blending: THREE.AdditiveBlending });
      const bs = Array.from({ length: bub.n }, (_, i) => ({ f: i % 4, k: Math.random(), ph: rand(0, 6) }));
      for (let i = 0; i < bub.n; i++) { bub.tint(i, LIQ[i % 4]); bub.size.setX(i, rand(0.04, 0.08)); }
      ctx.scene.add(bub.points);
      const atoms = g.children.filter((c) => c.children[0]?.userData.atom);
      return {
        points: [bub],
        step(dt, t, p) {
          helix.rotation.y = t * 0.5;
          atoms.forEach((a, i) => { a.rotation.y = t * 0.8 + i; a.rotation.x = Math.sin(t * 0.5 + i) * 0.4; });
          bs.forEach((o, i) => {
            o.k = (o.k + dt * 0.35) % 1; const s = tops[o.f];
            bub.pos.setXYZ(i, s.x + Math.sin(o.ph + t * 3) * 0.04, s.y + o.k * 0.6, s.z + Math.cos(o.ph + t * 3) * 0.04);
            bub.alpha.setX(i, p * (1 - o.k) * 0.9);
          });
          bub.flush();
        },
      };
    },
  },

  books: { // book club day: a warm library glow, a giant open book with a turning page, book-stack seats, reading lamps
    light: { sky: '#fff1dc', ground: '#4a2a1a', hemi: 0.45, sun: '#ffd9a8', sunI: 1.8, fill: '#ffb36b', fillI: 0.55, exposure: 0.9, bg: '#24160e' },
    floors: { hub: '#f3e2c8' },
    mood: { beams: ['#ffd9a8', '#fff1dc', '#ffd9a8'], pools: ['#ffd9a8', '#fff1dc', '#ffb36b'], screenHue: 0.08, screenSat: 0.6,
      balloons: ['#7a2c3a', '#1f4f6b', '#e6c47e'], confetti: ['#7a2c3a', '#1f4f6b', '#e6c47e', '#fff1dc'], sparkle: '#ffe6b0', sparkleGain: 1.2 },
    build(g, ctx) {
      const text = canvasTexture(128, (c, s) => { c.fillStyle = '#fffaf0'; c.fillRect(0, 0, s, s); c.fillStyle = '#8a7a6a'; for (let r = 0; r < 14; r++) for (let w = 0; w < 5; w++) c.fillRect(10 + w * 22, 10 + r * 8, 8 + ((r * 7 + w * 3) % 10), 3); });
      const page = std('#ffffff', { map: text, roughness: 0.9, side: THREE.DoubleSide });
      const book = prop(g, ...STAGE, TOP + 0.5);
      part(book, GEO.box(3.6, 0.12, 2.4), std('#7a2c3a', { roughness: 0.6 }), 0, 0, 0);
      [-1, 1].forEach((s) => { const pg = part(book, GEO.box(1.7, 0.18, 2.2), page, s * 0.88, 0, 0.15); pg.rotation.z = -s * 0.08; });
      part(prop(g, ...STAGE, TOP), GEO.box(1.2, 0.45, 0.8), std('#5a3a22'), 0, 0, 0.22);
      const flip = new THREE.Group(); flip.position.y = M(0.26); book.add(flip);
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(M(1.7), M(2.2)), page); leaf.rotation.x = -Math.PI / 2; leaf.position.x = M(0.85); flip.add(leaf);
      const COVERS = ['#7a2c3a', '#1f4f6b', '#e6c47e', '#2f6b45', '#ff8fb8', '#3a2a5a'];
      for (let k = 0; k < 6; k++) { // stacks of giant books to sit on
        const a = (k / 6) * Math.PI * 2 + 0.3, st = prop(g, ...onStage(a, 2.6), TOP, a + k);
        for (let j = 0; j < 3; j++) { const b = part(st, GEO.box(0.8 - j * 0.06, 0.16, 0.55), std(COVERS[(k + j) % 6], { roughness: 0.6 }), 0, 0, 0.08 + j * 0.17); b.rotation.y = (j - 1) * 0.2; part(st, GEO.box(0.74 - j * 0.06, 0.13, 0.5), std('#fffaf0'), 0.03, 0, 0.08 + j * 0.17).rotation.y = (j - 1) * 0.2; }
      }
      const shades = [];
      SPOTS.forEach(([x, y]) => { // reading lamps
        const l = prop(g, x, y);
        part(l, GEO.cyl(0.25, 0.3, 0.06, 16), std('#3a2a22'), 0, 0, 0.03);
        part(l, GEO.cyl(0.025, 0.025, 1.8, 8), std('#c9a14a', { metalness: 0.7 }), 0, 0, 0.9);
        shades.push(part(l, GEO.cone(0.4, 0.45, 20, true), lit('#ffd9a8', 1.2, { side: THREE.DoubleSide }), 0, 0, 1.9));
      });
      return {
        step(dt, t) {
          const k = (t * 0.25) % 1; flip.rotation.z = Math.PI * Math.min(1, k / 0.7) * 0.97; // a page turns every few seconds
          leaf.visible = k < 0.75;
          shades.forEach((s, i) => { s.material.emissiveIntensity = 1.1 + Math.sin(t * 2 + i) * 0.1; });
        },
      };
    },
  },

  bake: { // bake-off day: a warm kitchen, a giant stand mixer whisking on the hub stage, counters with steaming pots, macaron towers
    light: { sky: '#fff4e8', ground: '#5a3a2a', hemi: 0.5, sun: '#ffe8cc', sunI: 2.0, fill: '#ff9fb0', fillI: 0.5, exposure: 0.9, bg: '#2a1612' },
    floors: { hub: '#fbe6d6' },
    mood: { beams: ['#ffd1dc', '#fff4e8', '#ffd1dc'], pools: ['#ffb3c1', '#fff4e8', '#ffd9a8'], screenHue: 0.03, screenSat: 0.6,
      balloons: ['#ffb3c1', '#c7efdf', '#fff0aa'], confetti: ['#ffb3c1', '#c7efdf', '#fff0aa', '#ffffff'], sparkle: '#fff2d6', sparkleGain: 1.2 },
    build(g, ctx) {
      const pink = std('#ff9fb0', { roughness: 0.35 }), steel = std('#d6d9e0', { metalness: 0.8, roughness: 0.25 });
      const mixer = prop(g, ...STAGE, TOP);
      part(mixer, GEO.box(1.6, 0.35, 1.1), pink, 0, 0, 0.18);
      part(mixer, GEO.box(0.55, 2.0, 0.7), pink, -0.6, 0, 1.2);
      part(mixer, GEO.cyl(0.42, 0.42, 1.5, 24), pink, 0.05, 0, 2.3).rotation.z = Math.PI / 2;
      part(mixer, GEO.cyl(0.65, 0.45, 0.8, 28, true), steel, 0.35, 0, 0.75);
      part(mixer, GEO.sph(0.6, 20), std('#fff6fb', { roughness: 0.6 }), 0.35, 0, 0.95).scale.y = 0.5;
      const whisk = prop(g, STAGE[0] + 0.35, STAGE[1], TOP + 1.1);
      for (let k = 0; k < 4; k++) { const w = part(whisk, GEO.torus(0.25, 0.015, Math.PI * 2, 20), steel, 0, 0, 0.35); w.rotation.y = (k * Math.PI) / 4; w.scale.set(1, 1.6, 1); }
      part(whisk, GEO.cyl(0.03, 0.03, 0.6, 8), steel, 0, 0, 0.9);
      const pots = [];
      for (let k = 0; k < 4; k++) { // counters round the mixer
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4, c = prop(g, ...onStage(a, 2.6), TOP, a);
        part(c, GEO.box(1.4, 0.9, 0.6), std('#ffffff', { roughness: 0.4 }), 0, 0, 0.45);
        part(c, GEO.box(1.45, 0.06, 0.65), std('#e8d9c8', { roughness: 0.3 }), 0, 0, 0.93);
        part(c, GEO.cyl(0.22, 0.2, 0.25, 16), steel, -0.35, 0, 1.08);
        part(c, GEO.cyl(0.3, 0.2, 0.18, 16), std(['#c7efdf', '#fff0aa', '#ffb3c1', '#ddcffb'][k], { roughness: 0.4 }), 0.35, 0, 1.05);
        const [x, y] = onStage(a, 2.6); pots.push(new THREE.Vector3(toX(x), M(TOP + 1.25), toZ(y)));
      }
      SPOTS.forEach(([x, y], k) => { const t = prop(g, x, y); for (let j = 0; j < 5; j++) { const m = macaron(0.5 - j * 0.06, ['#ffb3c1', '#c7efdf', '#fff0aa', '#ddcffb', '#ffd9a8'][(j + k) % 5]); m.position.y = M(0.15 + j * 0.3); t.add(m); } });
      const steam = particles(ctx.coarse ? 20 : 40, dotTexture());
      const ss = Array.from({ length: steam.n }, (_, i) => ({ f: i % 4, k: Math.random(), ph: rand(0, 6) }));
      for (let i = 0; i < steam.n; i++) { steam.tint(i, '#ffffff'); steam.size.setX(i, rand(0.12, 0.22)); }
      ctx.scene.add(steam.points);
      let next = 0;
      return {
        points: [steam],
        step(dt, t, p) {
          whisk.rotation.y = t * 6;
          ss.forEach((o, i) => { o.k = (o.k + dt * 0.3) % 1; const s = pots[o.f]; steam.pos.setXYZ(i, s.x + Math.sin(o.ph + t) * 0.08 * o.k, s.y + o.k * 0.7, s.z + Math.cos(o.ph + t) * 0.08 * o.k); steam.alpha.setX(i, p * 0.35 * Math.sin(o.k * Math.PI)); });
          steam.flush();
          if (p > 0.9 && t > next) { next = t + 1.1; ctx.live.burst(new THREE.Vector3(toX(STAGE[0]), M(2.2), toZ(STAGE[1])), ['heart', 'cup'], 1); }
        },
      };
    },
  },

  wellness: { // wellness and yoga: a calm dawn, a lotus breathing in a pool of ripples on the hub stage, a ring of mats, stone cairns
    light: { sky: '#fff8f0', ground: '#5a7a6a', hemi: 0.52, sun: '#ffe8d6', sunI: 1.8, fill: '#c7efdf', fillI: 0.6, exposure: 0.88, bg: '#2f4a46' },
    floors: { hub: '#e4f3ea' },
    mood: { beams: ['#c7efdf', '#fff3e6', '#ffd1dc'], beamGain: 0.6, pools: ['#c7efdf', '#fff3e6', '#ffd1dc'], poolGain: 0.8, screenHue: 0.4, screenSat: 0.4,
      balloons: ['#c7efdf', '#ffd1dc', '#fff3e6'], confetti: ['#c7efdf', '#ffd1dc', '#fff3e6', '#ffffff'], sparkle: '#fff8e6', sparkleGain: 1.4 },
    build(g, ctx) {
      const pond = prop(g, ...STAGE, TOP);
      part(pond, GEO.cyl(1.4, 1.4, 0.06, 40), std('#9fd8e0', { roughness: 0.1, metalness: 0.2 }), 0, 0, 0.03);
      const lotus = new THREE.Group(); lotus.position.y = M(0.15); pond.add(lotus);
      [[8, 0.7, 0.5, '#ffd1dc'], [6, 0.5, 0.9, '#ffb3c8']].forEach(([n, r, tilt, col]) => { for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + tilt, pe = new THREE.Mesh(GEO.sph(0.32, 14), lit(col, 0.25, { roughness: 0.5 })); pe.scale.set(0.45, 0.25, 1); pe.position.set(Math.sin(a) * M(r * 0.6), M(0.12), Math.cos(a) * M(r * 0.6)); pe.rotation.set(-tilt * 0.8, a, 0, 'YXZ'); pe.castShadow = true; lotus.add(pe); } });
      lotus.add(mesh(GEO.sph(0.16, 14), lit('#ffe680', 0.8), 0, 0, 0.2));
      const ripples = [0, 1, 2].map((k) => { const r = part(pond, GEO.torus(1, 0.012, Math.PI * 2, 48), std('#ffffff', { transparent: true, opacity: 0.6 }), 0, 0, 0.07); r.rotation.x = Math.PI / 2; return r; });
      const MATS = ['#c7efdf', '#ffd1dc', '#ddcffb', '#fff0aa', '#bfe9ff', '#ffd9c2'];
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, m = prop(g, ...onStage(a, 2.4), TOP, a); part(m, GEO.box(0.6, 0.02, 1.6), std(MATS[k % 6], { roughness: 0.9 }), 0, 0, 0.02); }
      SPOTS.forEach(([x, y], k) => { // stone cairns and a plant
        const c = prop(g, x, y);
        [[0.45, 0.16], [0.36, 0.14], [0.28, 0.12], [0.2, 0.1]].reduce((h, [r, th]) => { part(c, GEO.sph(r, 16), std(['#c9c4bc', '#a8a39b', '#d8d3cb'][k], { roughness: 0.9 }), rand(-0.04, 0.04), 0, h + th).scale.y = th / r; return h + th * 2; }, 0);
        for (let j = 0; j < 5; j++) { const a = (j / 5) * Math.PI * 2; const l = part(c, GEO.sph(0.25, 10), std('#4f9a6a', { roughness: 0.8 }), 0.8 + Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0.5); l.scale.set(0.5, 0.15, 1); l.rotation.set(0.6, a, 0, 'YXZ'); }
        part(c, GEO.cyl(0.25, 0.2, 0.35, 14), std('#f3e6c8'), 0.8, 0, 0.17);
      });
      return {
        step(dt, t) {
          const b = 1 + Math.sin(t * 0.9) * 0.06; lotus.scale.set(b, b, b); lotus.rotation.y = t * 0.1; // breathing
          ripples.forEach((r, k) => { const q = ((t * 0.25) + k / 3) % 1; r.scale.setScalar(0.3 + q * 1.0); r.material.opacity = 0.6 * (1 - q); });
        },
      };
    },
  },

  travel: { // around the world: a sunny day, a giant turning globe with a plane circling it, suitcases, hot-air balloons over the hall
    light: { sky: '#ffffff', ground: '#3a6a8a', hemi: 0.52, sun: '#fff2d6', sunI: 2.1, fill: '#9fd8ff', fillI: 0.5, exposure: 0.88, bg: '#5aa0d8' },
    floors: { hub: '#e8f4ff' },
    mood: { beams: ['#ffd23f', '#ffffff', '#3fa9f5'], pools: ['#ffd23f', '#ffffff', '#3fa9f5'], screenHue: 0.55, screenSat: 0.7,
      balloons: ['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a'], confetti: ['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a', '#ffffff'], sparkle: '#ffffff', sparkleGain: 0.8 },
    build(g, ctx) {
      const earth = canvasTexture(256, (c, s) => {
        c.fillStyle = '#3fa9f5'; c.fillRect(0, 0, s, s); c.fillStyle = '#7fd08a';
        [[40, 70, 30, 40], [70, 150, 20, 35], [130, 60, 40, 25], [140, 120, 25, 40], [200, 80, 35, 30], [210, 170, 25, 18]].forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2); c.fill(); });
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, s, 14); c.fillRect(0, s - 14, s, 14);
      });
      const stand = prop(g, ...STAGE, TOP);
      const gold = std('#e6c47e', { metalness: 0.8, roughness: 0.3 });
      part(stand, GEO.cyl(0.7, 0.9, 0.2, 28), gold, 0, 0, 0.1);
      part(stand, GEO.cyl(0.08, 0.1, 1.0, 10), gold, 0, 0, 0.6);
      const globe = part(stand, GEO.sph(1.25, 40), std('#ffffff', { map: earth, roughness: 0.5 }), 0, 0, 2.35);
      globe.rotation.z = 0.4;
      const meridian = part(stand, GEO.torus(1.4, 0.05, Math.PI * 2, 48), gold, 0, 0, 2.35); meridian.rotation.z = 0.4;
      const orbit = new THREE.Group(); orbit.position.y = M(2.35); stand.add(orbit);
      const plane = paperPlane('#ffffff'); plane.position.x = M(1.9); plane.scale.setScalar(1.5); orbit.add(plane);
      const CASE = ['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a', '#b44cff'];
      for (let k = 0; k < 5; k++) { // suitcases
        const a = (k / 5) * Math.PI * 2 + 0.2, s = prop(g, ...onStage(a, 2.7), TOP, a + k * 0.7);
        part(s, GEO.box(0.8, 1.0, 0.35), std(CASE[k], { roughness: 0.5 }), 0, 0, 0.55);
        part(s, GEO.box(0.3, 0.06, 0.06), std('#1b1b1f'), 0, 0, 1.1);
        part(s, GEO.cyl(0.18, 0.18, 0.02, 16), std(CASE[(k + 2) % 5]), 0.15, 0.18, 0.7).rotation.x = Math.PI / 2;
        [-0.3, 0.3].forEach((d) => part(s, GEO.cyl(0.05, 0.05, 0.05, 10), std('#1b1b1f'), d, 0, 0.04).rotation.z = Math.PI / 2);
      }
      const balloons = [[...SPOTS[0], '#ff5a5f'], [...SPOTS[1], '#ffd23f'], [...SPOTS[2], '#3fa9f5']].map(([x, y, col], k) => { // hot-air balloons
        const b = prop(g, x, y, 4.2);
        const env = part(b, GEO.sph(0.75, 20), std(col, { roughness: 0.6 }), 0, 0, 0.6); env.scale.y = 1.2;
        for (let j = 0; j < 6; j++) { const st = part(b, GEO.box(0.02, 1.45, 0.02), std('#ffffff'), Math.cos(j) * 0.74, Math.sin(j) * 0.74, 0.6); st.visible = j % 2 === 0; }
        part(b, GEO.box(0.35, 0.3, 0.35), std('#8a5a2a', { roughness: 0.9 }), 0, 0, -0.65);
        [-0.15, 0.15].forEach((d) => part(b, GEO.cyl(0.006, 0.006, 0.5, 4), std('#3a2a22'), d, d, -0.35));
        return { b, ph: k * 2 };
      });
      return {
        step(dt, t) {
          globe.rotation.y = t * 0.3; orbit.rotation.y = -t * 0.8;
          balloons.forEach((o) => { o.b.position.y = M(4.2 + Math.sin(t * 0.5 + o.ph) * 0.4); });
        },
      };
    },
  },

  tech: { // future tech day: blue holo light, a friendly robot waving on a circuit stage, a scanning hologram ring, drones
    light: { sky: '#cfe8ff', ground: '#0a1a2a', hemi: 0.36, sun: '#d6ecff', sunI: 1.2, fill: '#29e3ff', fillI: 0.8, exposure: 0.95, bg: '#06101e' },
    floors: { hub: '#b8d8f0', live: '#10223a' },
    mood: { beams: ['#29e3ff', '#ffffff', '#7a5cff'], beamGain: 1.4, pools: ['#29e3ff', '#7a5cff', '#ffffff'], poolGain: 1.3, screenHue: 0.53, screenSat: 0.9,
      balloons: ['#29e3ff', '#c9ccd6', '#7a5cff'], confetti: ['#29e3ff', '#c9ccd6', '#7a5cff', '#ffffff'], sparkle: '#bff6ff', sparkleGain: 1.4 },
    build(g, ctx) {
      const circuit = canvasTexture(256, (c, s) => {
        c.fillStyle = '#0d2238'; c.fillRect(0, 0, s, s); c.strokeStyle = '#29e3ff'; c.lineWidth = 3; c.fillStyle = '#29e3ff';
        for (let k = 0; k < 22; k++) { let x = (k * 53) % s, y = (k * 97) % s; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 3; j++) { if ((k + j) % 2) x += 30; else y += 30; c.lineTo(x, y); } c.stroke(); c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill(); }
      });
      const base = prop(g, ...STAGE, TOP);
      part(base, GEO.cyl(3.1, 3.1, 0.03, 48), std('#ffffff', { map: circuit, emissive: '#ffffff', emissiveMap: circuit, emissiveIntensity: 0.6, roughness: 0.4 }), 0, 0, 0.02);
      const white = std('#f2f4f8', { roughness: 0.3, metalness: 0.2 }), dark = std('#1b2233', { roughness: 0.3 });
      const bot = prop(g, ...STAGE, TOP);
      part(bot, GEO.cyl(0.45, 0.55, 0.3, 24), dark, 0, 0, 0.15);
      part(bot, GEO.box(1.0, 1.1, 0.7), white, 0, 0, 0.9);
      part(bot, GEO.box(0.5, 0.3, 0.02), lit('#29e3ff', 1.2), 0, 0.36, 1.0);
      const head = new THREE.Group(); head.position.y = M(1.85); bot.add(head);
      head.add(mesh(GEO.box(0.8, 0.6, 0.6), white), mesh(GEO.box(0.62, 0.3, 0.02), dark, 0, 0.31, 0.02));
      const eyes = [-0.14, 0.14].map((d) => mesh(GEO.sph(0.07, 12), lit('#29e3ff', 2.2), d, 0.33, 0.03)); head.add(...eyes);
      head.add(mesh(GEO.cyl(0.015, 0.015, 0.3, 6), dark, 0, 0, 0.45), mesh(GEO.sph(0.06, 10), lit('#ff3d8b', 2), 0, 0, 0.62));
      const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(M(s * 0.6), M(1.35), 0); bot.add(a); a.add(mesh(GEO.cyl(0.08, 0.08, 0.7, 10), white, 0, 0, -0.35), mesh(GEO.sph(0.12, 10), dark, 0, 0, -0.75)); return a; });
      const scan = part(prop(g, ...STAGE, TOP), GEO.torus(1.6, 0.03, Math.PI * 2, 64), lit('#29e3ff', 2.4, { transparent: true, opacity: 0.8 }), 0, 0, 1.0); scan.rotation.x = Math.PI / 2;
      const drones = [0, 1, 2, 3].map((k) => { const d = prop(g, ...STAGE, 3.6 + (k % 2) * 0.6); d.add(drone()); return { d, ph: (k / 4) * Math.PI * 2, r: 4 + (k % 2) * 3 }; });
      let next = 0;
      return {
        step(dt, t, p) {
          arms[1].rotation.z = 2.4 + Math.sin(t * 5) * 0.4; arms[0].rotation.z = -0.2 + Math.sin(t * 1.5) * 0.1; // one arm waves
          head.rotation.y = Math.sin(t * 0.7) * 0.5;
          eyes.forEach((e) => { e.scale.y = (t % 3.5) < 0.12 ? 0.15 : 1; }); // a blink
          scan.position.y = M(0.3 + ((Math.sin(t * 1.2) + 1) / 2) * 2.4);
          drones.forEach((o) => { const a = t * 0.5 + o.ph; o.d.position.x = toX(STAGE[0] + Math.cos(a) * o.r); o.d.position.z = toZ(STAGE[1] + Math.sin(a) * o.r); o.d.rotation.y = -a; o.d.children[0].children.slice(1).forEach((r) => { r.rotation.y = t * 30; }); });
          if (p > 0.9 && t > next) { next = t + 1.2; ctx.live.burst(new THREE.Vector3(toX(STAGE[0]), M(2.6), toZ(STAGE[1])), ['heart', 'sparkle'], 1); }
        },
      };
    },
  },

  safari: { // safari day: golden savanna light, an acacia tree with a giraffe nibbling it, grass tufts, birds circling
    light: { sky: '#ffe6b0', ground: '#6a4a1a', hemi: 0.5, sun: '#ffc870', sunI: 2.1, fill: '#ff9a55', fillI: 0.5, exposure: 0.9, bg: '#b8683a' },
    floors: { hub: '#f0dcb0' },
    mood: { beams: ['#ffc870', '#fff1d6', '#ff9a55'], pools: ['#ffc870', '#fff1d6', '#ff9a55'], screenHue: 0.09, screenSat: 0.8,
      balloons: ['#c9a14a', '#6b8a3a', '#e07a2e'], confetti: ['#c9a14a', '#6b8a3a', '#e07a2e', '#fff1d6'], sparkle: '#ffe6a0', sparkleGain: 1 },
    build(g, ctx) {
      const tree = prop(g, STAGE[0] + 0.8, STAGE[1] - 0.4, TOP);
      const bark = std('#6b4433', { roughness: 0.9 });
      part(tree, GEO.cyl(0.14, 0.22, 2.6, 8), bark, 0, 0, 1.3);
      [[-0.5, 0.3], [0.5, -0.2]].forEach(([dx, rz]) => part(tree, GEO.cyl(0.06, 0.1, 1.2, 6), bark, dx * 0.5, 0, 2.6).rotation.z = rz * 1.6);
      [[0, 0, 3.2, 1.6], [-0.9, 0.3, 3.0, 1.0], [0.9, -0.2, 3.05, 1.1]].forEach(([dx, dy, h, r]) => part(tree, GEO.sph(r, 16), std('#6b8a3a', { roughness: 0.8, flatShading: true }), dx, dy, h).scale.y = 0.28);
      const spots = canvasTexture(128, (c, s) => { c.fillStyle = '#f2c56a'; c.fillRect(0, 0, s, s); c.fillStyle = '#9a5a2a'; for (let k = 0; k < 24; k++) c.fillRect((k * 37) % s, (k * 61) % s, 16 + (k % 3) * 4, 14 + (k % 2) * 6); });
      const hide = std('#ffffff', { map: spots, roughness: 0.8 });
      const gir = prop(g, STAGE[0] - 1.1, STAGE[1] + 0.3, TOP, 0.4);
      part(gir, GEO.box(1.4, 0.7, 0.6), hide, 0, 0, 1.6);
      [[-0.55, -0.22], [-0.55, 0.22], [0.55, -0.22], [0.55, 0.22]].forEach(([dx, dy]) => part(gir, GEO.cyl(0.06, 0.07, 1.3, 8), hide, dx, dy, 0.65));
      const neck = new THREE.Group(); neck.position.set(M(0.55), M(1.85), 0); gir.add(neck);
      neck.add(mesh(GEO.cyl(0.11, 0.16, 1.6, 10), hide, 0, 0, 0.8));
      const headG = group(mesh(GEO.box(0.5, 0.22, 0.25), hide, 0.15, 0, 0), mesh(GEO.cyl(0.03, 0.03, 0.18, 6), std('#6b4433'), -0.05, -0.06, 0.18), mesh(GEO.cyl(0.03, 0.03, 0.18, 6), std('#6b4433'), -0.05, 0.06, 0.18));
      headG.position.y = M(1.65); neck.add(headG);
      const tail = part(gir, GEO.cyl(0.02, 0.02, 0.6, 6), std('#6b4433'), -0.75, 0, 1.55);
      for (let k = 0; k < 14; k++) { const [x, y] = onStage(k * 0.45, 2.2 + (k % 3) * 0.35); const tf = prop(g, x, y, TOP); for (let j = 0; j < 3; j++) part(tf, GEO.cone(0.06, 0.55, 5), std(j % 2 ? '#c9a14a' : '#8aa04a'), (j - 1) * 0.07, 0, 0.27).rotation.z = (j - 1) * 0.3; }
      SPOTS.forEach(([x, y]) => { // binocular stands
        const b = prop(g, x, y);
        part(b, GEO.cyl(0.05, 0.08, 1.2, 8), std('#3a3a3a', { metalness: 0.5 }), 0, 0, 0.6);
        [-0.1, 0.1].forEach((d) => part(b, GEO.cyl(0.08, 0.08, 0.3, 12), std('#1b1b1f', { metalness: 0.4 }), d, 0, 1.3).rotation.x = Math.PI / 2);
      });
      const dust = particles(ctx.coarse ? 26 : 50, dotTexture(), { blending: THREE.AdditiveBlending });
      const ds = Array.from({ length: dust.n }, () => ({ x: toX(rand(8, 24)), y: M(rand(0.3, 3.5)), z: toZ(rand(15, 28)), ph: rand(0, 6) }));
      for (let i = 0; i < dust.n; i++) { dust.tint(i, '#ffd98a'); dust.size.setX(i, rand(0.03, 0.06)); }
      ctx.scene.add(dust.points);
      return {
        points: [dust],
        step(dt, t, p) {
          neck.rotation.z = -0.15 - Math.max(0, Math.sin(t * 0.6)) * 0.25; headG.rotation.z = Math.sin(t * 2.4) * 0.05; // reaching up to nibble
          tail.rotation.x = Math.sin(t * 3) * 0.4;
          ds.forEach((o, i) => { dust.pos.setXYZ(i, o.x + Math.sin(t * 0.3 + o.ph) * 0.3, o.y + Math.sin(t * 0.5 + o.ph) * 0.05, o.z); dust.alpha.setX(i, p * (0.3 + 0.3 * Math.sin(t * 1.5 + o.ph))); });
          dust.flush();
        },
      };
    },
  },

  carnival: { // carnival day: festive lights, a carousel turning on the hub stage with bobbing horses, balloon bunches, chasing bulbs
    light: { sky: '#fff0e0', ground: '#3a1a3a', hemi: 0.42, sun: '#ffe0c0', sunI: 1.6, fill: '#ff6a8a', fillI: 0.7, exposure: 0.93, bg: '#1e0e2e' },
    floors: { hub: '#ffe6e0' },
    mood: { beams: ['#ff3d6e', '#ffd23f', '#29c7ff'], beamGain: 1.3, pools: ['#ff3d6e', '#ffd23f', '#29c7ff'], screenHue: 0.98, screenSat: 0.9,
      balloons: ['#ff3d6e', '#ffd23f', '#29c7ff', '#5ad17a'], confetti: ['#ff3d6e', '#ffd23f', '#29c7ff', '#5ad17a', '#ffffff'], sparkle: '#fff2a8', sparkleGain: 1.6 },
    build(g, ctx) {
      const gold = std('#e6c47e', { metalness: 0.8, roughness: 0.3 });
      const ride = prop(g, ...STAGE, TOP);
      part(ride, GEO.cyl(2.6, 2.6, 0.25, 40), std('#ffffff', { roughness: 0.4 }), 0, 0, 0.12);
      part(ride, GEO.cyl(0.35, 0.35, 3.2, 20), std('#ff3d6e', { roughness: 0.4 }), 0, 0, 1.6);
      const roof = part(ride, GEO.cone(3.0, 1.3, 16), std('#ffffff', { map: stripeTex('#ff3d6e', '#ffffff', 16), roughness: 0.5 }), 0, 0, 3.75);
      part(ride, GEO.cyl(2.9, 2.9, 0.3, 40, true), std('#ffd23f', { roughness: 0.4, side: THREE.DoubleSide }), 0, 0, 3.1);
      part(ride, GEO.sph(0.2, 12), gold, 0, 0, 4.5);
      const bulbs = [];
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; bulbs.push(part(ride, GEO.sph(0.07, 8), lit('#fff2a8', 1.5), Math.cos(a) * 2.95, Math.sin(a) * 2.95, 2.95)); }
      const horses = [];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2, x = Math.cos(a) * 1.9, y = Math.sin(a) * 1.9;
        part(ride, GEO.cyl(0.03, 0.03, 2.9, 8), gold, x, y, 1.7);
        const h = new THREE.Group(); h.position.set(M(x), M(1.1), M(y)); h.rotation.y = -a; ride.add(h);
        const col = std(['#ffffff', '#ffd1ec', '#c9e7ff'][k % 3], { roughness: 0.4 });
        h.add(mesh(GEO.box(0.25, 0.35, 0.9), col), mesh(GEO.box(0.2, 0.5, 0.2), col, 0, 0.45, 0.25), mesh(GEO.box(0.18, 0.18, 0.35), col, 0, 0.55, 0.45));
        [[-0.08, -0.3], [0.08, -0.3], [-0.08, 0.3], [0.08, 0.3]].forEach(([dx, dy]) => h.add(mesh(GEO.box(0.06, 0.45, 0.06), col, dx, dy, -0.35)));
        h.add(mesh(GEO.box(0.27, 0.06, 0.3), std(['#ff3d6e', '#29c7ff', '#ffd23f'][k % 3]), 0, 0, 0.2));
        horses.push(h);
      }
      SPOTS.forEach(([x, y], k) => { // balloon bunches
        const b = prop(g, x, y);
        part(b, GEO.cyl(0.15, 0.2, 0.3, 12), std('#1b1b1f'), 0, 0, 0.15);
        for (let j = 0; j < 7; j++) {
          const a = j * 0.9, r = j ? 0.35 : 0, h = 2.4 + (j % 3) * 0.3, bx = Math.cos(a) * r, by = Math.sin(a) * r;
          part(b, GEO.sph(0.28, 14), std(['#ff3d6e', '#ffd23f', '#29c7ff', '#5ad17a', '#b44cff'][(j + k) % 5], { roughness: 0.25 }), bx, by, h).scale.y = 1.2;
          const s = part(b, GEO.cyl(0.005, 0.005, h - 0.3, 4), std('#ffffff'), bx / 2, by / 2, (h - 0.3) / 2 + 0.15); s.rotation.set(by * 0.25, 0, -bx * 0.25);
        }
      });
      return {
        step(dt, t) {
          ride.rotation.y = t * 0.35;
          horses.forEach((h, k) => { h.position.y = M(1.1 + Math.sin(t * 2 + k * 1.3) * 0.25); });
          bulbs.forEach((b, i) => { b.material.emissiveIntensity = (i + Math.floor(t * 6)) % 3 === 0 ? 2.6 : 0.6; });
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
const football = (r) => { // a white ball with dark patches (on the corners of an icosahedron)
  const b = group(mesh(GEO.sph(r, 20), std('#ffffff', { roughness: 0.5 }))), dark = std('#1b1b1f', { roughness: 0.5 });
  const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute('position'), seen = new Set();
  for (let i = 0; i < ico.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize(), key = v.toArray().map((x) => x.toFixed(2)).join();
    if (seen.has(key)) continue;
    seen.add(key);
    const p = mesh(GEO.sph(r * 0.3, 10), dark); p.position.copy(v.multiplyScalar(M(r * 0.93))); p.lookAt(0, 0, 0); p.scale.set(1, 1, 0.35); b.add(p);
  }
  return b;
};
const pennant = (col) => { const p = mesh(new THREE.CircleGeometry(M(0.16), 3), std(col, { side: THREE.DoubleSide, roughness: 0.8 }), 0, 0, -0.14); p.rotation.z = -Math.PI / 2; return p; };
const shell = (col, s) => { // a scallop: ribs fanning up from the hinge, facing +z
  const m = std(col, { roughness: 0.4, metalness: 0.2 }), o = group(mesh(GEO.sph(s * 0.15, 10), m));
  for (let k = 0; k < 7; k++) { const a = ((k - 3) / 3) * 1.1, rib = mesh(GEO.sph(s * 0.22, 10), m, Math.sin(a) * s * 0.45, 0, Math.cos(a) * s * 0.45); rib.scale.set(0.6, 2.2, 0.4); rib.rotation.z = -a; o.add(rib); }
  return o;
};
const flower = (col, r, centre = '#ffcf3f', n = 8) => { // a flat bloom facing +z
  const m = std(col, { roughness: 0.6 }), c = mesh(GEO.sph(r * 0.35, 12), std(centre, { roughness: 0.9 })), o = group(c);
  c.scale.z = 0.5;
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, pe = mesh(GEO.sph(r * 0.5, 12), m, Math.sin(a) * r * 0.6, -0.02, Math.cos(a) * r * 0.6); pe.scale.set(0.5, 1, 0.2); pe.rotation.z = -a; o.add(pe); }
  return o;
};
const snowflake = (s, material) => { // six arms with a little V on each, facing +z
  const o = group();
  for (let k = 0; k < 3; k++) { const arm = mesh(GEO.box(s * 2, s * 0.12, 0.03), material); arm.rotation.z = (k * Math.PI) / 3; o.add(arm); }
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3, x = Math.cos(a) * s * 0.6, y = Math.sin(a) * s * 0.6;
    [-0.6, 0.6].forEach((d) => { const v = mesh(GEO.box(s * 0.45, s * 0.08, 0.03), material, x + Math.cos(a + d) * s * 0.15, 0, y + Math.sin(a + d) * s * 0.15); v.rotation.z = a + d * 1.6; o.add(v); });
  }
  return o;
};
const stripeTex = (a, b, n = 12) => canvasTexture(128, (c, s) => { for (let k = 0; k < n; k++) { c.fillStyle = k % 2 ? b : a; c.fillRect((k * s) / n, 0, s / n + 1, s); } });
const atom = (r) => { // a nucleus and three electron orbits
  const o = group(mesh(GEO.sph(r * 0.3, 16), lit('#ff3d8b', 0.8)));
  [0, 1, 2].forEach((k) => {
    const ring = new THREE.Group(); ring.rotation.set(k * 1.05, k * 0.6, 0); o.add(ring);
    ring.add(mesh(GEO.torus(r, r * 0.03, Math.PI * 2, 40), lit('#4cc9ff', 1.2)), mesh(GEO.sph(r * 0.1, 10), lit('#7affc8', 2), r, 0, 0));
  });
  o.userData.atom = true;
  return o;
};
const macaron = (r, col) => { // two shells and a cream middle
  const shellM = std(col, { roughness: 0.6 }), o = group();
  [-1, 1].forEach((s) => { const sh = mesh(GEO.sph(r, 16), shellM, 0, 0, s * r * 0.3); sh.scale.y = 0.35; o.add(sh); });
  const cream = mesh(GEO.cyl(r * 0.9, r * 0.9, r * 0.25, 16), std('#fff8f0', { roughness: 0.7 })); o.add(cream);
  return o;
};
const paperPlane = (col) => { // two flat triangles in a V, nose to +x
  const m = std(col, { side: THREE.DoubleSide, roughness: 0.8, flatShading: true }), o = group();
  [-1, 1].forEach((s) => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(M(0.3), 0, 0), new THREE.Vector3(M(-0.2), 0, s * M(0.14)), new THREE.Vector3(M(-0.2), M(-0.04), 0)]);
    geo.computeVertexNormals(); o.add(new THREE.Mesh(geo, m));
  });
  return o;
};
const drone = () => { // a body and four spinning rotors (body first)
  const dark = std('#1b2233', { roughness: 0.4 }), o = group(mesh(GEO.box(0.3, 0.08, 0.3), std('#f2f4f8', { roughness: 0.3 })));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => { const r = group(mesh(GEO.box(0.28, 0.01, 0.04), lit('#29e3ff', 1.4))); r.position.set(M(x * 0.2), M(0.06), M(z * 0.2)); o.add(r); });
  o.children[0].add(mesh(GEO.sph(0.04, 8), dark, 0, 0.15, -0.02));
  return o;
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
  gaming: {
    tint: '#b8c0ff', outfits: ['#1b1b2f', '#00e5ff', '#ff2bd6', '#2a2f5a', '#7cff4f', '#ffffff'], bags: ['#00e5ff', '#ff2bd6', '#7cff4f'], hat: 'headset',
    door: (i) => mesh(GEO.box(0.14, 0.14, 0.14), lit(['#00e5ff', '#ff2bd6', '#7cff4f', '#ffe600'][i % 4], 2.2)),
    float: (i) => { // a pixel heart
      const o = group(), col = lit(['#ff2bd6', '#00e5ff', '#7cff4f'][i % 3], 1.8);
      ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'].forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X') o.add(mesh(GEO.box(0.11, 0.11, 0.11), col, (c - 3) * 0.12, 0, (2.5 - r) * 0.12)); }));
      o.userData.spin = 0.7; return o;
    },
    crest: (c) => {
      c.add(mesh(GEO.box(3.4, 1.6, 0.3), std('#f2f2f7', { roughness: 0.35 }), 0, 0, 0));
      [-1.7, 1.7].forEach((d) => c.add(mesh(GEO.sph(0.85, 20), std('#f2f2f7', { roughness: 0.35 }), d, 0, -0.4)));
      c.add(mesh(GEO.box(0.9, 0.28, 0.4), std('#1a1d2e'), -1.1, 0, 0.1)); c.add(mesh(GEO.box(0.28, 0.9, 0.4), std('#1a1d2e'), -1.1, 0, 0.1));
      [[1.1, 0.35], [1.45, 0], [1.1, -0.35], [0.75, 0]].forEach(([d, h], k) => c.add(mesh(GEO.sph(0.17, 12), lit(['#00e5ff', '#ff2bd6', '#7cff4f', '#ffe600'][k], 2), d, 0.2, h)));
    },
  },
  anime: {
    tint: '#ffd6f5', outfits: ['#ffffff', '#1f3a7a', '#ff7ac8', '#7ad7ff', '#b18bff', '#ffe066'], hair: ['#ff7ac8', '#7ad7ff', '#b18bff', '#7affc8', '#ffe066', '#2b1220'], bags: ['#ff7ac8', '#ffe066'], hat: 'bow',
    door: (i) => (i % 2 ? mesh(starGeo(0.16, 0.07), lit(['#ffe066', '#7ad7ff'][i % 4 === 1 ? 0 : 1], 1.4)) : mesh(heartGeo(0.24), lit(['#ff7ac8', '#b18bff'][i % 4 ? 1 : 0], 1.2), 0, 0, -0.1)),
    float: (i) => {
      if (i % 2) { const s = group(mesh(starGeo(0.35, 0.15, 0.1), lit('#ffe066', 1.4))); s.userData.spin = 1.1; return s; }
      const white = std('#ffffff', { side: THREE.DoubleSide }), h = group(mesh(heartGeo(0.55, 0.12), lit('#ff7ac8', 1.0)));
      [-1, 1].forEach((s) => { const w = mesh(GEO.sph(0.22, 10), white, s * 0.38, 0, 0.1); w.scale.set(1, 0.6, 0.15); w.rotation.z = s * 0.5; h.add(w); });
      h.userData.spin = 0.6; return h;
    },
    crest: (c) => {
      c.add(mesh(heartGeo(2.0, 0.25), lit('#ff7ac8', 1.0), 0, 0, 0));
      [-1, 1].forEach((s) => [0, 1, 2].forEach((k) => { const w = mesh(GEO.sph(0.75 - k * 0.15, 14), std('#ffffff'), s * (1.4 + k * 0.45), -0.1, 0.4 - k * 0.3); w.scale.set(1, 0.45, 0.15); w.rotation.z = s * (0.3 + k * 0.25); c.add(w); }));
      c.add(mesh(starGeo(0.5, 0.22, 0.15), lit('#ffe066', 1.6), 0, 0.15, 1.3));
    },
  },
  padel: {
    tint: '#e6f4ff', outfits: ['#ffffff', '#e6ff3c', '#2f7fd1', '#ff6f61', '#1b1b2f', '#7affc8'], bags: ['#2f7fd1', '#e6ff3c', '#ffffff'], hat: 'visor',
    door: (i) => (i % 3 === 1 ? mesh(GEO.sph(0.08, 10), lit('#e6ff3c', 0.4)) : pennant(['#2f7fd1', '#e6ff3c', '#ff6f61', '#ffffff'][i % 4])),
    float: () => { const b = group(mesh(GEO.sph(0.3, 18), lit('#e6ff3c', 0.35, { roughness: 0.7 }))); const seam = mesh(GEO.torus(0.3, 0.02), std('#ffffff')); seam.rotation.y = 0.6; b.add(seam); b.userData.spin = 1.2; return b; },
    crest: (c) => {
      const head = mesh(GEO.cyl(1.3, 1.3, 0.2, 40), std('#2f7fd1', { roughness: 0.4 }), -0.4, 0, 0.5); head.rotation.x = Math.PI / 2; c.add(head);
      for (let k = 0; k < 9; k++) { const h = mesh(GEO.cyl(0.08, 0.08, 0.22, 10), std('#0f3a6a'), -0.4 + ((k % 3) - 1) * 0.5, 0, 0.5 + (Math.floor(k / 3) - 1) * 0.5); h.rotation.x = Math.PI / 2; c.add(h); }
      const grip = mesh(GEO.cyl(0.15, 0.15, 1.4, 12), std('#1b1b1f'), 0.45, 0, -1.2); grip.rotation.z = -0.5; c.add(grip);
      c.add(mesh(GEO.sph(0.45, 20), lit('#e6ff3c', 0.4), 1.6, 0.1, 0.9));
    },
  },
  football: {
    tint: '#d6f0dc', outfits: ['#ff3d8b', '#3fe0a8', '#ffffff', '#1b1b2f', '#ff3d8b', '#3fe0a8'], bags: ['#ff3d8b', '#3fe0a8', '#ffffff'], hat: 'scarf',
    door: (i) => pennant(['#ff3d8b', '#ffffff', '#3fe0a8'][i % 3]),
    float: () => { const b = group(football(0.3)); b.userData.spin = 1; return b; },
    crest: (c) => {
      c.add(mesh(GEO.box(4.2, 1.5, 0.3), std('#1b1b2f'), 0, 0, 0));
      c.add(mesh(GEO.box(1.6, 1.0, 0.1), lit('#ff3d8b', 1.4), -1.0, 0.18, 0)); c.add(mesh(GEO.box(1.6, 1.0, 0.1), lit('#3fe0a8', 1.4), 1.0, 0.18, 0));
      const b = football(0.75); b.position.set(0, M(1.4), M(0.1)); c.add(b);
    },
  },
  space: {
    tint: '#c4bcff', outfits: ['#c9ccd6', '#2a1f5a', '#b44cff', '#4cc9ff', '#ffffff', '#1b1b2f'], bags: ['#c9ccd6', '#b44cff'], hat: 'antenna',
    door: (i) => (i % 2 ? mesh(starGeo(0.14, 0.06), lit('#ffffff', 1.6)) : mesh(GEO.sph(0.09, 12), lit(['#b44cff', '#4cc9ff', '#ff8fd8'][i % 3], 1.2))),
    float: (i) => {
      const pl = group(mesh(GEO.sph(0.32, 18), lit(['#ff8fd8', '#4cc9ff', '#ffe066', '#b44cff'][i % 4], 0.5)));
      const ring = mesh(GEO.torus(0.5, 0.04, Math.PI * 2, 32), std('#ffffff')); ring.rotation.x = 1.2; pl.add(ring);
      pl.userData.spin = 0.5; return pl;
    },
    crest: (c) => {
      c.add(mesh(GEO.sph(1.1, 28), lit('#b44cff', 0.5), 0, 0, 0));
      const ring = mesh(GEO.torus(1.7, 0.12, Math.PI * 2, 48), lit('#ffd6f5', 0.8)); ring.rotation.x = 0.3; ring.rotation.y = 0.5; c.add(ring);
      [[-2.2, 0.9], [2.1, -0.5], [1.6, 1.3], [-1.8, -1.1]].forEach(([d, h]) => c.add(mesh(starGeo(0.3, 0.13, 0.1), lit('#ffffff', 1.6), d, 0, h)));
    },
  },
  ocean: {
    tint: '#c4f0ec', outfits: ['#3fd0ff', '#7affd8', '#ff9fc8', '#b18bff', '#ffffff', '#1f8f9a'], hair: ['#3fd0ff', '#ff9fc8', '#b18bff', '#7affd8', '#2b1220', '#1f4f6b'], bags: ['#fff4f0', '#ff9fc8'], hat: 'shell',
    door: (i) => (i % 2 ? mesh(GEO.sph(0.06, 10), std('#fff8f0', { metalness: 0.4, roughness: 0.15 })) : shell(['#ff9fc8', '#ffd6e8', '#ffb36b'][i % 3], 0.18)),
    float: (i) => { // jellyfish
      const col = ['#ff9fc8', '#b18bff', '#7affd8'][i % 3], j = group(mesh(new THREE.SphereGeometry(M(0.32), 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), lit(col, 0.9, { transparent: true, opacity: 0.8 })));
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; j.add(mesh(GEO.cyl(0.012, 0.006, 0.55, 4), lit(col, 0.8), Math.cos(a) * 0.18, Math.sin(a) * 0.18, -0.28)); }
      j.userData.spin = 0.3; return j;
    },
    crest: (c) => { c.add(shell('#ffd6e8', 1.6)); c.add(mesh(GEO.sph(0.4, 20), lit('#fff8f0', 0.6, { metalness: 0.4, roughness: 0.15 }), 0, 0.4, -0.9)); },
  },
  disco: {
    tint: '#f0c4f0', outfits: ['#e6c47e', '#ff4fa8', '#b44cff', '#c9ccd6', '#ffffff', '#ff9a3c'], bags: ['#e6c47e', '#c9ccd6'], hat: 'shades',
    door: (i) => (i % 2 ? mesh(GEO.ico(0.11, 1), std('#e8e8f0', { metalness: 1, roughness: 0.1, flatShading: true })) : mesh(starGeo(0.15, 0.06), lit(['#ff4fa8', '#ffb03c', '#b44cff'][i % 3], 1.8))),
    float: () => { const b = group(mesh(GEO.ico(0.35, 2), std('#e8e8f0', { metalness: 1, roughness: 0.08, flatShading: true, emissive: '#553355', emissiveIntensity: 0.4 }))); b.userData.spin = 0.9; return b; },
    crest: (c) => {
      const disc = mesh(GEO.cyl(1.5, 1.5, 0.1, 48), std('#1b1b1f', { roughness: 0.25, metalness: 0.3 })); disc.rotation.x = Math.PI / 2; c.add(disc);
      const label = mesh(GEO.cyl(0.55, 0.55, 0.12, 32), lit('#ff4fa8', 1.0)); label.rotation.x = Math.PI / 2; c.add(label);
      [1.0, 1.25].forEach((r) => c.add(mesh(GEO.torus(r, 0.015, Math.PI * 2, 48), std('#e6c47e', { metalness: 0.8 }), 0, 0.07, 0)));
      [[-2.1, 0.8], [2.1, -0.6], [1.9, 1.1]].forEach(([d, h], k) => c.add(mesh(starGeo(0.35, 0.12, 0.1), lit(['#ffb03c', '#b44cff', '#ffe6a0'][k], 1.8), d, 0, h)));
    },
  },
  garden: {
    tint: '#eaf6d8', outfits: ['#ffb3d1', '#fff0aa', '#c9a3ff', '#c7efdf', '#ffffff', '#ff8fb8'], bags: ['#f3e6c8', '#ff8fb8'], hat: 'flowers',
    door: (i) => (i % 3 === 1 ? mesh(GEO.sph(0.1, 10), std('#6fbf5a'), 0, 0, -0.05) : flower(['#ff8fb8', '#ffffff', '#c9a3ff', '#ffd23f'][i % 4], 0.14)),
    float: (i) => { // butterflies
      const col = std(['#ff8fb8', '#c9a3ff', '#ffd23f', '#7ad7ff'][i % 4], { side: THREE.DoubleSide, emissive: '#331122', emissiveIntensity: 0.3 });
      const b = group(mesh(GEO.cyl(0.02, 0.02, 0.25, 6), std('#3a2a22'))); b.children[0].rotation.x = Math.PI / 2;
      const l = wing(col, -1), r = wing(col, 1); l.scale.setScalar(1.3); r.scale.setScalar(1.3); b.add(l, r);
      b.userData.wings = [l, r]; b.userData.circle = 1.3; return b;
    },
    crest: (c) => { c.add(flower('#ffd23f', 1.0, '#6b4433', 14)); [[-2.2, -0.6, '#ff8fb8'], [2.2, -0.4, '#c9a3ff'], [-1.6, 1.0, '#ffffff'], [1.7, 1.1, '#ff8fb8']].forEach(([d, h, col]) => { const f = flower(col, 0.45); f.position.set(M(d), M(h), M(0.1)); c.add(f); }); },
  },
  winter: {
    tint: '#e0eeff', outfits: ['#ffffff', '#bfe9ff', '#1f3a6a', '#ffc6ec', '#c9b8ff', '#e6c47e'], bags: ['#ffffff', '#bfe9ff'], hat: 'earmuffs',
    door: (i) => (i % 2 ? mesh(GEO.cone(0.05, 0.3, 6), lit('#dff2ff', 0.5, { transparent: true, opacity: 0.85 }), 0, 0, -0.15) : snowflake(0.18, lit('#ffffff', 1.2))),
    float: () => { const s = group(snowflake(0.4, lit('#e6f6ff', 1.2))); s.userData.spin = 0.6; return s; },
    crest: (c) => { c.add(snowflake(1.6, lit('#bfe9ff', 1.4))); c.add(mesh(GEO.sph(0.25, 16), lit('#ffffff', 1.6), 0, 0.1, 0)); },
  },
  candy: {
    tint: '#ffe6f4', outfits: ['#ff8fd8', '#a8f0ff', '#fff0aa', '#c9ffb3', '#ffffff', '#ffb3e6'], hair: ['#ff8fd8', '#a8f0ff', '#2b1a14', '#fff0aa', '#2b1220', '#b18bff'], bags: ['#ff8fd8', '#a8f0ff', '#fff0aa'], hat: 'cherry',
    door: (i) => { // wrapped sweets
      const col = std(['#ff8fd8', '#a8f0ff', '#fff0aa', '#c9ffb3'][i % 4], { roughness: 0.3 });
      return group(mesh(GEO.sph(0.09, 12), col), ...[-1, 1].map((s) => { const e = mesh(GEO.cone(0.07, 0.1, 8), col, s * 0.13, 0, 0); e.rotation.z = s * Math.PI / 2; return e; }));
    },
    float: (i) => {
      if (i % 2) { const c = group(...[[0, 0, 0.35], [0.3, 0.05, 0.28], [-0.3, 0, 0.26], [0.1, 0.15, 0.25]].map(([dx, dy, r]) => mesh(GEO.sph(r, 12), std('#ffc6ec', { roughness: 1 }), dx, dy, 0))); return c; }
      const l = group(mesh(GEO.cyl(0.03, 0.03, 0.6, 6), std('#ffffff'), 0, 0, -0.45)), d = mesh(GEO.cyl(0.3, 0.3, 0.08, 24), lit(['#ff8fd8', '#a8f0ff'][i % 4 ? 1 : 0], 0.6)); d.rotation.x = Math.PI / 2; l.add(d); l.userData.spin = 0.9; return l;
    },
    crest: (c) => {
      const d = mesh(GEO.cyl(1.4, 1.4, 0.2, 48), std('#ff8fd8', { roughness: 0.3 })); d.rotation.x = Math.PI / 2; c.add(d);
      [1.1, 0.75, 0.4].forEach((r, k) => c.add(mesh(GEO.torus(r, 0.1, Math.PI * 2, 40), std(k % 2 ? '#ff8fd8' : '#ffffff'), 0, 0.12, 0)));
      c.add(mesh(GEO.cyl(0.1, 0.1, 1.6, 8), std('#ffffff'), 0, -0.05, -1.9));
    },
  },
  art: {
    tint: '#fff0e0', outfits: ['#ffffff', '#3fa9f5', '#ffd23f', '#ff5a5f', '#2b1220', '#5ad17a'], bags: ['#ff5a5f', '#ffd23f', '#3fa9f5'], hat: 'beret',
    door: (i) => { const col = std(['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a', '#b44cff'][i % 5], { roughness: 0.2 }); return group(mesh(GEO.sph(0.07, 10), col, 0, 0, -0.12), mesh(GEO.cone(0.06, 0.1, 10), col, 0, 0, -0.04)); },
    float: (i) => { // a framed little painting
      const f = group(mesh(GEO.box(0.6, 0.5, 0.05), std('#e6c47e', { metalness: 0.6, roughness: 0.3 })), mesh(GEO.box(0.5, 0.4, 0.06), lit(['#ff5a5f', '#3fa9f5', '#ffd23f', '#5ad17a'][i % 4], 0.5)));
      f.userData.spin = 0.5; return f;
    },
    crest: (c) => {
      const pal = mesh(GEO.cyl(1.6, 1.6, 0.12, 40), std('#c98d5b', { roughness: 0.8 })); pal.rotation.x = Math.PI / 2; pal.scale.set(1.3, 1, 1); c.add(pal);
      ['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a', '#b44cff', '#ffffff'].forEach((col, k) => { const a = (k / 6) * Math.PI * 1.6 + 0.7; const b = mesh(GEO.sph(0.3, 14), std(col, { roughness: 0.2 }), Math.cos(a) * 1.5, 0.12, Math.sin(a) * 1.1); b.scale.z = 0.4; c.add(b); });
    },
  },
  fashion: {
    tint: '#f4eef0', outfits: ['#1b1b1f', '#ffffff', '#ff3d8b', '#e6c47e', '#1b1b1f', '#c81d32'], bags: ['#1b1b1f', '#e6c47e', '#ff3d8b'], hat: 'fascinator',
    door: (i) => (i % 2 ? mesh(GEO.sph(0.05, 10), std('#fff8f0', { metalness: 0.4, roughness: 0.15 })) : mesh(GEO.cone(0.11, 0.26, 12), std(['#1b1b1f', '#ff3d8b', '#ffffff'][(i / 2) % 3], { roughness: 0.5 }), 0, 0, -0.18)),
    float: (i) => { // shopping bags
      const col = std(['#ff3d8b', '#1b1b1f', '#ffffff', '#e6c47e'][i % 4], { roughness: 0.6 });
      const b = group(mesh(GEO.box(0.45, 0.5, 0.18), col), mesh(GEO.torus(0.11, 0.015, Math.PI, 12), std('#e6c47e', { metalness: 0.7 }), 0, 0, 0.25));
      b.userData.spin = 0.6; return b;
    },
    crest: (c) => {
      const gold = std('#e6c47e', { metalness: 0.8, roughness: 0.25 });
      c.add(mesh(GEO.torus(0.25, 0.05, Math.PI * 1.5, 20), gold, 0, 0, 1.55), mesh(GEO.box(2.4, 0.08, 0.08), gold, 0, 0, 1.2));
      [-1, 1].forEach((s) => { const arm = mesh(GEO.box(1.3, 0.08, 0.08), gold, s * 0.6, 0, 1.35); arm.rotation.z = -s * 0.3; c.add(arm); });
      c.add(mesh(GEO.cone(1.2, 2.4, 24), std('#ff3d8b', { roughness: 0.5 }), 0, 0, -0.1), mesh(GEO.cyl(0.35, 0.5, 0.6, 20), std('#ff3d8b', { roughness: 0.5 }), 0, 0, 1.0));
    },
  },
  science: {
    tint: '#e0f5ee', outfits: ['#ffffff', '#ffffff', '#7affc8', '#4cc9ff', '#1f3a4a', '#ffffff'], bags: ['#4cc9ff', '#7affc8'], hat: 'goggles',
    door: (i) => mesh(GEO.cyl(0.04, 0.04, 0.3, 8), lit(['#7affc8', '#ff3d8b', '#4cc9ff', '#b7ff3c'][i % 4], 1.2), 0, 0, -0.18),
    float: () => { const a = group(atom(0.35)); a.userData.spin = 0.9; return a; },
    crest: (c) => c.add(atom(1.3)),
  },
  books: {
    tint: '#f5e8d4', outfits: ['#7a2c3a', '#1f4f6b', '#f3e6c8', '#2f6b45', '#3a2a22', '#e6c47e'], bags: ['#7a2c3a', '#c9a14a'], hat: 'readers',
    door: (i) => mesh(GEO.box(0.2, 0.28, 0.06), std(['#7a2c3a', '#1f4f6b', '#e6c47e', '#2f6b45', '#ff8fb8'][i % 5], { roughness: 0.6 }), 0, 0, -0.18),
    float: (i) => { // books flapping like birds
      const col = std(['#7a2c3a', '#1f4f6b', '#e6c47e', '#2f6b45'][i % 4], { roughness: 0.6 });
      const covers = [-1, 1].map((s) => { const h = new THREE.Group(); h.add(mesh(GEO.box(0.28, 0.03, 0.4), col, s * 0.14, 0, 0)); return h; });
      const b = group(mesh(GEO.box(0.04, 0.06, 0.4), col), ...covers); b.userData.wings = covers; b.userData.circle = 1.2; return b;
    },
    crest: (c) => {
      [-1, 1].forEach((s) => { const pg = mesh(GEO.box(1.8, 2.4, 0.12), std('#fffaf0', { roughness: 0.9 }), s * 0.92, 0, 0); pg.rotation.y = s * 0.25; c.add(pg); for (let r = 0; r < 6; r++) c.add(mesh(GEO.box(1.2, 0.06, 0.02), std('#8a7a6a'), s * 0.92, s * -0.25 + 0.08, 0.8 - r * 0.32)); });
      c.add(mesh(GEO.box(4.0, 2.6, 0.08), std('#7a2c3a', { roughness: 0.6 }), 0, -0.25, 0));
    },
  },
  bake: {
    tint: '#fdeee4', outfits: ['#ffffff', '#ffb3c1', '#c7efdf', '#fff0aa', '#ffffff', '#ddcffb'], bags: ['#ffb3c1', '#c7efdf'], hat: 'chef',
    door: (i) => macaron(0.16, ['#ffb3c1', '#c7efdf', '#fff0aa', '#ddcffb'][i % 4]),
    float: (i) => {
      if (i % 2) { const c = group(mesh(GEO.torus(0.25, 0.12, Math.PI * 1.2, 16), std('#e0a050', { roughness: 0.7 }))); c.userData.spin = 0.8; return c; } // a croissant
      const m = group(macaron(0.35, ['#ffb3c1', '#c7efdf', '#ddcffb'][i % 3])); m.rotation.x = 1.2; m.userData.spin = 0.9; return m;
    },
    crest: (c) => {
      const w = std('#ffffff', { roughness: 0.6 });
      c.add(mesh(GEO.cyl(1.0, 0.9, 1.4, 24), w, 0, 0, -0.6));
      [[0, 0.8, 0.9], [-0.8, 0.5, 0.65], [0.8, 0.5, 0.65], [-0.4, 1.2, 0.6], [0.4, 1.2, 0.6]].forEach(([d, h, r]) => c.add(mesh(GEO.sph(r, 16), w, d, 0, h)));
    },
  },
  wellness: {
    tint: '#eaf6ee', outfits: ['#c7efdf', '#ffd1dc', '#ffffff', '#ddcffb', '#fff3e6', '#9fd8c0'], bags: ['#c7efdf', '#ffffff'], hat: 'bun',
    door: (i) => (i % 2 ? mesh(GEO.sph(0.05, 10), std('#fff3e6')) : (() => { const l = mesh(GEO.sph(0.12, 10), std('#7fc08a', { roughness: 0.8 }), 0, 0, -0.1); l.scale.set(0.5, 0.2, 1); l.rotation.x = 1.2; return l; })()),
    float: (i) => { // floating lotus
      const o = group();
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, pe = mesh(GEO.sph(0.18, 10), lit(['#ffd1dc', '#ffffff'][i % 2], 0.3), Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0.05); pe.scale.set(0.45, 0.3, 1); pe.rotation.set(-0.5, a, 0, 'YXZ'); o.add(pe); }
      o.add(mesh(GEO.cyl(0.32, 0.32, 0.03, 20), std('#4f9a6a'), 0, 0, -0.03)); o.userData.spin = 0.3; return o;
    },
    crest: (c) => {
      const sun = mesh(GEO.cyl(1.6, 1.6, 0.08, 48), lit('#ffe6c8', 0.6)); sun.rotation.x = Math.PI / 2; c.add(sun);
      for (let k = 0; k < 7; k++) { const a = ((k - 3) / 3) * 1.2, pe = mesh(GEO.sph(0.55, 14), std(k % 2 ? '#ffb3c8' : '#ffd1dc', { roughness: 0.5 }), Math.sin(a) * 0.7, 0.15, -0.6 + Math.cos(a) * 0.7); pe.scale.set(0.45, 0.2, 1); pe.rotation.set(Math.PI / 2, 0, -a, 'XYZ'); c.add(pe); }
    },
  },
  travel: {
    tint: '#eef6ff', outfits: ['#ffffff', '#3fa9f5', '#ffd23f', '#ff5a5f', '#c9b38a', '#5ad17a'], bags: ['#c9b38a', '#ff5a5f', '#3fa9f5'], hat: 'sunhat',
    door: (i) => pennant(['#ff5a5f', '#ffd23f', '#3fa9f5', '#5ad17a', '#ffffff'][i % 5]),
    float: (i) => { const p = group(paperPlane(['#ffffff', '#bfe9ff', '#ffd1ec'][i % 3])); p.userData.circle = 1.8; return p; },
    crest: (c) => {
      const earth = mesh(GEO.sph(1.3, 32), std('#3fa9f5', { roughness: 0.5 })); c.add(earth);
      [[0.4, 0.3, 0.5], [-0.5, 0.2, -0.3], [0.1, 0.5, -0.6]].forEach(([d, z, h]) => { const l = mesh(GEO.sph(0.55, 12), std('#7fd08a', { roughness: 0.6 }), d, z + 0.75, h); l.scale.set(1, 0.6, 0.35); c.add(l); });
      const ring = mesh(GEO.torus(1.8, 0.03, Math.PI * 2, 48), std('#ffffff')); ring.rotation.x = 0.4; c.add(ring);
      const p = paperPlane('#ffffff'); p.scale.setScalar(2.5); p.position.set(M(1.7), M(0.6), M(0.4)); p.rotation.z = 0.5; c.add(p);
    },
  },
  tech: {
    tint: '#d6e8f8', outfits: ['#f2f4f8', '#1b2233', '#29e3ff', '#c9ccd6', '#7a5cff', '#ffffff'], bags: ['#c9ccd6', '#29e3ff'], hat: 'cyber',
    door: (i) => mesh(GEO.box(0.1, 0.1, 0.1), lit(i % 2 ? '#29e3ff' : '#ffffff', 2)),
    float: () => { const d = group(drone()); d.userData.circle = 1.4; return d; },
    crest: (c) => {
      const white = std('#f2f4f8', { roughness: 0.3, metalness: 0.2 });
      c.add(mesh(GEO.box(3.0, 2.2, 0.6), white), mesh(GEO.box(2.4, 1.2, 0.1), std('#1b2233'), 0, 0.3, 0.1));
      [-0.6, 0.6].forEach((d) => c.add(mesh(GEO.sph(0.25, 14), lit('#29e3ff', 2.2), d, 0.4, 0.2)));
      c.add(mesh(GEO.box(0.9, 0.12, 0.05), lit('#29e3ff', 1.8), 0, 0.4, -0.35), mesh(GEO.cyl(0.04, 0.04, 0.7, 6), std('#1b2233'), 0, 0, 1.45), mesh(GEO.sph(0.18, 10), lit('#ff3d8b', 2), 0, 0, 1.85));
    },
  },
  safari: {
    tint: '#f5e6c8', outfits: ['#c9b38a', '#6b8a3a', '#f3e6c8', '#8a5a2a', '#e07a2e', '#ffffff'], bags: ['#8a5a2a', '#c9b38a'], hat: 'safari',
    door: (i) => { const l = mesh(GEO.sph(0.14, 10), std(i % 2 ? '#6b8a3a' : '#8aa04a', { roughness: 0.8 }), 0, 0, -0.12); l.scale.set(0.5, 1, 0.15); return l; },
    float: (i) => {
      const col = std(['#ff5a5f', '#29c7ff', '#ffd23f', '#5ad17a'][i % 4], { side: THREE.DoubleSide });
      const bird = group(mesh(GEO.sph(0.07, 10), col), mesh(GEO.cone(0.03, 0.08, 4), std('#ffb03c'), 0, 0.09, 0));
      bird.children[1].rotation.x = Math.PI / 2;
      const l = wing(col, -1), r = wing(col, 1); l.scale.setScalar(1.3); r.scale.setScalar(1.3); bird.add(l, r);
      bird.userData.wings = [l, r]; bird.userData.circle = 1.6; return bird;
    },
    crest: (c) => {
      const sun = mesh(GEO.cyl(1.7, 1.7, 0.08, 48), lit('#ff9a3c', 1.0)); sun.rotation.x = Math.PI / 2; c.add(sun);
      const dark = std('#2b1a14');
      c.add(mesh(GEO.cyl(0.08, 0.12, 1.8, 6), dark, 0.4, 0.1, -0.6));
      const top = mesh(GEO.sph(1.0, 14), dark, 0.4, 0.1, 0.4); top.scale.set(1.4, 0.25, 0.1); c.add(top);
    },
  },
  carnival: {
    tint: '#ffece6', outfits: ['#ff3d6e', '#ffd23f', '#29c7ff', '#ffffff', '#5ad17a', '#b44cff'], bags: ['#ffd23f', '#ff3d6e'], hat: 'party',
    door: (i) => mesh(GEO.sph(0.07, 8), lit(['#ff3d6e', '#ffd23f', '#29c7ff', '#5ad17a'][i % 4], 2.2)),
    float: (i) => { // circus balls
      const b = group(mesh(GEO.sph(0.35, 20), std('#ffffff', { map: stripeTex(['#ff3d6e', '#29c7ff', '#ffd23f'][i % 3], '#ffffff', 8), roughness: 0.3 })));
      b.userData.spin = 1.2; return b;
    },
    crest: (c) => {
      const tex = stripeTex('#ff3d6e', '#ffffff', 16);
      c.add(mesh(GEO.cyl(1.7, 1.7, 1.2, 24), std('#ffffff', { map: tex, roughness: 0.5 }), 0, 0, -0.6), mesh(GEO.cone(1.9, 1.6, 24), std('#ffffff', { map: tex, roughness: 0.5 }), 0, 0, 0.8));
      c.add(mesh(GEO.cyl(0.02, 0.02, 0.6, 6), std('#ffd23f'), 0, 0, 1.9), mesh(new THREE.CircleGeometry(M(0.25), 3), std('#ffd23f', { side: THREE.DoubleSide }), 0.15, 0, 2.0));
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
