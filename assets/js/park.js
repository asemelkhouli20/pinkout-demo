// PinkOut Partners — the setting around the venue: a night market in a park. A paved square runs round the building
// with two rows of vendor booths on every side (the inner row faces the promenade, the outer row faces it across a
// market aisle). Each kind of booth looks like what it sells: Beauty Corner (vanity mirrors, lipsticks), Boba & Coffee
// (a giant cup on its arched roof), Accessories Shop (tent roof, jewellery case, handbags), Flower Bar (umbrella,
// buckets of flowers), DIY Station (wooden roof, pegboard of tools, paint), Fashion Pop-Up (clothes rail, mannequin),
// Sweet Spot (umbrella with a giant ice-cream cone, candy jars, lollipops), Photo Booth (kiosk, ring light, photo
// frame). Food trucks line the paths in (north) and out (south); a jogging loop circles the lawns, palms and shade
// trees, and a city skyline glows on the horizon. Night: a deep sky with a moon and stars, warm light where people are.
// It is background: everything repeated is drawn in bulk (one draw per part, not per booth), nothing casts shadows
// (the lawn and square only receive the building's), fewer trees and people on phones.
// Scene units: the building plinth is 20.5 × 18.5, centred on the origin; the ground sits at y = -0.3.
import * as THREE from './vendor/three.module.min.js?v=1';

const G = -0.3;                     // ground level
const SQUARE = [22.8, 21.8];        // half sizes of the paved square (promenade + market aisle)
const NIGHT = '#141b36';            // the sky (and the haze over the far lawns)
const LOOP = [34, 0.9];             // the jogging loop: radius, squash along z
const WHEEL = [34, -40];            // the Ferris wheel (far lawn, north-east)
const FOUNTAIN = [6, 25.2];         // the fountain (south lawn)
const HEART = [-1.6, 25.4];         // the glowing heart (a photo spot by the fountain)
const GARDENS = [[27, 24], [-27, 24], [27, -24], [-27, -24]];
const CLEAR = [[...WHEEL, 12], [...FOUNTAIN, 4], [...HEART, 3], ...GARDENS.map((g) => [...g, 4.5])]; // [x, z, radius] trees keep out of
const OUTFITS = ['#ff3d8b', '#2b1220', '#ffffff', '#ff8fb8', '#ddcffb', '#3a4a63', '#fff0aa', '#c7efdf', '#df004c', '#ffd9c2', '#2b1220', '#9fd0ff'];
const SKIN = ['#f1c7a8', '#d9a37f', '#b97f5c', '#e8b896', '#2b1220'];
const WARM = '#ffd9a0';

/* every vendor name keeps its colours: [body, accent] */
const BRANDS = {
  'Beauty Corner': ['#ffb3cf', '#ff3d8b'], 'Boba & Coffee': ['#c7efdf', '#2f8f83'], 'Accessories Shop': ['#ddcffb', '#7a5bd0'],
  'Flower Bar': ['#ffd9e6', '#3f8a52'], 'DIY Station': ['#fff0aa', '#e2ad3b'], 'Fashion Pop-Up': ['#ffd9c2', '#ec7b44'],
  'Sweet Spot': ['#ff8fb8', '#c2185b'], 'Photo Booth': ['#3a2440', '#ff3d8b'],
};
const NAMES = Object.keys(BRANDS);

/* where the vendors stand: two rows on every side of the square, trucks along the paths */
function layout() {
  const booths = [];
  const row = (from, to, at, yaw, side, ring, offset) => { let i = 0; for (let v = from; v <= to + 0.01; v += 2.36, i++) booths.push({ ...at(v), yaw, side, ring, name: NAMES[(i + offset) % NAMES.length] }); };
  row(-10.6, 10.6, (z) => ({ x: 15.5, z }), -Math.PI / 2, 'e', 0, 0);   // inner rows face the promenade
  row(-10.6, 10.6, (z) => ({ x: -15.5, z }), Math.PI / 2, 'w', 0, 3);
  row(-5.0, 11.6, (x) => ({ x, z: 14.5 }), Math.PI, 's', 0, 5);         // (the paths in and out stay clear)
  row(-5.0, 11.6, (x) => ({ x, z: -14.5 }), 0, 'n', 0, 1);
  row(-13.0, 13.0, (z) => ({ x: 20.6, z }), -Math.PI / 2, 'e', 1, 6);   // outer rows face them across the market aisle
  row(-13.0, 13.0, (z) => ({ x: -20.6, z }), Math.PI / 2, 'w', 1, 2);
  row(-2.6, 16.2, (x) => ({ x, z: 19.6 }), Math.PI, 's', 1, 4);
  row(-2.6, 16.2, (x) => ({ x, z: -19.6 }), 0, 'n', 1, 7);
  const trucks = [];
  [-1, 1].forEach((side) => [18.8, 21.6, 38].forEach((d, k) => [-1, 1].forEach((sz) => trucks.push({
    x: -8.9 + side * 2.7, z: sz * d, yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2, name: ['Boba & Coffee', 'Sweet Spot', 'Flower Bar'][(k + (side > 0 ? 1 : 0)) % 3],
  }))));
  return { booths, trucks };
}

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // the same park every visit
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const glowMat = (color) => new THREE.MeshBasicMaterial({ color });
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
const L = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const at = (x, z, yaw) => new THREE.Matrix4().compose(new THREE.Vector3(x, G, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
const range = (n) => Array.from({ length: n }, (_, i) => i);

function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4; }
  return t;
}
const dot = () => canvasTexture(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});
/** trace a rounded rectangle centred on the origin into a shape or path */
function roundRectPath(s, hw, hd, r) {
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r); s.lineTo(hw, hd - r); s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - r); s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}
/** a rounded rectangle lying flat, centred on the origin (scene units) */
const roundRect = (hw, hd, r) => new THREE.ShapeGeometry(roundRectPath(new THREE.Shape(), hw, hd, r), 8).rotateX(-Math.PI / 2);
const flat = (geo, material, y) => { const m = new THREE.Mesh(geo, material); m.position.y = y; m.receiveShadow = true; return m; };
/** a name sign: white bold letters on a rounded board in the brand's accent, lit from inside */
const signMaterial = (name, colour) => new THREE.MeshBasicMaterial({ transparent: true, map: canvasTexture(512, 128, (g, w, h) => {
  g.fillStyle = colour; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 40); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#ffffff'; g.font = '800 58px system-ui, -apple-system, "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name, w / 2, h / 2 + 3, w - 40);
}) });

/** Draw many copies of a design in bulk: one instanced mesh per part. items: [{ matrix, ... }];
 *  part: { geo, mat, at: [local matrices], color?: (item, k) => hex } */
function bulk(root, items, parts) {
  parts.forEach((p) => {
    const n = items.length * p.at.length;
    if (!n) return;
    const im = new THREE.InstancedMesh(p.geo, p.mat, n);
    let i = 0;
    const c = new THREE.Color();
    items.forEach((it) => p.at.forEach((local, k) => {
      im.setMatrixAt(i, m4.multiplyMatrices(it.matrix, local));
      if (p.color) im.setColorAt(i, c.set(p.color(it, k)));
      i++;
    }));
    im.receiveShadow = false;
    im.userData.pick = { items, per: p.at.length }; // instance i belongs to items[i / per]: a click finds its vendor
    root.add(im);
  });
}

/* ---------- the booth designs (local: +z is the customers' side; the counter is 1.5 wide) ---------- */
function designs(M) {
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const sph = (r, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));
  const fixed = (hex) => () => hex;
  // the stall every kind shares: counter, top, back wall (and posts and an under-roof light where the roof needs them)
  const stall = (back, posts = true) => [
    { geo: box(1.5, 0.42, 0.55), mat: M.tint, at: [L(0, 0.21, 0.12)], color: (b) => b.colour },
    { geo: box(1.56, 0.04, 0.62), mat: M.white, at: [L(0, 0.44, 0.12)] },
    { geo: box(1.5, 1.0, 0.06), mat: M.tint, at: [L(0, 0.5, -0.32)], color: back ? fixed(back) : (b) => b.colour },
    ...(posts ? [{ geo: cyl(0.025, 0.025, 1.12, 6), mat: M.white, at: [L(-0.72, 0.56, 0.4), L(0.72, 0.56, 0.4), L(-0.72, 0.56, -0.32), L(0.72, 0.56, -0.32)] },
      { geo: box(1.36, 0.035, 0.05), mat: M.warm, at: [L(0, 1.0, 0.42)] }] : []),
  ];
  const ROOF = {
    stripes: { parts: [{ geo: box(0.27, 0.03, 0.86), mat: M.tint, at: range(6).map((i) => L(-0.675 + i * 0.27, 1.14, 0.06, 0.22)), color: (b, k) => (k % 2 ? '#ffffff' : b.accent) }], sign: L(0, 1.42, 0.42) },
    tent: { parts: [{ geo: new THREE.ConeGeometry(1.1, 0.62, 4), mat: M.tint, at: [L(0, 1.43, 0.04, 0, Math.PI / 4)], color: (b) => b.accent },
      { geo: box(1.56, 0.05, 0.82), mat: M.white, at: [L(0, 1.12, 0.04)] }], sign: L(0, 1.45, 0.72) },
    umbrella: { posts: false, parts: [{ geo: cyl(0.03, 0.03, 1.35, 6), mat: M.white, at: [L(0, 0.68, 0.1)] },
      { geo: new THREE.ConeGeometry(1.05, 0.4, 12, 1, true), mat: M.tintDouble, at: [L(0, 1.5, 0.1)], color: (b) => b.accent },
      { geo: sph(0.05), mat: M.white, at: [L(0, 1.72, 0.1)] }], sign: L(0, 1.07, 0.5) },
    arch: { parts: [{ geo: new THREE.CylinderGeometry(0.8, 0.8, 1.56, 18, 1, true, 0, Math.PI), mat: M.tintDouble, at: [L(0, 0.95, 0.04, 0, 0, Math.PI / 2, 0.6, 1, 1)], color: (b) => b.accent }], sign: L(0, 1.12, 0.84) },
    board: { parts: [{ geo: box(1.7, 0.05, 1.0), mat: M.tint, at: [L(0, 1.18, 0.06, 0.22)], color: fixed('#b98a5e') },
      { geo: box(1.7, 0.12, 0.04), mat: M.tint, at: [L(0, 1.1, 0.58, 0.22)], color: (b) => b.accent }], sign: L(0, 1.45, 0.42) },
  };
  const lipsticks = ['#df004c', '#ff3d8b', '#c98d6b', '#e6c47e', '#ff8fb8', '#8a4a35'];
  const D = {
    'Beauty Corner': { roof: 'stripes', parts: [
      { geo: box(0.34, 0.46, 0.02), mat: M.mirror, at: [L(-0.4, 0.72, -0.28), L(0.4, 0.72, -0.28)] },                         // vanity mirrors
      { geo: new THREE.TorusGeometry(0.21, 0.018, 6, 24), mat: M.glow, at: [L(-0.4, 0.72, -0.27), L(0.4, 0.72, -0.27)] },      // ring lights
      { geo: cyl(0.022, 0.022, 0.1, 8), mat: M.tint, at: range(6).map((i) => L(-0.5 + i * 0.2, 0.51, 0.25)), color: (b, k) => lipsticks[k] },
    ] },
    'Boba & Coffee': { roof: 'arch', parts: [
      { geo: cyl(0.17, 0.13, 0.42, 16), mat: M.tint, at: [L(0, 1.62, 0.04)], color: fixed('#f3e0c8') },                        // the giant boba cup
      { geo: new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat: M.tint, at: [L(0, 1.83, 0.04)], color: fixed('#ff8fb8') },
      { geo: cyl(0.022, 0.022, 0.34, 6), mat: M.tint, at: [L(0.05, 2.02, 0.04, 0, 0, -0.2)], color: fixed('#ff3d8b') },
      { geo: cyl(0.04, 0.034, 0.11, 10), mat: M.tint, at: range(4).map((i) => L(-0.45 + i * 0.3, 0.515, 0.25)), color: fixed('#f3e0c8') },
      { geo: sph(0.04), mat: M.tint, at: range(4).map((i) => L(-0.45 + i * 0.3, 0.58, 0.25)), color: (b, k) => ['#ff8fb8', '#2f8f83', '#ff8fb8', '#c98d6b'][k] },
      { geo: box(0.7, 0.38, 0.03), mat: M.tint, at: [L(0, 0.72, -0.285)], color: fixed('#2b2b33') },                             // menu board
      { geo: box(0.5, 0.02, 0.01), mat: M.mint, at: [L(0, 0.82, -0.268), L(0, 0.74, -0.268), L(0, 0.66, -0.268)] },
    ] },
    'Accessories Shop': { roof: 'tent', parts: [
      { geo: box(0.9, 0.16, 0.36), mat: M.glass, at: [L(0, 0.54, 0.15)] },                                                    // jewellery case
      { geo: cyl(0.012, 0.012, 0.22, 6), mat: M.gold, at: [L(-0.6, 0.57, 0.22), L(0.6, 0.57, 0.22)] },
      { geo: new THREE.TorusGeometry(0.04, 0.008, 6, 14), mat: M.gold, at: [L(-0.6, 0.6, 0.22), L(-0.6, 0.66, 0.22), L(0.6, 0.6, 0.22), L(0.6, 0.66, 0.22)] },
      { geo: box(0.16, 0.13, 0.06), mat: M.tint, at: [L(-0.4, 0.74, -0.26), L(0, 0.74, -0.26), L(0.4, 0.74, -0.26)], color: (b, k) => ['#7a5bd0', '#ff8fb8', '#e6c47e'][k] }, // handbags
      { geo: new THREE.TorusGeometry(0.05, 0.01, 6, 12, Math.PI), mat: M.gold, at: [L(-0.4, 0.8, -0.26), L(0, 0.8, -0.26), L(0.4, 0.8, -0.26)] },
    ] },
    'Flower Bar': { roof: 'umbrella', parts: [
      { geo: cyl(0.09, 0.075, 0.13, 10), mat: M.tint, at: [L(-0.45, 0.065, 0.62), L(0, 0.065, 0.62), L(0.45, 0.065, 0.62)], color: fixed('#9aa3ad') }, // buckets
      { geo: new THREE.IcosahedronGeometry(0.075, 0), mat: M.tint, at: range(9).map((i) => L(-0.45 + Math.floor(i / 3) * 0.45 + ((i % 3) - 1) * 0.05, 0.2 + (i % 2) * 0.05, 0.62 + ((i % 3) - 1) * 0.04)), color: (b, k) => ['#ff3d8b', '#ffffff', '#df004c', '#fff0aa', '#ff8fb8'][k % 5] },
      { geo: new THREE.IcosahedronGeometry(0.06, 0), mat: M.tint, at: range(6).map((i) => L(-0.5 + i * 0.2, 0.5, 0.2)), color: (b, k) => ['#ff8fb8', '#ffffff', '#ff3d8b'][k % 3] },
    ] },
    'DIY Station': { roof: 'board', back: '#d9b98c', parts: [
      { geo: box(0.04, 0.16, 0.02), mat: M.tint, at: range(7).map((i) => L(-0.55 + i * 0.18, 0.74, -0.285, 0, 0, (i % 2) * 0.3)), color: (b, k) => ['#e2ad3b', '#ff3d8b', '#2f8f83', '#7a5bd0'][k % 4] }, // tools on the pegboard
      { geo: cyl(0.045, 0.045, 0.07, 10), mat: M.tint, at: range(5).map((i) => L(-0.48 + i * 0.24, 0.495, 0.25)), color: (b, k) => ['#ff3d8b', '#fff0aa', '#2f8f83', '#7a5bd0', '#ec7b44'][k] }, // paint pots
    ] },
    'Fashion Pop-Up': { roof: 'stripes', parts: [
      { geo: cyl(0.015, 0.015, 0.9, 6), mat: M.gold, at: [L(1.0, 0.45, -0.1), L(1.0, 0.45, 0.55)] },                       // clothes rail
      { geo: cyl(0.012, 0.012, 0.7, 6), mat: M.gold, at: [L(1.0, 0.88, 0.22, Math.PI / 2)] },
      { geo: box(0.04, 0.32, 0.12), mat: M.tint, at: range(5).map((i) => L(1.0, 0.7, -0.03 + i * 0.13)), color: (b, k) => ['#ec7b44', '#ffffff', '#ddcffb', '#ff8fb8', '#fff0aa'][k] },
      { geo: cyl(0.12, 0.12, 0.03, 12), mat: M.tint, at: [L(-1.0, 0.015, 0.3)], color: fixed('#2b2b33') },               // mannequin
      { geo: cyl(0.06, 0.13, 0.34, 12), mat: M.tint, at: [L(-1.0, 0.42, 0.3)], color: (b) => b.accent },
      { geo: sph(0.055), mat: M.white, at: [L(-1.0, 0.64, 0.3)] },
      { geo: cyl(0.012, 0.012, 0.25, 6), mat: M.tint, at: [L(-1.0, 0.14, 0.3)], color: fixed('#2b2b33') },
    ] },
    'Sweet Spot': { roof: 'umbrella', parts: [
      { geo: new THREE.ConeGeometry(0.13, 0.36, 12), mat: M.tint, at: [L(0, 1.92, 0.1, Math.PI)], color: fixed('#e8c08a') },   // the giant ice-cream cone
      { geo: sph(0.14, 14), mat: M.tint, at: [L(0, 2.14, 0.1), L(0, 2.3, 0.1)], color: (b, k) => ['#ff8fb8', '#c7efdf'][k] },
      { geo: cyl(0.07, 0.07, 0.15, 12), mat: M.glass, at: [L(-0.4, 0.52, 0.2), L(0, 0.52, 0.2), L(0.4, 0.52, 0.2)] },          // candy jars
      { geo: sph(0.045), mat: M.tint, at: range(6).map((i) => L(-0.4 + Math.floor(i / 2) * 0.4 + (i % 2) * 0.03, 0.5 + (i % 2) * 0.05, 0.2)), color: (b, k) => ['#ff3d8b', '#fff0aa', '#c7efdf'][k % 3] },
      { geo: cyl(0.008, 0.008, 0.26, 4), mat: M.white, at: [L(-0.66, 0.59, 0.36), L(0.66, 0.59, 0.36)] },                       // lollipops
      { geo: sph(0.07, 12), mat: M.tint, at: [L(-0.66, 0.74, 0.36), L(0.66, 0.74, 0.36)], color: (b, k) => ['#ff3d8b', '#7a5bd0'][k] },
    ] },
  };
  const frame = L(1.0, 0.55, 0.45, 0, -0.5);
  const inFrame = (x, y) => new THREE.Matrix4().multiplyMatrices(frame, L(x, y, 0));
  const PHOTO = [
    { geo: box(1.0, 1.1, 0.8), mat: M.tint, at: [L(0, 0.55, -0.1)], color: (b) => b.colour },
    { geo: box(0.5, 0.75, 0.03), mat: M.tint, at: [L(0.18, 0.5, 0.31)], color: (b) => b.accent },                             // curtain
    { geo: new THREE.TorusGeometry(0.16, 0.025, 8, 24), mat: M.glow, at: [L(-0.22, 0.75, 0.32)] },                             // ring light
    { geo: box(1.05, 0.1, 0.85), mat: M.tint, at: [L(0, 1.12, -0.1)], color: (b) => b.accent },
    { geo: sph(0.03, 6), mat: M.warm, at: range(7).map((i) => L(-0.45 + i * 0.15, 1.12, 0.33)) },                             // marquee bulbs
    { geo: box(0.7, 0.05, 0.05), mat: M.gold, at: [inFrame(0, 0.45), inFrame(0, -0.45)] },                                   // a big photo frame
    { geo: box(0.05, 0.9, 0.05), mat: M.gold, at: [inFrame(-0.35, 0), inFrame(0.35, 0)] },
  ];
  return { stall, ROOF, D, PHOTO };
}

export function buildPark(scene, { coarse = false, venue } = {}) {
  seed = 7;
  const root = new THREE.Group();
  scene.add(root);
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.Fog(NIGHT, 60, 150); // the far lawns fade into the night: no edge to the world
  venue?.root.traverse((o) => { if (o.material?.isShadowMaterial) o.visible = false; }); // the lawn takes the building's shadow now
  const glowTex = dot();
  const c = new THREE.Color();
  const { booths, trucks } = layout();
  booths.forEach((b) => { b.matrix = at(b.x, b.z, b.yaw); [b.colour, b.accent] = BRANDS[b.name]; });
  trucks.forEach((t) => { t.matrix = at(t.x, t.z, t.yaw); [t.colour, t.accent] = BRANDS[t.name]; });

  /* ---------- night sky: a moon, stars and a city skyline on the horizon ---------- */
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff4d6', fog: false }));
  moon.position.set(-70, 44, -120); root.add(moon);
  const starPos = new Float32Array(420 * 3);
  for (let i = 0; i < 420; i++) { const a = rnd() * Math.PI * 2, h = 0.1 + rnd() * 0.9, r = 170; starPos.set([Math.cos(a) * r * Math.cos(h), Math.sin(h) * r, Math.sin(a) * r * Math.cos(h)], i * 3); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  root.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
  const windows = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#121833'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 10) for (let x = 6; x < w; x += 12) if (rnd() < 0.42) { g.fillStyle = ['#ffd9a0', '#ffe9c4', '#cfe3ff', '#ffc2d6'][Math.floor(rnd() * 4)]; g.fillRect(x, y, 5, 5); }
  });
  const towers = [];
  for (let i = 0; i < (coarse ? 46 : 80); i++) {
    const a = (i / (coarse ? 46 : 80)) * Math.PI * 2 + rnd() * 0.05, r = 132 + rnd() * 20;
    towers.push([Math.cos(a) * r, Math.sin(a) * r, 4 + rnd() * 7, 8 + Math.pow(rnd(), 1.6) * 34, a]);
  }
  const skyline = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ map: windows, fog: false }), towers.length);
  towers.forEach(([x, z, w, h, a], i) => { q.setFromEuler(e.set(0, -a, 0)); m4.compose(v3.set(x, G, z), q, s3.set(w, h, w * 0.8)); skyline.setMatrixAt(i, m4); });
  const beacons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff4d6d', fog: false }), towers.length);
  towers.forEach(([x, z, , h], i) => { m4.compose(v3.set(x, G + h + 0.5, z), q.identity(), s3.set(1, 1, 1)); beacons.setMatrixAt(i, h > 26 ? m4 : new THREE.Matrix4().makeScale(0, 0, 0)); });
  root.add(skyline, beacons);

  /* ---------- ground: lawns, the market square, paths in and out, a jogging loop ---------- */
  const grass = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#2f4a3c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = ['#2a4436', '#35523f', '#283f33', '#3a5844'][i % 4]; g.fillRect(rnd() * w, rnd() * h, 2, 3); }
  }, 70);
  root.add(flat(new THREE.CircleGeometry(175, 72).rotateX(-Math.PI / 2), std('#ffffff', { map: grass, roughness: 0.95 }), G));
  // the square, dressed like the venue itself (ivory marble, blush, rose and gold), divided into its parts from the
  // building out: an apron of ivory marble along the walls (where the carts stand), a promenade of rose fish-scale
  // tiles, the market in a pink-and-ivory harlequin, and between the booth rows a rose runner strewn with flowers; gold
  // inlays mark where one part meets the next, a stone kerb holds it all against the lawn.
  // Every layer sits clearly above the one under it (0.012 apart: with the camera's near plane at 0.8 the depth buffer
  // tells them apart even at the far edge of the park), so no two of them fight over the same pixels.
  const tile = (units, draw) => { const t = canvasTexture(256, 256, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / units, 1 / units); t.anisotropy = 4; return t; };
  const vary = (hex, k) => { c.set(hex).offsetHSL(0, 0, (rnd() - 0.5) * k); return `#${c.getHexString()}`; };
  const marbleApron = tile(2.6, (g, w, h) => { // berry marble with blush veins: a dark frame that sets off the pale building
    g.fillStyle = '#6e2443'; g.fillRect(0, 0, w, h);
    g.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = i % 3 ? 'rgba(255,170,200,0.45)' : 'rgba(240,204,130,0.5)';
      g.beginPath(); const y = rnd() * h; g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 120, w * 0.6, y + (rnd() - 0.5) * 120, w, y + (rnd() - 0.5) * 40); g.stroke();
    }
    g.fillStyle = 'rgba(40,10,24,0.8)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(0, 127, w, 2); g.fillRect(127, 0, 2, h);
  });
  const scales = tile(1.2, (g, w, h) => { // rose fish-scale tiles, outlined in blush
    g.fillStyle = '#c85f86'; g.fillRect(0, 0, w, h);
    g.lineWidth = 3; g.strokeStyle = '#d99ab0';
    for (let y = -1; y < 9; y++) for (let x = -1; x < 5; x++) {
      g.fillStyle = vary(y % 2 ? '#c95a83' : '#d8749a', 0.06);
      g.beginPath(); g.arc(x * 64 + (y % 2 ? 32 : 0), y * 32, 32, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    }
  });
  const harlequin = tile(2.2, (g, w, h) => { // dusky rose diamonds on mauve, with gold grout
    g.fillStyle = '#c9a3b1'; g.fillRect(0, 0, w, h);
    const dia = (cx, cy) => { g.beginPath(); g.moveTo(cx, cy - 128); g.lineTo(cx + 128, cy); g.lineTo(cx, cy + 128); g.lineTo(cx - 128, cy); g.closePath(); g.fill(); g.stroke(); };
    g.fillStyle = '#b97891'; g.strokeStyle = '#a88a5c'; g.lineWidth = 2;
    [[128, 128], [0, 0], [256, 0], [0, 256], [256, 256]].forEach(([x, y]) => dia(x, y));
  });
  const runner = tile(1.5, (g, w, h) => { // a berry runner strewn with blush flowers and gold hearts
    g.fillStyle = '#6a2142'; g.fillRect(0, 0, w, h);
    const flower = (cx, cy, r) => {
      g.fillStyle = '#c98aa2';
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.5, r * 0.3, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#b8955a'; g.beginPath(); g.arc(cx, cy, r * 0.24, 0, Math.PI * 2); g.fill();
    };
    [[128, 128], [0, 0], [256, 0], [0, 256], [256, 256]].forEach(([x, y]) => flower(x, y, 54));
    g.fillStyle = '#a8845a';
    [[128, 0], [0, 128], [256, 128], [128, 256]].forEach(([x, y]) => { // small hearts between the flowers
      g.beginPath(); g.moveTo(x, y + 12); g.bezierCurveTo(x - 22, y - 4, x - 10, y - 20, x, y - 8); g.bezierCurveTo(x + 10, y - 20, x + 22, y - 4, x, y + 12); g.fill();
    });
  });
    const layer = (geo, material, k) => { // k: how many steps above the lawn this layer lies
    const m = flat(geo, material, G + k * 0.012); root.add(m); return m;
  };
  // the paving gets dimmer the further it lies from the building, so the eye goes to the venue, not the square
  const pave = (geo, map, k, tone = '#cdc2cf') => layer(geo, std(tone, { map, roughness: 0.75 }), k);
  const ring = (ohw, ohd, ihw, ihd, or = 1.4, ir = 1.2) => { // a flat band between two rounded rectangles
    const outer = roundRectPath(new THREE.Shape(), ohw, ohd, or), hole = roundRectPath(new THREE.Path(), ihw, ihd, ir);
    outer.holes.push(hole);
    return new THREE.ShapeGeometry(outer, 8).rotateX(-Math.PI / 2);
  };
  layer(roundRect(SQUARE[0] + 0.45, SQUARE[1] + 0.45, 3.3), std('#8f8378', { roughness: 0.7 }), 1);   // a stone kerb round it all
  pave(roundRect(SQUARE[0], SQUARE[1], 3), harlequin, 2, '#8a8090');                           // the market
  pave(ring(19.9, 19.0, 16.0, 15.0, 2.4, 1.8), runner, 3, '#9a909e');                          // its aisle, between the rows
  pave(roundRect(13.6, 12.6, 2.2), scales, 3, '#a89eac');                                      // the promenade
  pave(roundRect(11.7, 10.7, 1.4), marbleApron, 4);                                 // the apron along the walls
  const inlayGold = () => std('#f0cc82', { metalness: 0.55, roughness: 0.3, emissive: '#8a6420', emissiveIntensity: 0.2 });
  layer(ring(11.95, 10.95, 11.7, 10.7, 1.5, 1.4), std('#ff8fb8', { roughness: 0.5, emissive: '#ff3d8b', emissiveIntensity: 0.6 }), 5); // apron | promenade
  layer(ring(13.9, 12.9, 13.6, 12.6, 2.35, 2.2), inlayGold(), 5);                 // promenade | market
  layer(ring(16.15, 15.15, 15.85, 14.85, 1.85, 1.75), inlayGold(), 5);            // the aisle's two edges
  layer(ring(20.05, 19.15, 19.75, 18.85, 2.45, 2.35), inlayGold(), 5);
  layer(ring(SQUARE[0] + 0.05, SQUARE[1] + 0.05, SQUARE[0] - 0.2, SQUARE[1] - 0.2, 3.05, 2.8), inlayGold(), 5); // a gold edge on the kerb
  // paths out to the north and south start where the kerb ends, so they never lie over the square
  const PATH0 = SQUARE[1] + 0.45, PATH1 = 82;
  [-1, 1].forEach((s) => layer(new THREE.PlaneGeometry(2.4, PATH1 - PATH0).rotateX(-Math.PI / 2).translate(-8.9, 0, s * (PATH0 + PATH1) / 2), std('#5e5068', { roughness: 0.95 }), 1));
  const loop = layer(new THREE.RingGeometry(LOOP[0] - 0.6, LOOP[0] + 0.6, 140).rotateX(-Math.PI / 2), std('#5e5068', { roughness: 0.95 }), 2); loop.scale.z = LOOP[1];

  /* ---------- trees: palms and round shade trees over the lawns ---------- */
  const spotsTree = [];
  const nTrees = coarse ? 50 : 110;
  for (let tries = 0; spotsTree.length < nTrees && tries < 4000; tries++) {
    const a = rnd() * Math.PI * 2, r = 25 + rnd() * 45, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.92;
    if (Math.abs(x) < SQUARE[0] + 1.5 && Math.abs(z) < SQUARE[1] + 1.5) continue;            // not on the square
    if (Math.abs(x + 8.9) < 5 && Math.abs(z) > 12) continue;                                   // keep the paths and their trucks clear
    if (Math.abs(Math.hypot(x / LOOP[0], z / (LOOP[0] * LOOP[1])) - 1) < 0.045) continue;     // and the jogging loop
    if (spotsTree.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2.4)) continue;
    if (CLEAR.some(([cx, cz, r]) => Math.hypot(cx - x, cz - z) < r)) continue;
    spotsTree.push([x, z, 0.8 + rnd() * 0.5, rnd() < 0.42]);
  }
  const place = (im, i, x, y, z, s, sy = s, ry = 0, rz = 0) => { q.setFromEuler(e.set(0, ry, rz)); m4.compose(v3.set(x, y, z), q, s3.set(s, sy, s)); im.setMatrixAt(i, m4); };
  const palms = spotsTree.filter((t) => t[3]), round = spotsTree.filter((t) => !t[3]);
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.11, 1, 7); trunkGeo.translate(0, 0.5, 0);
  const palmTrunks = new THREE.InstancedMesh(trunkGeo, std('#5a4636'), palms.length);
  const fronds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 0.35, 7, 1, true), std('#2f5a3e', { side: THREE.DoubleSide, flatShading: true }), palms.length);
  palms.forEach(([x, z, s], i) => { const lean = (rnd() - 0.5) * 0.18; place(palmTrunks, i, x, G, z, s, s * 2.3, 0, lean); place(fronds, i, x - Math.sin(lean) * 2.2 * s, G + 2.25 * s, z, s, s, rnd() * 3); });
  const roundTrunks = new THREE.InstancedMesh(trunkGeo, std('#4a3a30'), round.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.75, 1), std('#2b4a37', { flatShading: true }), round.length);
  const crownCol = ['#2b4a37', '#33553f', '#284432', '#3a5c45'];
  round.forEach(([x, z, s], i) => { place(roundTrunks, i, x, G, z, s, s * 1.0); place(crowns, i, x, G + 1.35 * s, z, s * 1.1, s * 0.95, rnd() * 3); crowns.setColorAt(i, c.set(crownCol[i % 4])); });
  root.add(palmTrunks, fronds, roundTrunks, crowns);
  // fairy lights wound round every other shade tree
  const lit = round.filter((_, i) => i % 2 === 0);
  const treeLights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 6, 4), glowMat('#ffffff'), lit.length * 12);
  lit.forEach(([x, z, s], t) => range(12).forEach((k) => {
    const a = k * 1.9 + t, y = G + 1.0 * s + k * 0.05 * s, r = 0.72 * s * (1 - k * 0.025);
    place(treeLights, t * 12 + k, x + Math.cos(a) * r, y, z + Math.sin(a) * r, 1);
    treeLights.setColorAt(t * 12 + k, c.set(['#ffe2a8', '#ff8fb8', '#fff6e0', '#c7e8ff'][(t + k) % 4]));
  }));
  root.add(treeLights);

  /* ---------- the booths, in bulk: each kind its own roof and goods ---------- */
  const M = {
    tint: std('#ffffff', { roughness: 0.6 }), tintDouble: std('#ffffff', { roughness: 0.6, side: THREE.DoubleSide }), white: std('#ffffff', { roughness: 0.5 }),
    gold: std('#e6c47e', { metalness: 0.7, roughness: 0.3 }), mirror: std('#dfe6f2', { metalness: 0.9, roughness: 0.1 }),
    glass: std('#ffffff', { transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.05 }),
    glow: glowMat('#ffffff'), warm: glowMat('#ffe7b8'), mint: glowMat('#c7efdf'),
  };
  const { stall, ROOF, D, PHOTO } = designs(M);
  const signs = {}; // the sign position per name (it depends on the roof)
  NAMES.forEach((name) => {
    const list = booths.filter((b) => b.name === name);
    if (name === 'Photo Booth') { bulk(root, list, PHOTO); signs[name] = L(0, 1.42, 0.42); return; }
    const d = D[name], roof = ROOF[d.roof];
    bulk(root, list, [...stall(d.back, roof.posts !== false), ...roof.parts, ...d.parts]);
    signs[name] = roof.sign;
  });
  bulk(root, trucks, [
    { geo: new THREE.BoxGeometry(1.7, 0.85, 0.85), mat: std('#ffffff', { roughness: 0.45 }), at: [L(-0.15, 0.62, 0)], color: (t) => t.colour },
    { geo: new THREE.BoxGeometry(0.55, 0.62, 0.82), mat: std('#ffffff', { roughness: 0.45 }), at: [L(0.95, 0.5, 0)], color: (t) => t.colour },
    { geo: new THREE.BoxGeometry(0.04, 0.28, 0.7), mat: std('#3a4a63', { roughness: 0.15, metalness: 0.3 }), at: [L(1.23, 0.62, 0)] },
    { geo: new THREE.BoxGeometry(1.0, 0.36, 0.04), mat: glowMat('#ffd9a0'), at: [L(-0.2, 0.72, 0.43)] },                     // the lit serving window
    { geo: new THREE.BoxGeometry(1.05, 0.04, 0.16), mat: M.white, at: [L(-0.2, 0.54, 0.5)] },
    { geo: new THREE.BoxGeometry(0.24, 0.02, 0.42), mat: M.tint, at: range(5).map((i) => L(-0.68 + i * 0.24, 1.0, 0.6, 0.35)), color: (t, k) => (k % 2 ? '#ffffff' : t.accent) },
    { geo: new THREE.BoxGeometry(1.72, 0.08, 0.87), mat: M.tint, at: [L(-0.15, 0.3, 0)], color: (t) => t.accent },
    { geo: new THREE.CylinderGeometry(0.14, 0.14, 0.08, 14), mat: std('#2b2b30'), at: [[-0.65, 0.43], [-0.65, -0.43], [0.9, 0.43], [0.9, -0.43]].map(([x, z]) => L(x, 0.14, z, Math.PI / 2)) },
  ]);
  // carts right round the building, on the stone apron (the doors stay clear): small rolling stalls in every brand's colours
  const carts = [];
  for (let z = -6.6; z <= 6.7; z += 3.3) carts.push({ x: 11.05, z, yaw: Math.PI / 2 }, { x: -11.05, z, yaw: -Math.PI / 2 });
  for (let x = -4.6; x <= 8.6; x += 3.3) carts.push({ x, z: 10.05, yaw: 0 }, { x, z: -10.05, yaw: Math.PI });
  carts.forEach((ct, i) => { ct.matrix = at(ct.x, ct.z, ct.yaw); ct.name = NAMES[(i * 3) % NAMES.length]; [ct.colour, ct.accent] = BRANDS[ct.name]; });
  bulk(root, carts, [
    { geo: new THREE.BoxGeometry(0.9, 0.4, 0.45), mat: M.tint, at: [L(0, 0.35, 0)], color: (t) => t.colour },
    { geo: new THREE.BoxGeometry(0.94, 0.03, 0.5), mat: M.white, at: [L(0, 0.565, 0)] },
    { geo: new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), mat: std('#2b2b30'), at: [L(-0.47, 0.12, 0, 0, 0, Math.PI / 2), L(0.47, 0.12, 0, 0, 0, Math.PI / 2)] },
    { geo: new THREE.CylinderGeometry(0.015, 0.015, 0.46, 6), mat: M.white, at: [L(-0.42, 0.8, -0.18), L(0.42, 0.8, -0.18)] },
    { geo: new THREE.BoxGeometry(0.24, 0.02, 0.56), mat: M.tint, at: range(4).map((i) => L(-0.36 + i * 0.24, 1.04, 0.02, 0.3)), color: (t, k) => (k % 2 ? '#ffffff' : t.accent) },
    { geo: new THREE.BoxGeometry(0.8, 0.025, 0.04), mat: M.warm, at: [L(0, 0.97, 0.26)] },
    { geo: new THREE.BoxGeometry(0.12, 0.1, 0.12), mat: M.tint, at: range(4).map((i) => L(-0.3 + i * 0.2, 0.63, 0.04)), color: (t, k) => ['#ffffff', t.accent, '#fff0aa', t.colour][k] },
  ]);
  // signs: one bulk draw per name, on every booth, kiosk and truck that carries it
  NAMES.forEach((name) => {
    const mat = signMaterial(name, BRANDS[name][1]);
    bulk(root, booths.filter((b) => b.name === name), [{ geo: new THREE.PlaneGeometry(1.5, 0.375), mat, at: [signs[name]] }]);
    bulk(root, trucks.filter((t) => t.name === name), [{ geo: new THREE.PlaneGeometry(1.7, 0.425), mat, at: [L(-0.15, 1.3, 0.1)] }]);
  });

  /* ---------- light: lamp posts, string lights along every row and across the aisle, pools of warm light ---------- */
  const lamps = [];
  for (let z = -9.4; z <= 9.5; z += 4.72) { lamps.push([13.35, z], [-13.35, z]); }
  for (let x = -3.8; x <= 12; x += 4.72) { lamps.push([x, 12.35], [x, -12.35]); }
  lamps.push([-13, -12], [13, -12], [13, 12], [-13, 12], [21.9, 20.8], [-21.9, 20.8], [21.9, -20.8], [-21.9, -20.8]);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5, 6).translate(0, 0.75, 0), std('#2a2430', { metalness: 0.5, roughness: 0.4 }), lamps.length);
  const globes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), glowMat('#fff2d4'), lamps.length);
  lamps.forEach(([x, z], i) => { place(poles, i, x, G, z, 1); place(globes, i, x, G + 1.55, z, 1); });
  root.add(poles, globes);
  const bulbs = [];
  const strand = (ax, ay, az, bx, by, bz, n, sag) => { for (let k = 0; k < n; k++) { const t = k / n; bulbs.push([ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * sag, az + (bz - az) * t]); } };
  const rowsOf = (side, ring) => booths.filter((b) => b.side === side && b.ring === ring);
  ['e', 'w', 's', 'n'].forEach((side) => [0, 1].forEach((ring) => {
    const row = rowsOf(side, ring);
    for (let r = 0; r < row.length - 1; r++) { // along the front of the row, dipping between booths
      const a = row[r], b = row[r + 1], fx = Math.sin(a.yaw) * 0.6, fz = Math.cos(a.yaw) * 0.6;
      strand(a.x + fx, G + 1.36, a.z + fz, b.x + fx, G + 1.36, b.z + fz, 6, 0.16);
    }
    if (ring === 1) row.forEach((b, r) => { // across the aisle, from every other outer booth to the inner row behind it
      if (r % 2) return;
      const inner = rowsOf(side, 0).reduce((best, x) => (Math.hypot(x.x - b.x, x.z - b.z) < Math.hypot(best.x - b.x, best.z - b.z) ? x : best));
      strand(b.x + Math.sin(b.yaw) * 0.6, G + 1.5, b.z + Math.cos(b.yaw) * 0.6, inner.x - Math.sin(inner.yaw) * 0.35, G + 1.5, inner.z - Math.cos(inner.yaw) * 0.35, 10, 0.35);
    });
  }));
  const fairy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), glowMat('#ffffff'), bulbs.length);
  const fairyCol = ['#ffe2a8', '#ff8fb8', '#fff6e0', '#ffd0e2'];
  bulbs.forEach(([x, y, z], i) => { place(fairy, i, x, y, z, 1); fairy.setColorAt(i, c.set(fairyCol[i % 4])); });
  root.add(fairy);
  // a pool lies a clear step above the top paving layer (no depth nudging: a nudge strong enough to win against the
  // paving could also push the glow through the walls and carts standing on it)
  const poolMaterial = (opacity) => new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const pools = [
    ...lamps.map(([x, z]) => [x, z, 2.4, WARM]),
    ...booths.map((b) => [b.x + Math.sin(b.yaw) * 0.9, b.z + Math.cos(b.yaw) * 0.9, 1.7, b.name === 'Photo Booth' ? '#ff8fc8' : WARM]),
    ...trucks.map((t) => [t.x + Math.sin(t.yaw) * 1.0, t.z + Math.cos(t.yaw) * 1.0, 1.9, WARM]),
    ...carts.map((t) => [t.x + Math.sin(t.yaw) * 0.6, t.z + Math.cos(t.yaw) * 0.6, 1.3, WARM]),
  ];
  const poolMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    poolMaterial(0.2), pools.length);
  pools.forEach(([x, z, s, col], i) => { place(poolMesh, i, x, G + 0.09, z, s * 2, 1); poolMesh.setColorAt(i, c.set(col)); });
  poolMesh.renderOrder = 1;
  root.add(poolMesh);

  /* ---------- around the jogging loop: benches; at the square's corners: flower beds ---------- */
  const benchSpots = range(10).map((i) => { const a = (i / 10) * Math.PI * 2 + 0.4, r = LOOP[0] - 1.6; return [Math.cos(a) * r, Math.sin(a) * r * LOOP[1], Math.atan2(-Math.cos(a), -Math.sin(a) * LOOP[1])]; });
  const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.06, 0.28), std('#8a6446'), benchSpots.length);
  benchSpots.forEach(([x, z, yaw], i) => place(seats, i, x, G + 0.2, z, 1, 1, yaw));
  const bloomCols = ['#ff3d8b', '#ffffff', '#ff8fb8', '#fff0aa', '#ddcffb'];
  const beds = [[-14.6, -13.6], [14.6, -13.6], [14.6, 13.6], [-14.6, 13.6]];
  const blooms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 0), std('#ffffff', { flatShading: true }), beds.length * 14);
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 1), std('#2b4a37', { flatShading: true }), beds.length);
  beds.forEach(([x, z], b) => {
    place(leaves, b, x, G + 0.12, z, 1, 0.45);
    for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, r = rnd() * 0.5; place(blooms, b * 14 + k, x + Math.cos(a) * r, G + 0.26 + rnd() * 0.08, z + Math.sin(a) * r, 1); blooms.setColorAt(b * 14 + k, c.set(bloomCols[(b + k) % 5])); }
  });
  root.add(seats, blooms, leaves);

  /* ---------- the park's highlights: a Ferris wheel, a fountain, a glowing heart, flower gardens, bollards ---------- */
  // the Ferris wheel: a lit rim and spokes turning slowly, cabins that stay upright, bulbs that chase round the rim
  const wheel = new THREE.Group();
  wheel.position.set(WHEEL[0], G + 11, WHEEL[1]);
  wheel.userData.pick = 'wheel';
  root.add(wheel);
  const spin = new THREE.Group();
  wheel.add(spin);
  const R = 9;
  spin.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.14, 8, 96), glowMat('#ff8fc8')), new THREE.Mesh(new THREE.TorusGeometry(R - 0.7, 0.07, 6, 96), glowMat('#ffe2a8')));
  const spokes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, R * 2, 0.06), glowMat('#fff6e0'), 8);
  range(8).forEach((i) => { q.setFromEuler(e.set(0, 0, (i / 8) * Math.PI)); m4.compose(v3.set(0, 0, 0), q, s3.set(1, 1, 1)); spokes.setMatrixAt(i, m4); });
  spin.add(spokes, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 16).rotateX(Math.PI / 2), std('#e6c47e', { metalness: 0.6, roughness: 0.3 })));
  const nBulbs = 64;
  const rimBulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 4), glowMat('#ffffff'), nBulbs);
  range(nBulbs).forEach((i) => { const a = (i / nBulbs) * Math.PI * 2; place(rimBulbs, i, Math.cos(a) * (R + 0.05), Math.sin(a) * (R + 0.05), 0.18, 1); });
  spin.add(rimBulbs);
  const legGeo = new THREE.CylinderGeometry(0.16, 0.22, 1, 8).translate(0, -0.5, 0);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => { const leg = new THREE.Mesh(legGeo, std('#3a3046', { metalness: 0.5, roughness: 0.5 })); leg.scale.y = 11.4; leg.rotation.set(sz * 0.12, 0, sx * 0.32); leg.position.set(0, 0, sz * 0.9); wheel.add(leg); });
  const cabins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), std('#ffffff', { roughness: 0.5, emissive: '#3a1a2a', emissiveIntensity: 0.6 }), 16);
  range(16).forEach((i) => cabins.setColorAt(i, c.set(['#ff8fb8', '#c7efdf', '#ddcffb', '#fff0aa'][i % 4])));
  wheel.add(cabins);
  const bulbCol = ['#ff8fc8', '#fff2c4', '#c7e8ff', '#ffd0e2'];
  // the fountain: a stone basin, glowing water, three tiers, jets rising and falling
  const fountain = new THREE.Group();
  fountain.position.set(FOUNTAIN[0], G, FOUNTAIN[1]);
  fountain.userData.pick = 'fountain';
  root.add(fountain);
  const stoneMat = std('#b8aec0', { roughness: 0.6 });
  fountain.add(new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.2, 10, 48).rotateX(Math.PI / 2).translate(0, 0.2, 0), stoneMat));
  fountain.add(new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.06, 48).translate(0, 0.22, 0), new THREE.MeshStandardMaterial({ color: '#3a7bd5', emissive: '#2a6fd6', emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.2 })));
  [[0.35, 1.0, 0.25], [0.9, 0.12, 1.0], [0.18, 0.5, 1.5], [0.5, 0.08, 1.75]].forEach(([r, h, y]) => fountain.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 24).translate(0, y + h / 2 - 0.25, 0), stoneMat)));
  const drops = 140;
  const jetPos = new Float32Array(drops * 3);
  const jetGeo = new THREE.BufferGeometry(); jetGeo.setAttribute('position', new THREE.BufferAttribute(jetPos, 3));
  const jets = new THREE.Points(jetGeo, new THREE.PointsMaterial({ color: '#bfe2ff', size: 0.16, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  jets.position.copy(fountain.position); jets.frustumCulled = false;
  root.add(jets);
  const dropState = range(drops).map(() => ({ t: rnd(), a: rnd() * Math.PI * 2, v: 0.5 + rnd() * 0.5, top: rnd() < 0.35 }));
  // the glowing heart, standing by the fountain
  const hs = new THREE.Shape(), k = 1.25;
  hs.moveTo(0, -k); hs.bezierCurveTo(-k * 1.6, -k * 0.2, -k * 0.9, k * 1.1, 0, k * 0.45); hs.bezierCurveTo(k * 0.9, k * 1.1, k * 1.6, -k * 0.2, 0, -k);
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 20 }).center(),
    new THREE.MeshStandardMaterial({ color: '#ff5c9d', emissive: '#ff3d8b', emissiveIntensity: 0.9, roughness: 0.4 }));
  heart.position.set(HEART[0], G + 1.55, HEART[1]); heart.rotation.y = 0.35;
  heart.userData.pick = 'heart';
  root.add(heart, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 16).translate(HEART[0], G + 0.15, HEART[1]), stoneMat));
  // flower gardens: low mounds covered in blooms
  const gBlooms = coarse ? 50 : 90;
  const garden = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), std('#ffffff', { flatShading: true, roughness: 0.7 }), GARDENS.length * gBlooms);
  const mounds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#2f5a3e', { roughness: 0.9 }), GARDENS.length);
  GARDENS.forEach(([x, z], gi) => {
    place(mounds, gi, x, G, z, 3.2, 0.45);
    range(gBlooms).forEach((b) => {
      const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 3.0, y = G + 0.45 * Math.sqrt(Math.max(0, 1 - (r / 3.2) ** 2)) + 0.08; // on the mound's surface
      place(garden, gi * gBlooms + b, x + Math.cos(a) * r, y, z + Math.sin(a) * r, 0.8 + rnd() * 0.6);
      garden.setColorAt(gi * gBlooms + b, c.set(['#ff3d8b', '#ffffff', '#ff8fb8', '#fff0aa', '#ddcffb', '#ffb36b'][(gi + b) % 6]));
    });
  });
  root.add(mounds, garden);
  // bollards: little lights along the jogging loop and the paths in and out
  const bolls = [];
  const nLoop = coarse ? 40 : 78;
  range(nLoop).forEach((i) => { const a = (i / nLoop) * Math.PI * 2; bolls.push([Math.cos(a) * (LOOP[0] + 0.95), Math.sin(a) * (LOOP[0] + 0.95) * LOOP[1]]); });
  for (let z = 23; z <= 80; z += coarse ? 6 : 3) [-1, 1].forEach((sz) => [-10.5, -7.3].forEach((x) => bolls.push([x, sz * z])));
  const bollPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 0.36, 6).translate(0, 0.18, 0), std('#2a2430', { metalness: 0.4 }), bolls.length);
  const bollCaps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), glowMat('#ffe7b8'), bolls.length);
  bolls.forEach(([x, z], i) => { place(bollPosts, i, x, G, z, 1); place(bollCaps, i, x, G + 0.4, z, 1); });
  root.add(bollPosts, bollCaps);
  // more pools of light: round the fountain, the heart and the wheel's feet
  const extraPools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    poolMaterial(0.45), 3);
  [[...FOUNTAIN, 9, '#7ab8ff'], [...HEART, 6, '#ff5c9d'], [...WHEEL, 22, '#ff8fc8']].forEach(([x, z, s, col], i) => { place(extraPools, i, x, G + 0.09, z, s, 1); extraPools.setColorAt(i, c.set(col)); });
  extraPools.renderOrder = 1;
  root.add(extraPools);

  /* ---------- visitors: strolling the promenade and the market aisle, jogging the loop, shopping ---------- */
  const strollers = coarse ? 18 : 40, joggers = coarse ? 2 : 6;
  const vendors = [...booths, ...trucks, ...carts];
  const shoppers = vendors.filter((_, k) => !coarse || k % 2 === 0).flatMap((vd, k) => [0, 1].slice(0, k % 3 === 2 ? 2 : 1).map((j) => {
    const side = (j - 0.5) * 0.6 * (k % 3 === 2 ? 1 : 0), out = 0.95 + (j % 2) * 0.2;
    return { x: vd.x + Math.sin(vd.yaw) * out + Math.cos(vd.yaw) * side, z: vd.z + Math.cos(vd.yaw) * out - Math.sin(vd.yaw) * side, yaw: vd.yaw + Math.PI, ph: k + j };
  }));
  const count = strollers + joggers + shoppers.length;
  const bodyGeo = new THREE.CylinderGeometry(0.07, 0.13, 0.42, 10).translate(0, 0.21, 0);
  const bodies = new THREE.InstancedMesh(bodyGeo, std('#ffffff'), count);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), std('#ffffff', { roughness: 0.55 }), count);
  bodies.frustumCulled = heads.frustumCulled = false;
  bodies.userData.pick = 'person';
  bodies.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60); // they move: a click must still find them
  for (let i = 0; i < count; i++) { bodies.setColorAt(i, c.set(OUTFITS[(i * 5) % OUTFITS.length])); heads.setColorAt(i, c.set(SKIN[i % SKIN.length])); }
  root.add(bodies, heads);
  // two walking loops, both rounded rectangles walked anticlockwise: the promenade, and the aisle between the rows
  const LOOPS = [[12.75, 11.75], [17.9, 17.0]]; // (the promenade walk keeps clear of the carts' customers)
  const onLoop = (s, [lx, lz], out) => {
    const per = 4 * (lx + lz);
    s = ((s % per) + per) % per;
    if (s < 2 * lx) return out.set(-lx + s, -lz, Math.PI / 2);
    s -= 2 * lx; if (s < 2 * lz) return out.set(lx, -lz + s, 0);
    s -= 2 * lz; if (s < 2 * lx) return out.set(lx - s, lz, -Math.PI / 2);
    s -= 2 * lx; return out.set(-lx, lz - s, Math.PI);
  };
  const walkers = range(strollers + joggers).map((i) => ({ loop: LOOPS[i % 2], s: rnd() * 140, speed: i < strollers ? 0.35 + rnd() * 0.25 : 1.3 + rnd() * 0.3, lane: (rnd() - 0.5) * 0.8, ph: rnd() * 6, jog: i >= strollers, a: rnd() * 6.28 }));
  const p3 = new THREE.Vector3(), hp = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const hopAt = new Float32Array(count).fill(-9); // when each visitor was clicked: a happy little hop
  let now = 0, wheelBoost = 0, fountainBoost = 0, turn = 0, chaseA = 0;
  const put = (i, x, z, yaw, bob) => {
    const h = now - hopAt[i];
    if (h < 0.9) bob += Math.abs(Math.sin(h * Math.PI / 0.45)) * 0.32 * (1 - h / 0.9);
    q.setFromEuler(e.set(0, yaw, 0));
    m4.compose(v3.set(x, G + bob, z), q, one); bodies.setMatrixAt(i, m4);
    m4.compose(hp.set(x, G + bob + 0.5, z), q, one); heads.setMatrixAt(i, m4);
  };
  const step = (dt, t) => {
    now = t;
    wheelBoost = Math.max(0, wheelBoost - dt * 0.25); fountainBoost = Math.max(0, fountainBoost - dt * 0.3);
    walkers.forEach((w, i) => {
      if (w.jog) { // joggers run the loop round the lawns
        w.a += dt * w.speed / LOOP[0];
        const x = Math.cos(w.a) * (LOOP[0] + w.lane), z = Math.sin(w.a) * (LOOP[0] + w.lane) * LOOP[1];
        put(i, x, z, Math.atan2(-Math.sin(w.a), Math.cos(w.a) * LOOP[1]), Math.abs(Math.sin(t * 11 + w.ph)) * 0.05);
        return;
      }
      w.s += dt * w.speed;
      onLoop(w.s, w.loop, p3);
      const alongZ = p3.z === 0 || p3.z === Math.PI;
      put(i, p3.x + (alongZ ? w.lane : 0), p3.y + (alongZ ? 0 : w.lane), p3.z, Math.abs(Math.sin(t * 7 + w.ph)) * 0.022);
    });
    shoppers.forEach((s, k) => put(strollers + joggers + k, s.x, s.z, s.yaw + Math.sin(t * 0.5 + s.ph) * 0.25, 0));
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    fairy.material.color.setScalar(0.85 + Math.sin(t * 2.2) * 0.15); // the string lights shimmer a little
    turn += dt * (0.06 + wheelBoost * 0.9);                          // the wheel turns slowly (fast for a while when clicked); cabins hang upright
    const turnA = turn;
    spin.rotation.z = turnA;
    range(16).forEach((i) => { const a = turnA + (i / 16) * Math.PI * 2; m4.makeTranslation(Math.cos(a) * R, Math.sin(a) * R - 0.55, 0.55); cabins.setMatrixAt(i, m4); });
    cabins.instanceMatrix.needsUpdate = true;
    chaseA += dt * (6 + wheelBoost * 30);
    const chase = Math.floor(chaseA);
    for (let i = 0; i < nBulbs; i++) rimBulbs.setColorAt(i, c.set(bulbCol[(i + chase) % 4]));
    rimBulbs.instanceColor.needsUpdate = true;
    dropState.forEach((d, i) => { // the jets: up and out, then down into the basin
      d.t = (d.t + dt * d.v * (1 + fountainBoost)) % 1;
      const lift = 1 + fountainBoost * 1.2;                         // clicked: the jets leap
      const r = d.top ? d.t * 0.5 : 0.35 + d.t * 1.4 * (1 + fountainBoost * 0.4), y = d.top ? 1.85 + Math.sin(d.t * Math.PI) * 1.1 * lift : 1.0 + Math.sin(d.t * Math.PI) * 0.9 * lift - d.t * 0.75;
      jetPos[i * 3] = Math.cos(d.a) * r; jetPos[i * 3 + 1] = y; jetPos[i * 3 + 2] = Math.sin(d.a) * r;
    });
    jetGeo.attributes.position.needsUpdate = true;
  };
  step(0, 0);

  /* ---------- clicks: everything here answers. pick = what a click can hit; react(hit) → what to show ---------- */
  const SELLS = { // what pops out of a vendor when it is clicked
    'Beauty Corner': ['drop', 'sparkle'], 'Boba & Coffee': ['cup'], 'Accessories Shop': ['gift', 'sparkle'], 'Flower Bar': ['heart'],
    'DIY Station': ['star', 'sparkle'], 'Fashion Pop-Up': ['bag'], 'Sweet Spot': ['gift', 'heart'], 'Photo Booth': ['camera', 'star'],
  };
  const pick = [];
  root.traverse((o) => { if (o.userData.pick && o !== root) pick.push(o); });
  const react = (hit) => {
    let o = hit.object;
    while (o && !o.userData.pick) o = o.parent;
    const tag = o?.userData.pick;
    if (!tag) return null;
    if (tag === 'wheel') { wheelBoost = 1; return { kind: 'wheel', icons: ['star', 'sparkle', 'heart'], n: 8 }; }
    if (tag === 'fountain') { fountainBoost = 1; return { kind: 'fountain', icons: ['sparkle', 'drop'], n: 7 }; }
    if (tag === 'heart') return { kind: 'heart', icons: ['heart'], n: 10 };
    if (tag === 'person') { if (hit.instanceId != null) hopAt[hit.instanceId] = now; return { kind: 'person', icons: ['heart', 'sparkle'], n: 4 }; }
    const item = tag.items?.[Math.floor(hit.instanceId / tag.per)];
    if (!item?.name) return null;
    return { kind: 'vendor', label: item.name, icons: SELLS[item.name] || ['heart'], n: 6, at: new THREE.Vector3(item.x, G + 1.9, item.z) };
  };
  return { root, step, sky: NIGHT, pick, react };
}
