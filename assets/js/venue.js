// PinkOut Partners — the venue as a detailed miniature, styled after the concept renders:
// polished marble floors, white counters with gold trim, flower walls and greenery, glass shelves, soft fabric seating.
// Layout follows the concept floor plan (PinkOut_FinalPresentation p.17–18): 50 m × 45 m. Everything is placed in
// plan metres (x west→east, y north→south). Visitors come in through the Entrance passage (door on the north wall)
// and leave through the Exit passage (door on the south wall); the west wall has no door.
// It also returns "spots": where a visitor sits, browses, dances or watches, so crowd.js can give everyone something to do.
// Static pieces are merged per zone and material, so the whole model costs a few draw calls per zone.
import * as THREE from './vendor/three.module.min.js?v=1';

export const U = 2.5;                                  // metres per scene unit
export const W = 50 / U, D = 45 / U;                   // building footprint in units
export const toX = (m) => m / U - W / 2;               // plan x (m, west→east)  → scene x
export const toZ = (m) => m / U - D / 2;               // plan y (m, north→south) → scene z

export const back = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

/* The two doors (plan metres): crowd.js walks visitors in through one and out through the other */
export const DOORS = { entrance: [2.8, -0.25], exit: [2.8, 45.25] };

/* ---------- Palette (from the concept renders) ---------- */
const P = {
  white: '#fffafb', blush: '#f6d3dd', rose: '#eaa6bb', pink: '#ff8fb8', hot: '#ff3d8b', cherry: '#df004c',
  gold: '#e6c47e', cream: '#f6eee8', velvet: '#e98fb0', sage: '#b9dcc6', lilac: '#ddcffb', butter: '#fff0aa', peach: '#ffd9c2',
  leaf: '#5f9a63', leaf2: '#86bf7f', plum: '#2b1220',
};
/* Each world's own colour, so it reads at a glance and matches the floor plan and label dots (data.js hex):
   floor = a mid tone of the zone colour, wall = its room walls, edge = the inlay border round its floor. */
export const LOOK = {
  passage: { floor: '#f2a6c1', vein: '#fff2f7', wall: '#ff9ec0', edge: '#ff4f8f' },
  hub: { floor: '#f5d98f', vein: '#fff6dc', wall: P.white, edge: '#e2ad3b' },
  make: { floor: '#9fd9be', wall: '#86d0ae', edge: '#3fa57c' },
  market: { floor: '#ffb990', vein: '#fff3ea', wall: '#ffa67b', edge: '#ec7b44' },
  live: { floor: '#a3305f', wall: P.white, edge: '#ff3d8b' },
  beauty: { floor: '#bfa8f1', vein: '#f6f1ff', wall: '#b39af0', edge: '#8a68dd' },
  move: { floor: '#a6caef', wall: '#8cbcec', edge: '#4f95dc' },
};

/* ---------- Materials ---------- */
// Solid by default: transparent meshes are re-sorted every frame, and a see-through mesh that writes depth hides
// whatever is drawn after it, so pieces popped in and out as the camera moved. Only glass is see-through.
export const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...extra });
const GOLD = { metalness: 0.7, roughness: 0.32 };
const GLASS = { opacity: 0.3, transparent: true, depthWrite: false, roughness: 0.04, metalness: 0.2 };
const FABRIC = { roughness: 0.95 };
const MIRROR = { metalness: 0.95, roughness: 0.06 };
const GLOSS = { roughness: 0.22 };
const glow = (color, i = 0.9) => ({ emissive: color, emissiveIntensity: i });

const textures = new Map();
const canvasTexture = (key, draw) => {
  if (textures.has(key)) return textures.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  textures.set(key, t);
  return t;
};
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // the same model every visit
/** polished marble: soft clouds, thin veins, faint slab joints */
function marbleTexture(base, vein) {
  return canvasTexture(`m${base}${vein}`, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 10; i++) {
      const x = rnd() * 512, y = rnd() * 512, r = 80 + rnd() * 160;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    }
    g.strokeStyle = vein; g.lineCap = 'round';
    for (let v = 0; v < 9; v++) {
      g.globalAlpha = 0.18 + rnd() * 0.3; g.lineWidth = 0.6 + rnd() * 1.6;
      let x = rnd() * 512, y = rnd() * 512, a = rnd() * Math.PI * 2;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 40; s++) { a += (rnd() - 0.5) * 0.7; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 0.25; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    g.strokeRect(1, 1, 255, 255); g.strokeRect(257, 257, 254, 254); g.strokeRect(257, 1, 254, 255); g.strokeRect(1, 257, 255, 254);
    g.globalAlpha = 1;
  });
}
/** light oak planks */
function woodTexture(base) {
  return canvasTexture(`w${base}`, (g) => {
    const c = new THREE.Color(base);
    for (let y = 0; y < 512; y += 32) {
      const k = (rnd() - 0.5) * 0.08;
      g.fillStyle = `#${c.clone().offsetHSL(0, 0, k).getHexString()}`; g.fillRect(0, y, 512, 31);
      g.fillStyle = `#${c.clone().offsetHSL(0, 0, -0.08).getHexString()}`; g.fillRect(0, y + 31, 512, 1);
      g.fillRect(Math.floor(rnd() * 400) + 50, y, 1, 31);
      g.globalAlpha = 0.12; g.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) g.fillRect(rnd() * 512, y + rnd() * 30, 60 + rnd() * 120, 1);
      g.globalAlpha = 1;
    }
  });
}
const marble = (base = '#fbf6f6', vein = '#d8bfc8') => ({ map: marbleTexture(base, vein), roughness: 0.16 });

/** A soft studio light environment, so marble, gold and glass have something to reflect. */
export function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 14, 30), new THREE.MeshBasicMaterial({ color: '#b98d9c', side: THREE.BackSide })));
  [[-8, 6, -6, '#fff4f6', 7], [9, 5, 4, '#ffe8dc', 5], [0, 6.9, 0, '#ffffff', 8], [-6, 3, 12, '#ffc9da', 4]].forEach(([x, y, z, c, s]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.6), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

/* ---------- Primitives ---------- */
export function box(w, h, d, color, x = 0, z = 0, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
export function cyl(rTop, rBottom, h, color, x = 0, z = 0, y = 0, seg = 28) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
function archGeometry(width, height, wall, depth) { // units; an arch in the XY plane, walked through along z
  const r = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0); s.lineTo(-r, height - r); s.absarc(0, height - r, r, Math.PI, 0, true); s.lineTo(r, 0);
  s.lineTo(r - wall, 0); s.lineTo(r - wall, height - r); s.absarc(0, height - r, r - wall, 0, Math.PI, false); s.lineTo(-r + wall, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  return g;
}
/** a box with soft, rounded edges (metres in, units out), standing on y = 0 */
function roundedBox(w, h, d, r = 0.06) {
  const b = Math.max(0.001, Math.min(r, w / 2 - 0.005, d / 2 - 0.005, h / 2 - 0.005)) / U;
  const sw = Math.max(0.002, w / U - 2 * b), sd = Math.max(0.002, d / U - 2 * b), hh = Math.max(0.001, h / U - 2 * b);
  const rr = Math.min(sw, sd) * 0.22;
  const x = -sw / 2, y = -sd / 2;
  const s = new THREE.Shape();
  s.moveTo(x + rr, y); s.lineTo(x + sw - rr, y); s.quadraticCurveTo(x + sw, y, x + sw, y + rr);
  s.lineTo(x + sw, y + sd - rr); s.quadraticCurveTo(x + sw, y + sd, x + sw - rr, y + sd);
  s.lineTo(x + rr, y + sd); s.quadraticCurveTo(x, y + sd, x, y + sd - rr);
  s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
  const small = w + d < 1.4; // little pieces don't need smooth curves: keeps the model light on phones
  const g = new THREE.ExtrudeGeometry(s, { depth: hh, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: small ? 1 : 3, curveSegments: small ? 2 : 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, b, 0);
  return g;
}
function heartGeometry(size, depth) { // units
  const s = new THREE.Shape(); const k = size / 2;
  s.moveTo(0, -k); s.bezierCurveTo(-k * 1.6, -k * 0.2, -k * 0.9, k * 1.1, 0, k * 0.45); s.bezierCurveTo(k * 0.9, k * 1.1, k * 1.6, -k * 0.2, 0, -k);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/* ---------- Furniture kit: plan metres; `at` gives a rotated local kit for one piece of furniture ---------- */
function makeKit(group, X, Z, spots, zone) {
  const M = (m) => m / U;
  const put = (geo, material, mx, my, y) => { const m = new THREE.Mesh(geo, material); m.position.set(X(mx), M(y), Z(my)); group.add(m); return m; };
  const k = {
    M, X, Z, group, zone,
    B: (mx, my, w, d, h, color, y = 0, extra = {}) => put(new THREE.BoxGeometry(M(w), M(h), M(d)), mat(color, extra), mx, my, y + h / 2),
    R: (mx, my, w, d, h, color, y = 0, extra = {}, r = 0.06) => put(roundedBox(w, h, d, r), mat(color, extra), mx, my, y),
    C: (mx, my, r, h, color, y = 0, extra = {}, rTop = r, seg = 28) => put(new THREE.CylinderGeometry(M(rTop), M(r), M(h), seg), mat(color, extra), mx, my, y + h / 2),
    S: (mx, my, y, r, color, extra = {}, seg = 16) => put(new THREE.SphereGeometry(M(r), seg, Math.max(8, Math.round(seg * 0.75))), mat(color, extra), mx, my, y),
    I: (mx, my, y, r, color, detail = 1, extra = {}) => put(new THREE.IcosahedronGeometry(M(r), detail), mat(color, { flatShading: detail === 0, ...extra }), mx, my, y),
    T: (mx, my, y, r, tube, color, extra = {}, arc = Math.PI * 2) => put(new THREE.TorusGeometry(M(r), M(tube), 12, 48, arc), mat(color, extra), mx, my, y),
    at(mx, my, yaw = 0) {
      const g = new THREE.Group();
      g.position.set(X(mx), 0, Z(my)); g.rotation.y = yaw; group.add(g);
      return makeKit(g, M, M, spots, zone);
    },
    /** something a visitor can do here (sit, browse, queue, watch, dance…): crowd.js fills it */
    spot(pose, mx, my, yaw = 0, seat = 0) {
      spots.push({ zone, pose, wx: group.position.x + X(mx), wz: group.position.z + Z(my), yaw, seat: M(seat) });
    },
  };
  return k;
}
const face = (mx, my, tx, ty) => Math.atan2(tx - mx, ty - my); // yaw that turns the local front (+y) toward a point

/* reusable pieces (all in metres) */
function counter(k, mx, my, w, d, h = 1.0) {
  k.R(mx, my, w, d, h - 0.06, P.white, 0, GLOSS, 0.05);
  k.B(mx, my, w + 0.02, d + 0.02, 0.04, P.gold, h - 0.14, GOLD);
  k.R(mx, my, w + 0.08, d + 0.08, 0.06, '#ffffff', h - 0.06, marble(), 0.02);
}
function chair(k, mx, my, yaw, color = P.cream, sitter = false, base = 0) {
  const c = k.at(mx, my, yaw);
  c.R(0, 0, 0.5, 0.5, 0.14, color, base + 0.31, FABRIC, 0.06);
  c.R(0, -0.22, 0.5, 0.14, 0.45, color, base + 0.4, FABRIC, 0.06);
  c.C(0, 0, 0.03, 0.31, P.gold, base, GOLD); c.C(0, 0, 0.16, 0.02, P.gold, base, GOLD);
  if (sitter) k.spot('sit', mx, my, yaw, base + 0.45);
}
function armchair(k, mx, my, yaw, color = P.cream, sitter = false, base = 0) {
  const c = k.at(mx, my, yaw);
  c.R(0, 0, 0.8, 0.75, 0.42, color, base, FABRIC, 0.14);
  c.R(0, -0.3, 0.8, 0.2, 0.75, color, base, FABRIC, 0.1);
  c.R(-0.34, 0, 0.14, 0.75, 0.6, color, base, FABRIC, 0.06); c.R(0.34, 0, 0.14, 0.75, 0.6, color, base, FABRIC, 0.06);
  if (sitter) k.spot('sit', mx, my, yaw, base + 0.42);
}
function sofa(k, mx, my, yaw, w = 2.4, color = P.cream, sitters = 0) {
  const c = k.at(mx, my, yaw);
  c.R(0, 0, w, 0.85, 0.42, color, 0, FABRIC, 0.14);
  c.R(0, -0.33, w, 0.22, 0.8, color, 0, FABRIC, 0.1);
  c.R(-w / 2 + 0.1, 0, 0.2, 0.85, 0.62, color, 0, FABRIC, 0.08); c.R(w / 2 - 0.1, 0, 0.2, 0.85, 0.62, color, 0, FABRIC, 0.08);
  for (let i = 0; i < sitters; i++) {
    const lx = -w / 2 + 0.55 + i * ((w - 1.1) / Math.max(1, sitters - 1));
    const wp = new THREE.Vector3(lx, 0, 0).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    k.spot('sit', mx + wp.x, my + wp.z, yaw, 0.42);
  }
}
function roundTable(k, mx, my, r = 0.45, h = 0.74) {
  k.C(mx, my, 0.05, h, P.gold, 0, GOLD); k.C(mx, my, 0.22, 0.03, P.gold, 0, GOLD);
  k.C(mx, my, r, 0.04, '#ffffff', h, marble(), r, 32);
}
function plant(k, mx, my, size = 1, pot = P.white) {
  k.C(mx, my, 0.26 * size, 0.55 * size, pot, 0, GLOSS, 0.32 * size); k.C(mx, my, 0.33 * size, 0.03, P.gold, 0.55 * size, GOLD);
  [[0, 0, 0.95, 0.38], [0.18, 0.1, 1.25, 0.26], [-0.16, -0.08, 1.2, 0.27], [0.05, -0.18, 1.45, 0.2], [-0.08, 0.16, 1.4, 0.2]].forEach(([dx, dy, y, r], i) => {
    k.I(mx + dx * size, my + dy * size, y * size, r * size, i % 2 ? P.leaf2 : P.leaf, 1);
  });
}
function flowers(k, mx, my, y, n, spread, palette = [P.pink, '#ffffff', P.blush, P.hot, P.rose]) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.39, r = spread * Math.sqrt((i + 0.5) / n);
    k.I(mx + Math.cos(a) * r, my + Math.sin(a) * r, y + rnd() * 0.12, 0.1 + rnd() * 0.06, palette[i % palette.length], 0);
  }
}
/** a wall covered in flowers and greenery, facing 'e' | 'w' | 'n' | 's' */
function flowerWall(k, mx, my, len, h, facing) {
  const alongY = facing === 'e' || facing === 'w';
  const out = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] }[facing];
  k.B(mx, my, alongY ? 0.2 : len, alongY ? len : 0.2, h, P.leaf, 0, FABRIC);
  const nx = Math.round(len / 0.32), ny = Math.round(h / 0.3);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    if (rnd() < 0.18) continue;
    const t = -len / 2 + (i + 0.5) * (len / nx) + (rnd() - 0.5) * 0.1;
    const px = mx + (alongY ? out[0] * 0.13 : t), py = my + (alongY ? t : out[1] * 0.13);
    k.I(px, py, 0.18 + j * (h / ny), 0.12 + rnd() * 0.06, [P.pink, '#ffffff', P.blush, P.hot, P.rose, P.leaf2][Math.floor(rnd() * 6)], 0);
  }
}
/** white unit with glass shelves and little products; `front` = the side visitors stand on */
function glassShelf(k, mx, my, len, h, front, items = [P.pink, P.lilac, P.butter, P.sage, P.peach, P.cherry, '#ffffff']) {
  const alongX = front === 'n' || front === 's';
  k.R(mx, my, alongX ? len : 0.45, alongX ? 0.45 : len, h, P.white, 0, GLOSS, 0.04);
  const rows = Math.max(2, Math.round(h / 0.45)), n = Math.max(3, Math.round(len / 0.3));
  const off = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[front];
  for (let r = 0; r < rows; r++) {
    const y = 0.35 + r * ((h - 0.45) / rows);
    k.B(mx + off[0] * 0.3, my + off[1] * 0.3, alongX ? len - 0.1 : 0.22, alongX ? 0.22 : len - 0.1, 0.02, '#ffffff', y, GLASS);
    for (let i = 0; i < n; i++) {
      const t = -len / 2 + (i + 0.5) * (len / n);
      const px = alongX ? mx + t : mx + off[0] * 0.3, py = alongX ? my + off[1] * 0.3 : my + t;
      if (i % 3 === 0) k.C(px, py, 0.05, 0.18, items[(i + r) % items.length], y + 0.02, GLOSS, 0.04, 8);
      else k.B(px, py, 0.13, 0.13, 0.12 + ((i + r) % 3) * 0.05, items[(i * 3 + r) % items.length], y + 0.02, GLOSS);
    }
  }
}
function pendant(k, mx, my, drop = 2.6) {
  k.C(mx, my, 0.006, 1.0, P.gold, drop + 0.25, GOLD);
  k.S(mx, my, drop + 0.15, 0.16, '#fff3d6', glow('#ffd9a0', 1.1));
  k.C(mx, my, 0.2, 0.12, P.gold, drop + 0.2, GOLD, 0.06);
}
/** a pop-up kiosk: round white counter with products, gold poles and a striped canopy; a host and two browsers */
function popUp(k, mx, my, stripe) {
  k.C(mx, my, 0.95, 1.0, '#ffffff', 0, GLOSS, 0.95, 32); k.T(mx, my, 1.0, 0.95, 0.03, P.gold, GOLD).rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.R(mx + Math.cos(a) * 0.62, my + Math.sin(a) * 0.62, 0.22, 0.22, 0.16 + (i % 3) * 0.06, [P.pink, P.lilac, P.butter, '#ffffff', P.sage][i % 5], 1.0, GLOSS, 0.03); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.C(mx + Math.cos(a) * 0.9, my + Math.sin(a) * 0.9, 0.025, 1.4, P.gold, 1.0, GOLD); }
  for (let i = 0; i < 12; i++) { // canopy: twelve wedges, alternating colour
    const wedge = new THREE.Mesh(new THREE.ConeGeometry(k.M(1.35), k.M(0.65), 3, 1, false, (i / 12) * Math.PI * 2, Math.PI / 6), mat(i % 2 ? '#ffffff' : stripe, GLOSS));
    wedge.position.set(k.X(mx), k.M(2.72), k.Z(my)); k.group.add(wedge);
  }
  k.S(mx, my, 3.1, 0.1, P.gold, GOLD);
  k.spot('stand', mx, my - 0.5, 0); k.spot('browse', mx - 1.35, my + 0.4, face(mx - 1.35, my + 0.4, mx, my)); k.spot('browse', mx + 1.3, my + 0.6, face(mx + 1.3, my + 0.6, mx, my));
}
/** a string of little flags hung between two points (metres), sagging in the middle */
function bunting(k, ax, ay, bx, by, y, colours, sag = 0.35) {
  const n = Math.max(4, Math.round(Math.hypot(bx - ax, by - ay) / 0.5));
  const at = (t) => new THREE.Vector3(k.X(ax + (bx - ax) * t), k.M(y - Math.sin(t * Math.PI) * sag), k.Z(ay + (by - ay) * t));
  const yaw = Math.atan2(k.X(bx) - k.X(ax), k.Z(by) - k.Z(ay));
  const rope = mat(P.gold, GOLD), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const a = at(i / n), dir = at((i + 1) / n).sub(a);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(k.M(0.012), k.M(0.012), dir.length(), 4), rope);
    seg.position.copy(a).addScaledVector(dir, 0.5); seg.quaternion.setFromUnitVectors(up, dir.normalize()); k.group.add(seg);
    const mid = at((i + 0.5) / n);
    const flag = new THREE.Mesh(new THREE.CircleGeometry(k.M(0.17), 3), mat(colours[i % colours.length], { side: THREE.DoubleSide, roughness: 0.8 }));
    flag.rotation.set(0, yaw + Math.PI / 2, -Math.PI / 2); // point down, hanging across the string
    flag.position.set(mid.x, mid.y - k.M(0.14), mid.z); k.group.add(flag);
  }
}
/** a finished entrance over a doorway in a wall along x (metres): two pillars, a beam with gold trim, a flower garland */
function portal(k, x1, x2, my, colour) {
  [x1, x2].forEach((mx) => { k.R(mx, my, 0.5, 0.5, 3.1, colour, 0, GLOSS, 0.05); k.B(mx, my, 0.56, 0.56, 0.06, P.gold, 3.1, GOLD); });
  k.R((x1 + x2) / 2, my, x2 - x1 + 0.5, 0.36, 0.42, colour, 2.72, GLOSS, 0.05);
  k.B((x1 + x2) / 2, my, x2 - x1 + 0.56, 0.4, 0.05, P.gold, 3.14, GOLD); k.B((x1 + x2) / 2, my, x2 - x1 + 0.56, 0.4, 0.05, P.gold, 2.68, GOLD);
  const n = Math.round((x2 - x1) / 0.3);
  for (let i = 0; i <= n; i++) k.I(x1 + (i / n) * (x2 - x1), my + (i % 2 ? 0.2 : -0.2), 3.26 + rnd() * 0.12, 0.12 + rnd() * 0.06, [P.hot, '#ffffff', P.pink, P.blush, P.leaf2][i % 5], 0);
}
/** a soft rug, lying just above the floor (a rug level with the floor would flicker against it) */
const rug = (k, mx, my, w, d, colour) => k.R(mx, my, w, d, 0.012, colour, 0.021, FABRIC, 0.04);
const roundRug = (k, mx, my, r, colour) => k.C(mx, my, r, 0.012, colour, 0.021, FABRIC, r, 40);
/** low cutaway room walls (in the zone's colour, gold cap) with a centred opening on one side */
function walls(k, x1, y1, x2, y2, open, gap = 6, h = 2.4) {
  const t = 0.25;
  const colour = LOOK[k.zone]?.wall || P.white;
  const side = (ax, ay, bx, by, isOpen) => {
    const horizontal = ay === by;
    const len = horizontal ? bx - ax : by - ay;
    const pieces = isOpen ? [[0, (len - gap) / 2], [(len + gap) / 2, len]] : [[0, len]];
    pieces.forEach(([s, e]) => {
      if (e - s <= 0.05) return;
      const mid = (s + e) / 2;
      if (horizontal) { k.B(ax + mid, ay, e - s, t, h, colour, 0, GLOSS); k.B(ax + mid, ay, e - s, t + 0.04, 0.05, P.gold, h, GOLD); }
      else { k.B(ax, ay + mid, t, e - s, h, colour, 0, GLOSS); k.B(ax, ay + mid, t + 0.04, e - s, 0.05, P.gold, h, GOLD); }
    });
  };
  side(x1, y1, x2, y1, open === 'n'); side(x1, y2, x2, y2, open === 's');
  side(x1, y1, x1, y2, open === 'w'); side(x2, y1, x2, y2, open === 'e');
}

/* ---------- Each world, after the concept renders and the client's descriptions ---------- */
function furnish(zone, k) {
  switch (zone.id) {
    case 'passage': { // 01 · sculptural arches, playful lighting, mirrors, interactive art, photo spots
      [[0.6, 16.1], [28.5, 44.6]].forEach(([y1, y2], half) => { // entrance (north) and exit (south) passages
        const n = 5, step = (y2 - y1 - 2.4) / (n - 1);
        for (let i = 0; i < n; i++) {
          const my = y1 + 1.2 + i * step;
          const arch = new THREE.Mesh(archGeometry(k.M(4.2), k.M(3.9), k.M(0.42), k.M(0.5)), mat([P.pink, P.blush, P.rose][(i + half) % 3], GLOSS));
          arch.position.set(k.X(2.8), 0, k.Z(my)); k.group.add(arch);
          const trim = new THREE.Mesh(archGeometry(k.M(3.42), k.M(3.5), k.M(0.07), k.M(0.54)), mat(P.gold, GOLD));
          trim.position.set(k.X(2.8), 0, k.Z(my)); k.group.add(trim);
          for (let f = 0; f <= 10; f++) { // a garland over each arch
            const a = Math.PI * (f / 10);
            k.I(2.8 + Math.cos(a) * 2.05, my, 1.8 + Math.sin(a) * 2.05, 0.13 + (f % 3) * 0.03, [P.hot, '#ffffff', P.pink, P.blush, P.leaf2][f % 5], 0);
          }
          if (i < n - 1) {
            const mm = my + step / 2;
            k.R(0.85, mm, 0.08, 1.4, 2.4, '#e9f0f7', 0.15, MIRROR, 0.03); k.B(0.82, mm, 0.06, 1.5, 0.05, P.gold, 2.6, GOLD); // mirrors
            const art = [P.pink, P.lilac, P.butter, P.sage][(i + half) % 4];                                              // light art
            k.R(4.8, mm, 0.1, 1.3, 2.2, art, 0.2, glow(art, 0.6), 0.05);
            [0.6, 1.1, 1.6].forEach((y, j) => k.S(4.72, mm - 0.35 + j * 0.35, y, 0.09, '#ffffff', glow('#ffffff', 1)));
          }
        }
        k.B(1.0, (y1 + y2) / 2, 0.06, y2 - y1 - 0.4, 0.02, P.hot, 0.01, glow(P.hot, 1)); // floor light lines
        k.B(4.6, (y1 + y2) / 2, 0.06, y2 - y1 - 0.4, 0.02, P.hot, 0.01, glow(P.hot, 1));
        k.spot('photo', 1.8, (y1 + y2) / 2 + 0.6, face(1.8, 0, 3.6, 0)); k.spot('browse', 3.8, (y1 + y2) / 2 - 0.6, face(3.8, 0, 4.8, 0));
      });
      k.B(5.1, 8.35, 0.25, 15.5, 2.4, LOOK.passage.wall, 0, GLOSS); k.B(5.1, 36.55, 0.25, 16.1, 2.4, LOOK.passage.wall, 0, GLOSS); // passage walls toward the worlds
      [8.35, 36.55].forEach((my, i) => k.B(5.1, my, 0.29, i ? 16.1 : 15.5, 0.05, P.gold, 2.4, GOLD));
      // the lobby between the passages: a flower wall, a neon ring and a velvet sofa: the photo spot
      flowerWall(k, 0.75, 22.3, 9.5, 2.8, 'e');
      const ring = k.T(1.4, 22.3, 1.75, 1.25, 0.08, P.hot, glow(P.hot, 1.2)); ring.rotation.y = Math.PI / 2;
      sofa(k, 3.6, 22.3, face(3.6, 22.3, 0, 22.3), 2.0, P.velvet);
      k.spot('photo', 1.6, 21.6, face(1.6, 21.6, 4.5, 21.6)); k.spot('photo', 1.6, 23.0, face(1.6, 23, 4.5, 23)); k.spot('browse', 4.6, 19.6, face(4.6, 19.6, 1.6, 22));
      break;
    }
    case 'hub': { // 02 · PinkOut Café (coffee + matcha), comfortable seating, open space for pop-ups and activities
      // activation zone: round marble stage, cherry-blossom tree, curved display panels, podiums
      k.C(15.5, 21.3, 3.3, 0.12, '#ffffff', 0, marble('#fff7f8', '#e3c7cf'), 3.3, 48); k.T(15.5, 21.3, 0.12, 3.3, 0.04, P.gold, GOLD).rotation.x = Math.PI / 2;
      // what stands on it (tree, panels, podiums) is its own group: a themed day swaps it for its own centrepiece (themes3d.js)
      const before = k.group.children.length;
      k.C(15.5, 21.3, 0.95, 0.5, '#ffffff', 0.12, marble(), 0.95, 32); k.T(15.5, 21.3, 0.62, 0.95, 0.03, P.gold, GOLD).rotation.x = Math.PI / 2;
      k.C(15.5, 21.3, 0.18, 2.2, '#8a5a44', 0.6, {}, 0.12);
      [[0, 0, 3.3, 1.0], [0.9, 0.4, 3.0, 0.8], [-0.8, 0.5, 3.05, 0.8], [0.4, -0.9, 2.9, 0.75], [-0.5, -0.8, 3.0, 0.75], [0.8, -0.4, 3.6, 0.65], [-0.8, -0.1, 3.6, 0.65], [0, 0.6, 3.9, 0.65], [0.1, -0.3, 4.1, 0.6]].forEach(([dx, dy, y, r], i) => {
        k.I(15.5 + dx, 21.3 + dy, y, r, ['#ffb3d1', '#ff9cc4', '#ffc9de', '#ffd6e6'][i % 4], 2);
      });
      for (let i = 0; i < 4; i++) { // curved display panels
        const a0 = i * (Math.PI / 2) + 0.35;
        const panel = new THREE.Mesh(new THREE.CylinderGeometry(k.M(2.75), k.M(2.75), k.M(2.1), 24, 1, true, a0, Math.PI / 3.2), mat(P.blush, { side: THREE.DoubleSide, ...GLOSS }));
        panel.position.set(k.X(15.5), k.M(1.17), k.Z(21.3)); k.group.add(panel);
        const mid = a0 + Math.PI / 6.4;
        k.T(15.5 + Math.sin(mid) * 2.75, 21.3 + Math.cos(mid) * 2.75, 2.24, 0.25, 0.03, P.gold, GOLD).rotation.x = Math.PI / 2;
        k.spot('browse', 15.5 + Math.sin(mid) * 2.0, 21.3 + Math.cos(mid) * 2.0, mid);
      }
      [[13.4, 23.4], [17.6, 19.2]].forEach(([mx, my]) => { k.C(mx, my, 0.32, 0.9, '#ffffff', 0.12, marble()); k.R(mx, my, 0.3, 0.3, 0.3, P.hot, 1.02, GLOSS, 0.04); });
      { const act = new THREE.Group(); act.userData.activation = true; k.group.children.slice(before).forEach((o) => { o.userData.keep = true; act.add(o); }); k.group.add(act); }
      // PinkOut Café: an oval marble island; coffee on the west side, matcha on the east side
      const oval = (m) => { m.scale.z = 0.62; return m; };
      oval(k.C(29.9, 20.6, 2.4, 0.98, P.white, 0, GLOSS, 2.4, 48)); oval(k.C(29.9, 20.6, 2.42, 0.05, P.gold, 0.86, GOLD, 2.42, 48));
      oval(k.C(29.9, 20.6, 2.5, 0.07, '#ffffff', 0.98, marble(), 2.5, 48)); oval(k.C(29.9, 20.6, 1.0, 2.4, P.blush, 0, GLOSS, 1.0, 32));
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; k.C(29.9 + Math.cos(a) * 1.05, 20.6 + Math.sin(a) * 0.68, 0.06, 0.14, ['#ffffff', P.pink, P.sage][i % 3], 1.4 + (i % 2) * 0.45, GLOSS); }
      flowers(k, 29.9, 20.6, 2.5, 22, 0.8);
      k.R(27.8, 20.6, 0.55, 0.45, 0.5, '#4a4048', 1.05, { metalness: 0.6, roughness: 0.3 }, 0.04); k.C(27.8, 20.6, 0.1, 0.18, P.gold, 1.55, GOLD); // espresso machine
      k.R(32.0, 20.6, 0.5, 0.45, 0.45, P.sage, 1.05, GLOSS, 0.04); [0, 1, 2].forEach((i) => k.C(31.0 + i * 0.32, 21.3, 0.1, 0.07, '#8fc79a', 1.05, {}, 0.12)); // matcha bar
      for (let i = 0; i < 6; i++) pendant(k, 27.6 + i * 0.92, 20.6 + (i % 2 ? 0.5 : -0.5), 2.7);
      [[27.6, 18.9], [29.0, 18.6], [30.5, 18.6], [31.9, 18.9]].forEach(([mx, my], i) => { k.C(mx, my, 0.04, 0.72, P.gold, 0, GOLD); k.R(mx, my, 0.42, 0.42, 0.08, P.velvet, 0.72, FABRIC, 0.06); if (i % 2 === 0) k.spot('sit', mx, my, 0, 0.78); });
      k.spot('stand', 28.3, 20.6, face(28.3, 20.6, 25, 20.6)); k.spot('stand', 31.5, 20.6, face(31.5, 20.6, 35, 20.6)); // baristas
      [[26.4, 20.5], [25.5, 20.4], [24.6, 20.3]].forEach(([mx, my]) => k.spot('queue', mx, my, face(mx, my, 28, 20.6))); // the coffee queue
      [[33.6, 21.0], [34.4, 21.1]].forEach(([mx, my]) => k.spot('queue', mx, my, face(mx, my, 32, 20.6)));             // the matcha queue
      // café tables: marble tops, gold bases, soft chairs (some taken)
      [[24.6, 15.4], [24.6, 25.2], [35.2, 15.8], [34.6, 25.6], [28.4, 26.6], [21.0, 14.8]].forEach(([mx, my], t) => {
        roundTable(k, mx, my);
        [0, 1, 2].forEach((c) => { const a = c * 2.09 + t; const cx = mx + Math.sin(a) * 0.85, cy = my + Math.cos(a) * 0.85; chair(k, cx, cy, face(cx, cy, mx, my), [P.cream, P.blush, P.sage][c], c !== 2); });
      });
      rug(k, 26.6, 25.0, 3.6, 3.6, '#f8e6c6'); rug(k, 34.6, 25.4, 3.4, 3.4, '#f8e6c6');
      // comfortable seating: two lounges
      sofa(k, 8.6, 14.2, face(8.6, 14.2, 8.6, 18), 2.6, P.cream, 2); armchair(k, 6.6, 16.0, face(6.6, 16, 9, 16.2), P.blush, true); roundTable(k, 8.6, 15.9, 0.5, 0.42);
      sofa(k, 8.6, 28.6, face(8.6, 28.6, 8.6, 25), 2.6, P.cream, 2); armchair(k, 6.6, 26.9, face(6.6, 26.9, 9, 26.8), P.sage, true); roundTable(k, 8.6, 27.0, 0.5, 0.42);
      [[11.5, 13.2], [11.5, 29.4], [20.6, 18.0], [20.6, 24.8], [42.6, 13.4], [42.6, 29.2], [37.2, 13.2]].forEach(([mx, my]) => plant(k, mx, my, 1.05));
      // pop-ups that change with every launch, and two more café tables, so the hall is busy, not bare
      popUp(k, 21.6, 27.6, P.hot); popUp(k, 12.6, 16.6, P.lilac);
      [[39.4, 28.6], [12.0, 26.8]].forEach(([mx, my], t) => {
        roundTable(k, mx, my);
        [0, 1, 2].forEach((c) => { const a = c * 2.09 + t * 0.7; const cx = mx + Math.sin(a) * 0.85, cy = my + Math.cos(a) * 0.85; chair(k, cx, cy, face(cx, cy, mx, my), [P.blush, P.cream, P.lilac][c], c !== 1); });
      });
      break;
    }
    case 'make': { // 04 · bracelet & charm bars, phone-case decorating, embroidery, engraving, personalised candy
      walls(k, 5.6, 0.9, 29.9, 12.0, 's', 13);
      const st = [8.5, 13.1, 17.75, 22.4, 27.0];
      const tint = [P.sage, P.lilac, P.butter, P.blush, P.peach];
      st.forEach((mx, i) => {
        glassShelf(k, mx, 1.45, 3.4, 2.2, 's', [tint[i], '#ffffff', P.pink, P.gold]);           // display wall
        k.R(mx, 1.25, 1.6, 0.06, 0.45, tint[i], 2.45, glow(tint[i], 0.35), 0.03);              // station sign
        k.R(mx, 6.0, 3.0, 1.1, 0.74, '#ffffff', 0, marble(), 0.04); k.B(mx, 6.0, 3.02, 1.12, 0.04, P.gold, 0.66, GOLD);
        pendant(k, mx - 0.8, 6.0, 2.6); pendant(k, mx + 0.8, 6.0, 2.6);
        [-0.9, 0, 0.9].forEach((d, c) => chair(k, mx + d, 7.0, Math.PI, tint[i], c !== 1 || i % 2 === 0));
        k.spot('stand', mx, 4.9, 0); // the host on the far side, facing the makers
      });
      for (let j = 0; j < 6; j++) k.R(st[0] - 1.1 + j * 0.44, 5.9, 0.3, 0.26, 0.05, [P.hot, P.butter, P.lilac, P.leaf2, '#ffffff', P.peach][j], 0.74, GLOSS, 0.02);
      for (let j = 0; j < 4; j++) k.R(st[1] - 0.9 + j * 0.6, 5.9, 0.18, 0.36, 0.03, [P.pink, P.lilac, '#ffffff', P.hot][j], 0.74, GLOSS, 0.02);
      k.R(st[2], 5.8, 0.9, 0.6, 0.45, '#5b5560', 0.74, { metalness: 0.5, roughness: 0.35 }, 0.05); k.B(st[2], 6.12, 0.6, 0.02, 0.16, '#ff3d3d', 0.95, glow('#ff3d3d', 1.2));
      k.R(st[3] - 0.4, 5.8, 0.65, 0.38, 0.38, '#ffffff', 0.74, GLOSS, 0.06); k.R(st[3] - 0.6, 5.8, 0.18, 0.38, 0.22, '#ffffff', 1.12, GLOSS, 0.04);
      for (let j = 0; j < 4; j++) { const roll = k.C(st[3] + 0.4 + j * 0.25, 5.9, 0.09, 0.4, [P.pink, P.lilac, P.sage, P.butter][j], 0.83, FABRIC); roll.rotation.x = Math.PI / 2; }
      [-0.5, 0, 0.5].forEach((d, i) => { k.C(st[4] + d, 5.9, 0.012, 0.3, '#ffffff', 0.74); k.I(st[4] + d, 5.9, 1.2, 0.17, ['#ffb3d1', '#cfe6ff', '#fff0aa'][i], 2); });
      plant(k, 6.4, 11.2, 0.95); plant(k, 29.1, 11.2, 0.95);
      bunting(k, 6.0, 3.0, 17.75, 9.6, 3.3, [P.sage, '#ffffff', P.lilac, P.butter, P.pink]); bunting(k, 17.75, 9.6, 29.5, 3.0, 3.3, [P.pink, P.butter, '#ffffff', P.sage, P.lilac]);
      // finishing: a proper entrance, a rug under each station, supply racks between the display walls,
      // jars of beads and trays on every table, a table of finished pieces either side of the door, hoops on the walls
      portal(k, 11.25, 24.25, 12.0, LOOK.make.wall);
      st.forEach((mx, i) => rug(k, mx, 6.5, 3.9, 2.9, ['#d8f3e6', '#ebe2ff', '#fff4c4', '#ffe0ea', '#ffe6d6'][i]));
      [10.8, 15.4, 20.1, 24.7, 29.25].forEach((mx, i) => {
        k.R(mx, 1.2, 0.85, 0.06, 2.1, '#f6ebdd', 0.25, FABRIC, 0.02);                                    // pegboard
        [0.75, 1.3, 1.85].forEach((y, r) => {
          k.B(mx, 1.32, 0.8, 0.18, 0.03, P.gold, y, GOLD);                                                 // little shelf
          [-0.25, 0, 0.25].forEach((d, j) => k.C(mx + d, 1.32, 0.07, 0.14, [P.hot, P.sage, P.lilac, P.butter, P.peach, '#ffffff'][(i + r + j) % 6], y + 0.03, FABRIC, 0.07, 12)); // spools
        });
      });
      st.forEach((mx, i) => {
        [-1.15, 1.15].forEach((d, j) => { k.C(mx + d, 5.75, 0.1, 0.22, '#ffffff', 0.74, GLASS, 0.1, 14); k.C(mx + d, 5.75, 0.085, 0.13, [P.hot, P.lilac, P.butter, P.sage, P.peach][(i + j) % 5], 0.75, GLOSS, 0.085, 14); });
        k.R(mx, 6.25, 0.7, 0.32, 0.03, [P.blush, P.butter, P.lilac, P.sage, P.peach][i], 0.74, GLOSS, 0.02);  // tray
      });
      [[8.6, 10.6], [26.9, 10.6]].forEach(([mx, my], i) => {
        k.R(mx, my, 3.0, 0.8, 0.88, '#ffffff', 0, GLOSS, 0.05); k.B(mx, my, 3.02, 0.82, 0.04, P.gold, 0.8, GOLD); k.R(mx, my, 3.06, 0.86, 0.05, '#ffffff', 0.88, marble(), 0.02);
        for (let j = 0; j < 6; j++) {
          const x = mx - 1.15 + j * 0.46;
          if (j % 3 === 0) k.T(x, my, 1.0, 0.09, 0.02, [P.gold, P.hot, P.lilac][j % 3], GOLD);                   // bracelets
          else if (j % 3 === 1) { const c = k.R(x, my, 0.14, 0.05, 0.26, [P.pink, P.sage, P.butter, P.lilac][(i + j) % 4], 0.93, GLOSS, 0.03); c.rotation.x = -0.25; } // phone cases
          else { k.C(x, my, 0.08, 0.18, '#ffffff', 0.93, GLASS, 0.08, 12); k.S(x, my, 1.04, 0.06, [P.hot, P.butter, P.sage][(i + j) % 3]); } // candy jar
        }
        flowers(k, mx + 1.25, my, 1.0, 5, 0.12);
        k.spot('browse', mx - 0.6, my - 0.85, 0); k.spot('browse', mx + 0.7, my - 0.8, 0);
      });
      [[5.95, 4.0, 1], [5.95, 8.4, 1], [29.55, 4.0, -1], [29.55, 8.4, -1]].forEach(([mx, my, dir], i) => {           // embroidery hoops
        const disc = new THREE.Mesh(new THREE.CircleGeometry(k.M(0.34), 32), mat(['#ffffff', P.blush, P.butter, P.lilac][i], FABRIC));
        disc.rotation.y = dir * Math.PI / 2; disc.position.set(k.X(mx + dir * 0.02), k.M(1.6), k.Z(my)); k.group.add(disc);
        k.T(mx + dir * 0.03, my, 1.6, 0.35, 0.025, P.gold, GOLD).rotation.y = Math.PI / 2;
        flowers(k, mx + dir * 0.05, my, 1.5, 5, 0.14);
      });
      break;
    }
    case 'market': { // 05 · fashion, accessories, jewellery, flowers, gifts, desserts, ice cream, seasonal pop-ups
      walls(k, 30.3, 0.9, 49.4, 12.0, 's', 11);
      [[32.7, P.blush, 'sweets'], [37.2, P.lilac, 'bears'], [41.7, P.butter, 'accessories'], [46.6, P.peach, 'fashion']].forEach(([mx, c, kind]) => {
        const bay = new THREE.Mesh(archGeometry(k.M(3.9), k.M(3.2), k.M(0.25), k.M(0.5)), mat(c, GLOSS)); bay.position.set(k.X(mx), 0, k.Z(1.5)); k.group.add(bay);
        const tr = new THREE.Mesh(archGeometry(k.M(3.5), k.M(3.0), k.M(0.05), k.M(0.54)), mat(P.gold, GOLD)); tr.position.set(k.X(mx), 0, k.Z(1.5)); k.group.add(tr);
        if (kind === 'fashion') {
          const rail = k.C(mx, 1.6, 0.025, 2.6, P.gold, 1.65, GOLD); rail.rotation.z = Math.PI / 2;
          for (let i = 0; i < 7; i++) k.R(mx - 1.05 + i * 0.35, 1.6, 0.1, 0.5, 0.95, [P.pink, '#ffffff', P.lilac, P.cherry, P.butter, P.sage, P.blush][i], 0.65, FABRIC, 0.03);
        } else glassShelf(k, mx, 1.4, 3.0, 2.3, 's', kind === 'sweets' ? [P.pink, P.butter, P.sage, P.lilac, '#8a5a44'] : kind === 'bears' ? ['#c99a6e', '#f3d2b3', P.pink] : [P.cherry, P.gold, '#ffffff', P.lilac]);
        flowers(k, mx, 1.5, 3.25, 9, 1.5);
        k.spot('browse', mx - 0.6, 3.4, Math.PI); k.spot('browse', mx + 0.7, 3.6, Math.PI);
      });
      // flowers: a cart of buckets on the west side
      k.R(31.6, 7.8, 1.0, 2.6, 0.75, P.white, 0, GLOSS, 0.06);
      for (let i = 0; i < 6; i++) { const my = 6.8 + (i % 3) * 0.95, mx = 31.35 + Math.floor(i / 3) * 0.5; k.C(mx, my, 0.17, 0.32, '#c9ccd1', 0.75, MIRROR, 0.2); flowers(k, mx, my, 1.25, 7, 0.22, [[P.hot, P.pink], ['#ffffff', P.blush], [P.cherry, P.rose]][i % 3]); }
      k.spot('browse', 32.8, 8.6, face(32.8, 8.6, 31.6, 8));
      // gifts: a tiered round display in the middle
      k.C(39.9, 7.6, 1.3, 0.55, '#ffffff', 0, marble(), 1.3, 40); k.C(39.9, 7.6, 0.85, 0.45, '#ffffff', 0.55, marble(), 0.85, 40); k.C(39.9, 7.6, 0.4, 0.4, P.blush, 1.0, GLOSS, 0.4, 32);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const r = i % 2 ? 1.05 : 0.65; k.R(39.9 + Math.cos(a) * r, 7.6 + Math.sin(a) * r, 0.24, 0.24, 0.2, [P.pink, '#ffffff', P.lilac, P.butter][i % 4], i % 2 ? 0.55 : 1.0, GLOSS, 0.03); }
      k.spot('browse', 39.9, 9.4, Math.PI); k.spot('browse', 41.7, 8.4, face(41.7, 8.4, 39.9, 7.6));
      // desserts & ice cream: a striped cart
      k.R(35.4, 9.6, 1.8, 0.8, 0.95, '#ffffff', 0, GLOSS, 0.08); k.B(35.4, 10.02, 1.8, 0.02, 0.4, P.pink, 0.3);
      [-0.8, 0.8].forEach((d) => k.C(35.4 + d, 9.6, 0.025, 1.3, P.gold, 0.95, GOLD));
      for (let i = 0; i < 6; i++) { const s = k.B(35.4 - 0.85 + i * 0.34, 9.6, 0.34, 1.0, 0.05, i % 2 ? '#ffffff' : P.hot, 2.25); s.rotation.x = 0.2; }
      [-0.5, 0, 0.5].forEach((d, i) => { const cone = new THREE.Mesh(new THREE.ConeGeometry(k.M(0.08), k.M(0.25), 12), mat('#e8c08a')); cone.rotation.x = Math.PI; cone.position.set(k.X(35.4 + d), k.M(1.08), k.Z(9.4)); k.group.add(cone); k.S(35.4 + d, 9.4, 1.24, 0.11, [P.pink, P.sage, P.butter][i]); });
      k.spot('stand', 35.4, 9.0, 0); k.spot('queue', 35.2, 10.7, Math.PI);
      // jewellery: a glass-topped case
      k.R(44.4, 8.4, 2.0, 0.8, 0.9, '#ffffff', 0, GLOSS, 0.05); k.B(44.4, 8.4, 1.9, 0.7, 0.28, '#ffffff', 0.9, GLASS);
      [-0.6, -0.2, 0.2, 0.6].forEach((d) => { k.T(44.4 + d, 8.4, 0.98, 0.08, 0.018, P.gold, GOLD).rotation.x = Math.PI / 2; });
      k.spot('browse', 44.4, 9.4, Math.PI);
      // seasonal pop-up: a little kiosk with a pointed pink roof
      k.C(47.6, 9.4, 0.85, 1.0, '#ffffff', 0, GLOSS, 0.85, 6);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(k.M(1.05), k.M(0.7), 6), mat(P.hot, GLOSS)); roof.position.set(k.X(47.6), k.M(2.6), k.Z(9.4)); k.group.add(roof);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.52; k.C(47.6 + Math.cos(a) * 0.78, 9.4 + Math.sin(a) * 0.78, 0.025, 1.25, P.gold, 1.0, GOLD); }
      k.spot('browse', 46.6, 10.6, face(46.6, 10.6, 47.6, 9.4));
      plant(k, 30.9, 11.3, 0.95); plant(k, 48.8, 11.3, 0.95);
      bunting(k, 30.8, 3.2, 39.85, 9.8, 3.4, [P.peach, '#ffffff', P.hot, P.butter, P.pink]); bunting(k, 39.85, 9.8, 49.0, 3.2, 3.4, [P.hot, P.butter, '#ffffff', P.peach, P.lilac]);
      break;
    }
    case 'live': { // 07 · live stage, flexible audience seating, performances, DJ sets, creator talks, live podcasts, launches
      k.R(46.6, 21.5, 5.4, 15.6, 1.0, P.velvet, 0, FABRIC, 0.05);
      k.B(43.92, 21.5, 0.06, 15.4, 0.05, P.gold, 0.96, GOLD); k.B(43.88, 21.5, 0.04, 15.0, 0.04, P.hot, 0.5, glow(P.hot, 1.2));
      [17.0, 26.0].forEach((my) => { k.R(43.4, my, 0.7, 2.2, 0.5, '#ffffff', 0, marble(), 0.03); k.R(43.05, my, 0.4, 2.2, 0.25, '#ffffff', 0, marble(), 0.03); });
      k.B(49.15, 21.5, 0.3, 16.6, 5.4, P.blush, 1.0, GLOSS);
      k.B(48.97, 21.5, 0.04, 7.4, 4.0, P.gold, 1.4, GOLD);
      const screen = k.B(48.94, 21.5, 0.08, 7.0, 3.6, P.hot, 1.6, glow(P.hot, 0.6));
      screen.userData.screen = true; screen.userData.keep = true;
      [15.6, 27.4].forEach((my) => {
        const a = new THREE.Mesh(archGeometry(k.M(2.6), k.M(4.2), k.M(0.3), k.M(0.3)), mat('#ffffff', GLOSS)); a.rotation.y = Math.PI / 2; a.position.set(k.X(48.9), k.M(1.0), k.Z(my)); k.group.add(a);
        const h = new THREE.Mesh(heartGeometry(k.M(0.9), k.M(0.06)), mat(P.hot, glow(P.hot, 1.4))); h.rotation.y = -Math.PI / 2; h.position.set(k.X(48.8), k.M(3.2), k.Z(my)); k.group.add(h);
      });
      [[44.3, 13.9], [44.3, 29.1], [48.7, 13.9], [48.7, 29.1]].forEach(([mx, my]) => k.B(mx, my, 0.22, 0.22, 6.0, '#3a2230', 1.0, { metalness: 0.4, roughness: 0.5 }));
      k.B(44.3, 21.5, 0.25, 15.4, 0.25, '#3a2230', 6.8, { metalness: 0.4 }); k.B(48.7, 21.5, 0.25, 15.4, 0.25, '#3a2230', 6.8, { metalness: 0.4 });
      for (let i = 0; i < 7; i++) { const my = 15.0 + i * 2.15; k.R(44.3, my, 0.3, 0.3, 0.35, '#2b1220', 6.4, {}, 0.05); k.S(44.3, my, 6.42, 0.11, '#fff6d6', glow('#ffe7a8', 1.2)); }
      [14.6, 28.4].forEach((my) => { k.R(44.7, my, 0.9, 0.9, 1.8, '#2b1220', 1.0, {}, 0.06); k.C(44.24, my, 0.24, 0.03, '#5b5560', 2.3).rotation.z = Math.PI / 2; });
      // creator-talk set on stage: three armchairs, a little table, flowers
      [19.6, 21.5, 23.4].forEach((my, i) => { const yaw = face(46.6, my, 40, my); armchair(k, 46.6, my, yaw, [P.cream, P.blush, P.cream][i], false, 1.0); k.spot('perform', 46.6, my, yaw, 1.42); });
      roundTable(k, 45.6, 20.55, 0.3, 1.45); flowers(k, 45.6, 20.55, 1.55, 8, 0.2);
      [[44.6, 15.4], [44.6, 27.6]].forEach(([mx, my]) => flowers(k, mx, my, 1.15, 14, 0.45));
      // audience: soft armchairs facing the stage, little side tables
      for (let c = 0; c < 3; c++) for (let r = 0; r < 6; r++) {
        const mx = 41.2 - c * 1.6, my = 17.1 + r * 1.95, yaw = face(mx, my, 47, my);
        armchair(k, mx, my, yaw, [P.cream, P.blush, P.lilac][(c + r) % 3]);
        if ((c * 6 + r) % 5 !== 3) k.spot('watch', mx, my, yaw, 0.42);
        if (r % 2 === 0) k.C(mx - 0.25, my + 0.98, 0.18, 0.5, P.gold, 0, GOLD, 0.2);
      }
      break;
    }
    case 'beauty': { // 03 · makeup testing counters, personalised foundation, fragrance creation, nail-colour stations, brand displays
      walls(k, 24.6, 30.7, 49.6, 44.6, 'n', 9);
      // brand displays: shelving along the west and south walls, round podiums
      glassShelf(k, 25.1, 36.5, 7.0, 2.4, 'e'); glassShelf(k, 28.0, 44.1, 4.0, 2.2, 'n');
      [[27.4, 35.4], [27.9, 39.4]].forEach(([mx, my]) => { k.C(mx, my, 0.5, 0.95, '#ffffff', 0, marble(), 0.5, 32); [-0.2, 0, 0.2].forEach((d, i) => k.C(mx + d, my, 0.06, 0.24, [P.cherry, P.pink, P.gold][i], 0.95, GLOSS, 0.05, 12)); k.spot('browse', mx + 0.75, my, face(mx + 0.75, my, mx, my)); });
      // personalised foundation: marble counter with tablets, shade swatches, stools
      counter(k, 32.3, 37.4, 3.2, 1.0);
      [-0.8, 0.8].forEach((d) => { const tab = k.R(32.3 + d, 37.3, 0.5, 0.05, 0.36, '#2b1220', 1.1, glow('#ffd6e6', 0.6), 0.02); tab.rotation.x = -0.35; k.C(32.3 + d, 38.55, 0.04, 0.72, P.gold, 0, GOLD); k.R(32.3 + d, 38.55, 0.42, 0.42, 0.08, P.velvet, 0.72, FABRIC, 0.06); k.spot('sit', 32.3 + d, 38.55, Math.PI, 0.78); });
      for (let i = 0; i < 9; i++) k.R(30.6 + i * 0.42, 37.0, 0.3, 0.06, 0.12, `#${new THREE.Color('#f6d7c3').lerp(new THREE.Color('#6b4430'), i / 8).getHexString()}`, 1.0, {}, 0.02);
      k.spot('stand', 32.3, 36.4, 0);
      // makeup testing + nail colour: a vanity of arched mirrors with ring lights, nail tables
      counter(k, 37.1, 43.8, 5.0, 0.7, 0.85);
      [-1.7, -0.55, 0.55, 1.7].forEach((d, i) => {
        const m = new THREE.Mesh(archGeometry(k.M(0.9), k.M(1.3), k.M(0.45), k.M(0.04)), mat('#e9f0f7', MIRROR)); m.position.set(k.X(37.1 + d), k.M(0.95), k.Z(44.2)); k.group.add(m);
        k.T(37.1 + d, 44.15, 1.55, 0.5, 0.035, '#ffffff', glow('#ffffff', 1.2));
        chair(k, 37.1 + d, 42.75, 0, P.blush, true);
        if (i % 2 === 0) k.spot('stand', 37.1 + d + 0.55, 42.9, face(37.1 + d + 0.55, 42.9, 37.1 + d, 42.75));
      });
      [[35.9, 38.0], [38.3, 38.0]].forEach(([mx, my]) => {
        roundTable(k, mx, my, 0.4); chair(k, mx, my + 0.75, Math.PI, P.lilac, true); chair(k, mx, my - 0.75, 0, P.cream, true);
        [-0.15, 0, 0.15].forEach((d, i) => k.C(mx + d, my, 0.03, 0.08, [P.cherry, P.pink, P.lilac][i], 0.78, GLOSS, 0.025, 10));
      });
      // fragrance creation: a round bar of bottles, a wall of perfume
      k.C(42.1, 38.0, 1.3, 1.0, P.white, 0, GLOSS, 1.3, 40); k.T(42.1, 38.0, 0.92, 1.31, 0.03, P.gold, GOLD).rotation.x = Math.PI / 2; k.C(42.1, 38.0, 1.36, 0.06, '#ffffff', 1.0, marble(), 1.36, 40);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; k.C(42.1 + Math.cos(a) * 0.95, 38 + Math.sin(a) * 0.95, 0.07, 0.24, [P.pink, P.butter, P.lilac, '#ffffff'][i % 4], 1.06, GLASS, 0.05, 12); }
      [0.4, 2.0, 3.8].forEach((a) => { const sx = 42.1 + Math.cos(a) * 1.7, sy = 38 + Math.sin(a) * 1.7; k.spot('browse', sx, sy, face(sx, sy, 42.1, 38)); });
      glassShelf(k, 42.1, 44.15, 3.0, 2.2, 'n', [P.pink, P.butter, P.lilac, '#ffffff', P.gold]);
      // touch-up: two recliners, towels, greenery
      [45.9, 47.9].forEach((mx) => { k.R(mx, 39.6, 0.85, 1.9, 0.45, P.cream, 0, FABRIC, 0.12); const b = k.R(mx, 38.75, 0.85, 0.9, 0.14, P.cream, 0.6, FABRIC, 0.06); b.rotation.x = -0.6; k.spot('sit', mx, 39.4, Math.PI, 0.5); });
      k.R(46.9, 42.9, 1.0, 0.6, 0.6, '#ffffff', 0, marble(), 0.04);
      for (let i = 0; i < 4; i++) k.R(46.9, 42.9, 0.45, 0.35, 0.08, i % 2 ? P.blush : '#ffffff', 0.6 + i * 0.09, FABRIC, 0.03);
      plant(k, 49.0, 31.6, 1.0); plant(k, 49.0, 43.8, 1.0); plant(k, 25.3, 31.4, 1.0);
      // finishing: a proper entrance and a runway into the lab, rugs and chandeliers over every station,
      // two boutique islands of products, a touch-up mirror wall with ring lights, flowers on the counters
      portal(k, 32.6, 41.6, 30.7, LOOK.beauty.wall);
      rug(k, 37.1, 32.3, 1.8, 2.6, '#f3c9dc');
      // the centrepiece the runway leads to: a tiered podium with a giant lipstick, ringed with flowers (a photo moment)
      k.C(37.1, 34.7, 1.15, 0.3, '#ffffff', 0, marble(), 1.15, 48); k.T(37.1, 34.7, 0.3, 1.15, 0.03, P.gold, GOLD).rotation.x = Math.PI / 2;
      k.C(37.1, 34.7, 0.75, 0.3, LOOK.beauty.wall, 0.3, GLOSS, 0.75, 40); k.T(37.1, 34.7, 0.6, 0.75, 0.025, P.gold, GOLD).rotation.x = Math.PI / 2;
      k.C(37.1, 34.7, 0.32, 0.75, P.gold, 0.6, GOLD, 0.32, 32); k.C(37.1, 34.7, 0.27, 0.55, P.cherry, 1.35, GLOSS, 0.27, 32);
      { const tip = new THREE.Mesh(new THREE.CylinderGeometry(k.M(0.05), k.M(0.27), k.M(0.45), 32), mat(P.cherry, GLOSS)); tip.position.set(k.X(37.1), k.M(2.12), k.Z(34.7)); tip.rotation.z = 0.35; k.group.add(tip); }
      flowers(k, 37.1, 34.7, 0.32, 16, 1.0);
      [[35.6, 34.7], [38.6, 34.7], [37.1, 36.2]].forEach(([mx, my]) => k.spot('photo', mx, my, face(mx, my, 37.1, 34.7)));
      rug(k, 32.3, 37.9, 4.2, 2.8, '#f3c9dc'); roundRug(k, 35.9, 38.0, 1.1, '#ffd9e6'); roundRug(k, 38.3, 38.0, 1.1, '#ffd9e6'); roundRug(k, 42.1, 38.0, 2.1, '#efe6ff');
      rug(k, 37.1, 42.6, 5.6, 1.6, '#f3c9dc');
      [[31.5, 37.4], [33.1, 37.4], [35.9, 38.0], [38.3, 38.0], [41.4, 37.4], [42.8, 38.6]].forEach(([mx, my]) => pendant(k, mx, my, 2.5));
      flowers(k, 33.6, 37.4, 1.06, 6, 0.15); flowers(k, 39.3, 43.8, 0.92, 6, 0.15);
      [[29.6, 33.0], [45.4, 33.2]].forEach(([mx, my]) => {
        k.R(mx, my, 2.6, 1.1, 0.86, '#ffffff', 0, GLOSS, 0.06); k.B(mx, my, 2.62, 1.12, 0.04, P.gold, 0.78, GOLD); k.R(mx, my, 2.66, 1.16, 0.05, '#ffffff', 0.86, marble(), 0.03);
        for (let j = 0; j < 8; j++) k.C(mx - 1.05 + j * 0.3, my + (j % 2 ? 0.22 : -0.22), 0.05, 0.14 + (j % 3) * 0.05, [P.cherry, P.pink, P.lilac, P.gold, '#ffffff'][j % 5], 0.91, GLOSS, 0.04, 10);
        k.B(mx + 0.9, my, 0.6, 0.6, 0.3, '#ffffff', 0.91, GLASS); flowers(k, mx + 0.9, my, 1.0, 4, 0.12);
        k.spot('browse', mx - 0.4, my + 0.95, Math.PI); k.spot('browse', mx + 0.6, my - 0.95, 0);
      });
      k.R(49.3, 34.2, 0.06, 3.6, 1.8, '#e9f0f7', 0.45, MIRROR, 0.02); k.B(49.28, 34.2, 0.08, 3.8, 0.05, P.gold, 2.3, GOLD);
      [33.0, 34.2, 35.4].forEach((my, i) => {
        k.T(49.24, my, 1.45, 0.42, 0.03, '#ffffff', glow('#ffffff', 1.2)).rotation.y = Math.PI / 2;
        chair(k, 48.4, my, face(48.4, my, 49.3, my), [P.blush, P.lilac, P.blush][i], i !== 1);
      });
      break;
    }
    case 'move': { // 06 · dance, ballet, yoga, fitness; mirrors, ballet bars, mats, room to move
      walls(k, 5.4, 30.0, 24.2, 44.6, 'n', 8);
      k.R(14.0, 44.3, 16.5, 0.08, 2.6, '#e9f0f7', 0.05, MIRROR, 0.02); k.B(14.0, 44.24, 16.7, 0.06, 0.06, P.gold, 2.66, GOLD);
      const barre = k.C(14.0, 43.75, 0.035, 15.0, '#e8c08a', 1.0, { roughness: 0.4 }); barre.rotation.z = Math.PI / 2;
      [7.0, 11.0, 15.0, 19.0, 21.0].forEach((mx) => k.C(mx, 43.75, 0.03, 1.0, P.gold, 0, GOLD));
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
        const mx = 7.8 + c * 2.1, my = 36.2 + r * 3.0;
        k.R(mx, my, 0.75, 1.85, 0.05, [P.hot, P.lilac, P.leaf2, P.butter, P.pink, P.peach][(c + r) % 6], 0.02, FABRIC, 0.01); // mats stand out on the blue floor
        if ((c + r) % 4 !== 3) k.spot(c < 3 ? 'yoga' : 'dance', mx, my, 0); // the class faces the mirror
      }
      k.spot('lead', 12.9, 42.4, Math.PI); // the instructor, facing the class
      // fitness corner: a rack of exercise balls and weights, a bench
      k.R(23.4, 35.0, 0.6, 4.0, 1.4, '#ffffff', 0, GLOSS, 0.04);
      [33.6, 34.6, 35.6, 36.6].forEach((my, i) => k.S(23.3, my, 1.75, 0.34, [P.pink, P.lilac, P.sage, P.blush][i], GLOSS));
      for (let i = 0; i < 6; i++) { const w = k.C(22.95, 33.4 + i * 0.6, 0.07, 0.28, [P.cherry, P.pink, P.lilac][i % 3], 0.75, GLOSS); w.rotation.z = Math.PI / 2; }
      k.R(6.1, 37.5, 0.55, 4.0, 0.45, P.cream, 0, FABRIC, 0.1);
      k.spot('sit', 6.1, 36.6, face(6.1, 36.6, 10, 36.6), 0.45); k.spot('stand', 22.2, 35.8, face(22.2, 35.8, 23.4, 35.8));
      plant(k, 6.3, 31.0, 1.1); plant(k, 23.3, 31.0, 1.1); plant(k, 6.3, 43.6, 1.1);
      k.R(6.1, 43.7, 0.5, 0.5, 1.0, '#2b1220', 0, {}, 0.05);
      break;
    }
    default: break;
  }
}

/* ---------- Merge static pieces per zone, one mesh per material ---------- */
function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const buckets = new Map();
  const merged = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.keep) return;
    const m = o.material;
    const key = [m.color.getHexString(), m.roughness, m.metalness, m.emissive.getHexString(), m.emissiveIntensity, m.flatShading, m.opacity, m.side, m.map?.uuid].join('|');
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(key)) buckets.set(key, { material: m, parts: [] });
    buckets.get(key).parts.push(g);
    merged.push(o);
  });
  merged.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); });
  buckets.forEach(({ material, parts }) => {
    const count = parts.reduce((n, g) => n + g.attributes.position.count, 0);
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    let at = 0;
    parts.forEach((g) => {
      pos.set(g.attributes.position.array, at * 3); nor.set(g.attributes.normal.array, at * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, at * 2);
      at += g.attributes.position.count; g.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    group.add(new THREE.Mesh(geo, material));
  });
}

/* floor finish per world: the renders' materials (marble, painted wood planks, velvet carpet) in the world's own colour */
const FLOORS = {
  passage: () => marble(LOOK.passage.floor, LOOK.passage.vein), hub: () => marble(LOOK.hub.floor, LOOK.hub.vein),
  make: () => ({ map: woodTexture(LOOK.make.floor), roughness: 0.45 }), market: () => marble(LOOK.market.floor, LOOK.market.vein),
  live: () => ({ color: LOOK.live.floor, roughness: 0.95 }), beauty: () => marble(LOOK.beauty.floor, LOOK.beauty.vein),
  move: () => ({ map: woodTexture(LOOK.move.floor), roughness: 0.45 }),
};

/** Build the whole venue. Returns the root group, one entry per zone ({ data, group, anchor }), the activity spots and
 *  the Rose Hub activation stage's decorations (a group a themed day swaps out). */
export function buildVenue(zoneData) {
  seed = 11;
  const scene = new THREE.Group();
  const spots = [];
  const shell = new THREE.Group();
  scene.add(shell);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.31; ground.receiveShadow = true;
  scene.add(ground);
  const sk = makeKit(shell, toX, toZ, spots, 'passage');
  sk.R(25, 22.5, 51.2, 46.2, 0.75, '#f3d9e1', -0.75, GLOSS, 0.15);
  const lobby = new THREE.Mesh(new THREE.BoxGeometry(5.1 / U, 0.008, 12.4 / U), mat('#ffffff', marble('#f8d3df', '#ffffff')));
  lobby.position.set(toX(2.8), 0.004, toZ(22.3)); lobby.userData.keep = true; shell.add(lobby);
  // outer walls: the west wall is solid; the entrance door is in the north wall, the exit door in the south wall
  const wall = (mx, my, w, d) => { sk.B(mx, my, w, d, 2.6, P.white, 0, GLOSS); sk.B(mx, my, w + 0.04, d + 0.04, 0.06, P.gold, 2.6, GOLD); };
  wall(-0.25, 22.5, 0.5, 46); wall(50.25, 22.5, 0.5, 46);
  wall(27.75, -0.25, 45.5, 0.5); wall(0.05, -0.25, 1.1, 0.5);
  wall(27.75, 45.25, 45.5, 0.5); wall(0.05, 45.25, 1.1, 0.5);
  [[DOORS.entrance, -1], [DOORS.exit, 1]].forEach(([[dx, dy], dir]) => {
    const gate = new THREE.Mesh(archGeometry(4.8 / U, 4.4 / U, 0.5 / U, 0.9 / U), mat(P.pink, GLOSS)); gate.position.set(toX(dx), 0, toZ(dy)); shell.add(gate);
    const trim = new THREE.Mesh(archGeometry(4.0 / U, 4.0 / U, 0.08 / U, 0.95 / U), mat(P.gold, GOLD)); trim.position.set(toX(dx), 0, toZ(dy)); shell.add(trim);
    for (let f = 0; f <= 12; f++) { const a = Math.PI * (f / 12); sk.I(dx + Math.cos(a) * 2.4, dy, 2.0 + Math.sin(a) * 2.4, 0.18, [P.hot, '#ffffff', P.pink, P.leaf2][f % 4], 0); }
    sk.B(dx, dy + dir * 4.6, 2.4, 8, 0.03, P.cherry, 0);           // red carpet
    plant(sk, dx - 2.2, dy + dir * 1.6, 1.3); plant(sk, dx + 2.2, dy + dir * 1.6, 1.3);
  });
  mergeStatic(shell);

  const zones = zoneData.map((z) => {
    const group = new THREE.Group();
    const [lx, ly] = z.plan.label;
    group.position.set(toX(lx), 0, toZ(ly));
    const k = makeKit(group, (m) => toX(m) - group.position.x, (m) => toZ(m) - group.position.z, spots, z.id);
    z.plan.rects.forEach(([x1, y1, x2, y2]) => {
      const w = (x2 - x1) / U, d = (y2 - y1) / U;
      // A floor laid over a bigger zone's floor (the Live audience inside the Rose Hub) sits a hair above it.
      // At the same height the two fight for every pixel, and a flickering, jagged rectangle shows as the camera moves.
      const over = zoneData.some((o) => o !== z && o.plan.rects.some(([a1, b1, a2, b2]) => x1 < a2 && a1 < x2 && y1 < b2 && b1 < y2 && (a2 - a1) * (b2 - b1) > (x2 - x1) * (y2 - y1)));
      const finish = FLOORS[z.id]();
      if (finish.map) { finish.map = finish.map.clone(); finish.map.repeat.set(Math.max(1, Math.round(w / 1.4)), Math.max(1, Math.round(d / 1.4))); finish.map.needsUpdate = true; }
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, d), mat(finish.map ? '#ffffff' : '#e9b3c4', finish));
      const fy = over ? 0.016 : 0.004, cx = (toX(x1) + toX(x2)) / 2 - group.position.x, cz = (toZ(y1) + toZ(y2)) / 2 - group.position.z;
      floor.position.set(cx, fy, cz);
      floor.userData.keep = true; floor.userData.floor = z.id; // themes3d.js tints a floor for a themed day
      group.add(floor);
      // the inlay border: a band of the zone's edge colour just inside the floor, a hair above it
      const b = 0.35 / U, top = fy + 0.004 + 0.003, edge = mat(LOOK[z.id].edge, GLOSS);
      [[cx, cz - d / 2 + b / 2, w, b], [cx, cz + d / 2 - b / 2, w, b], [cx - w / 2 + b / 2, cz, b, d - 2 * b], [cx + w / 2 - b / 2, cz, b, d - 2 * b]].forEach(([bx, bz, bw, bd]) => {
        const band = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.004, bd), edge);
        band.position.set(bx, top, bz);
        group.add(band);
      });
    });
    furnish(z, k);
    mergeStatic(group);
    group.userData = { id: z.id, lift: 0, liftTarget: 0, scale: 0, opacity: 1, opacityTarget: 1 };
    group.traverse((o) => { if (o.isMesh) o.userData.zone = z.id; });
    scene.add(group);
    return { data: z, group, anchor: new THREE.Vector3(toX(lx), 1.2, toZ(ly)) };
  });
  scene.traverse((o) => {
    if (!o.isMesh || o === ground) return;
    o.castShadow = true; o.receiveShadow = true;
    if (o.material.isMeshStandardMaterial && o.material.metalness < 0.5) o.material.envMapIntensity = 0.55; // shading and shadows read; gold and mirrors keep their shine
  });
  let activation = null;
  scene.traverse((o) => { if (o.userData.activation) activation = o; });
  return { root: scene, zones, spots, activation };
}
