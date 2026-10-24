// PinkOut Partners — the setting around the venue: a park at night. A paved promenade runs round the building, lined on
// all four sides with vendor booths (Beauty Corner, Boba & Coffee, Accessories Shop, Flower Bar, DIY Station, Fashion
// Pop-Up, Sweet Spot, Photo Booth: every name keeps its own colours and sign, like a chain), food trucks line the paths
// in (north) and out (south), a jogging loop circles the lawns, with palms and shade trees. Night: a deep sky with a moon
// and stars, dark lawns, and warm light where people are (lamp posts with pools of light, string lights along the booth
// rows, lit canopies and truck windows), so the venue glows in the middle. Visitors stroll, jog and shop.
// It is background: everything repeated is drawn in bulk (one draw per part, not per booth), nothing casts shadows
// (the lawn and promenade only receive the building's), fewer trees and people on phones.
// Scene units: the building plinth is 20.5 × 18.5, centred on the origin; the ground sits at y = -0.3.
import * as THREE from './vendor/three.module.min.js?v=1';

const G = -0.3;                     // ground level
const PLAZA = [13.6, 12.6];         // half sizes of the promenade round the building
const NIGHT = '#141b36';            // the sky (and the haze over the far lawns)
const OUTFITS = ['#ff3d8b', '#2b1220', '#ffffff', '#ff8fb8', '#ddcffb', '#3a4a63', '#fff0aa', '#c7efdf', '#df004c', '#ffd9c2', '#2b1220', '#9fd0ff'];
const SKIN = ['#f1c7a8', '#d9a37f', '#b97f5c', '#e8b896', '#2b1220'];
const WARM = '#ffd9a0';

/* every vendor name keeps its colours: [body, accent] */
const BRANDS = {
  'Beauty Corner': ['#ffb3cf', '#ff3d8b'], 'Boba & Coffee': ['#c7efdf', '#2f8f83'], 'Accessories Shop': ['#ddcffb', '#7a5bd0'],
  'Flower Bar': ['#ffd9e6', '#df004c'], 'DIY Station': ['#fff0aa', '#e2ad3b'], 'Fashion Pop-Up': ['#ffd9c2', '#ec7b44'],
  'Sweet Spot': ['#ff8fb8', '#c2185b'], 'Photo Booth': ['#3a2440', '#ff3d8b'],
};
const NAMES = Object.keys(BRANDS);

/* where the vendors stand: rows along the four sides of the promenade (facing it), trucks along the paths */
function layout() {
  const rows = [];
  const row = (from, to, step, at, yaw, offset) => { for (let i = 0, v = from; v <= to + 0.01; v += step, i++) rows.push({ i: i + offset, yaw, ...at(v) }); };
  row(-10.6, 10.6, 2.36, (z) => ({ x: 15.5, z }), -Math.PI / 2, 0);   // east, facing west
  row(-10.6, 10.6, 2.36, (z) => ({ x: -15.5, z }), Math.PI / 2, 3);   // west, facing east
  row(-5.0, 11.6, 2.36, (x) => ({ x, z: 14.5 }), Math.PI, 5);         // south, facing north (the exit path stays clear)
  row(-5.0, 11.6, 2.36, (x) => ({ x, z: -14.5 }), 0, 1);              // north, facing south (the entrance path stays clear)
  const booths = rows.map((r) => ({ ...r, name: NAMES[r.i % NAMES.length] }));
  const trucks = [];
  [-1, 1].forEach((side) => [18.8, 21.6, 34].forEach((d, k) => [-1, 1].forEach((sz) => trucks.push({
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
/** a rounded rectangle lying flat, centred on the origin (scene units) */
function roundRect(hw, hd, r) {
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r); s.lineTo(hw, hd - r); s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - r); s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  const g = new THREE.ShapeGeometry(s, 8);
  g.rotateX(-Math.PI / 2);
  return g;
}
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
    root.add(im);
  });
}

export function buildPark(scene, { coarse = false, venue } = {}) {
  seed = 7;
  const root = new THREE.Group();
  scene.add(root);
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.Fog(NIGHT, 46, 120); // the far lawns fade into the night: no edge to the world
  venue?.root.traverse((o) => { if (o.material?.isShadowMaterial) o.visible = false; }); // the lawn takes the building's shadow now
  const glowTex = dot();
  const { booths, trucks } = layout();
  booths.forEach((b) => { b.matrix = at(b.x, b.z, b.yaw); [b.colour, b.accent] = BRANDS[b.name]; });
  trucks.forEach((t) => { t.matrix = at(t.x, t.z, t.yaw); [t.colour, t.accent] = BRANDS[t.name]; });
  const isKiosk = (b) => b.name === 'Photo Booth';
  const stalls = booths.filter((b) => !isKiosk(b)), kiosks = booths.filter(isKiosk);

  /* ---------- night sky: a moon and stars (only seen when the camera looks out) ---------- */
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff4d6', fog: false }));
  moon.position.set(-62, 34, -88); root.add(moon);
  const starPos = new Float32Array(360 * 3);
  for (let i = 0; i < 360; i++) { const a = rnd() * Math.PI * 2, h = 0.08 + rnd() * 0.9, r = 112; starPos.set([Math.cos(a) * r * Math.cos(h), Math.sin(h) * r, Math.sin(a) * r * Math.cos(h)], i * 3); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  root.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));

  /* ---------- ground: lawns, the promenade, paths in and out, a jogging loop ---------- */
  const grass = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#2f4a3c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = ['#2a4436', '#35523f', '#283f33', '#3a5844'][i % 4]; g.fillRect(rnd() * w, rnd() * h, 2, 3); }
  }, 60);
  root.add(flat(new THREE.CircleGeometry(150, 64).rotateX(-Math.PI / 2), std('#ffffff', { map: grass, roughness: 0.95 }), G));
  const paving = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#6c6478'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(30,24,40,0.35)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    for (let j = 0; j < 4; j++) for (let i = 0; i <= 4; i++) { const x = i * 64 + (j % 2) * 32; g.beginPath(); g.moveTo(x, j * 64); g.lineTo(x, j * 64 + 64); g.stroke(); }
  }, 14);
  root.add(flat(roundRect(PLAZA[0], PLAZA[1], 2.2), std('#ffffff', { map: paving, roughness: 0.85 }), G + 0.012));
  root.add(flat(roundRect(PLAZA[0] + 0.25, PLAZA[1] + 0.25, 2.4), std('#8a7464', { roughness: 0.8 }), G + 0.006)); // a warm kerb
  const gravel = std('#5a5266', { roughness: 0.95 });
  [-36, 36].forEach((z) => { const p = flat(new THREE.PlaneGeometry(2.4, 47).rotateX(-Math.PI / 2), gravel, G + 0.01); p.position.set(-8.9, G + 0.01, z); root.add(p); });
  const loop = flat(new THREE.RingGeometry(29.3, 30.5, 120).rotateX(-Math.PI / 2), gravel, G + 0.008); loop.scale.z = 0.88; root.add(loop);

  /* ---------- trees: palms and round shade trees over the lawns ---------- */
  const spotsTree = [];
  const nTrees = coarse ? 40 : 80;
  for (let tries = 0; spotsTree.length < nTrees && tries < 2500; tries++) {
    const a = rnd() * Math.PI * 2, r = 21 + rnd() * 36, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
    if (Math.abs(x + 8.9) < 5 && Math.abs(z) > 12) continue;                          // keep the paths and their trucks clear
    if (Math.abs(Math.hypot(x / 29.9, z / (29.9 * 0.88)) - 1) < 0.05) continue;       // and the jogging loop
    if (spotsTree.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2.4)) continue;
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
  const crownCol = ['#2b4a37', '#33553f', '#284432', '#3a5c45'], c = new THREE.Color();
  round.forEach(([x, z, s], i) => { place(roundTrunks, i, x, G, z, s, s * 1.0); place(crowns, i, x, G + 1.35 * s, z, s * 1.1, s * 0.95, rnd() * 3); crowns.setColorAt(i, c.set(crownCol[i % 4])); });
  root.add(palmTrunks, fronds, roundTrunks, crowns);

  /* ---------- the booths, in bulk (local: +z is the customers' side) ---------- */
  const white = std('#ffffff', { roughness: 0.5 });
  const tint = std('#ffffff', { roughness: 0.6 });
  bulk(root, stalls, [
    { geo: new THREE.BoxGeometry(1.5, 0.42, 0.55), mat: tint, at: [L(0, 0.21, 0.12)], color: (b) => b.colour },          // counter
    { geo: new THREE.BoxGeometry(1.56, 0.04, 0.62), mat: white, at: [L(0, 0.44, 0.12)] },                                    // counter top
    { geo: new THREE.BoxGeometry(1.5, 1.0, 0.06), mat: tint, at: [L(0, 0.5, -0.32)], color: (b) => b.colour },             // back wall
    { geo: new THREE.CylinderGeometry(0.025, 0.025, 1.12, 6), mat: white, at: [L(-0.72, 0.56, 0.4), L(0.72, 0.56, 0.4), L(-0.72, 0.56, -0.32), L(0.72, 0.56, -0.32)] },
    { geo: new THREE.BoxGeometry(0.27, 0.03, 0.86), mat: tint, at: [0, 1, 2, 3, 4, 5].map((i) => L(-0.675 + i * 0.27, 1.14, 0.06, 0.22)), color: (b, k) => (k % 2 ? '#ffffff' : b.accent) }, // striped canopy
    { geo: new THREE.BoxGeometry(0.11, 0.1, 0.11), mat: tint, at: [0, 1, 2, 3, 4, 5].map((i) => L(-0.55 + i * 0.22, 0.51 + (i % 3) * 0.02, 0.12, 0, 0, 0, 1, 0.8 + (i % 3) * 0.4)), color: (b, k) => ['#ffffff', b.accent, '#fff0aa', b.colour][k % 4] }, // goods
    { geo: new THREE.BoxGeometry(1.36, 0.035, 0.05), mat: glowMat('#ffe7b8'), at: [L(0, 1.0, 0.42)] },                     // the light under the canopy
  ]);
  bulk(root, kiosks, [
    { geo: new THREE.BoxGeometry(1.0, 1.1, 0.8), mat: tint, at: [L(0, 0.55, -0.1)], color: (b) => b.colour },
    { geo: new THREE.BoxGeometry(0.5, 0.75, 0.03), mat: tint, at: [L(0.18, 0.5, 0.31)], color: (b) => b.accent },          // curtain
    { geo: new THREE.TorusGeometry(0.16, 0.025, 8, 24), mat: glowMat('#ffffff'), at: [L(-0.22, 0.75, 0.32)] },            // ring light
    { geo: new THREE.BoxGeometry(1.05, 0.1, 0.85), mat: tint, at: [L(0, 1.12, -0.1)], color: (b) => b.accent },
    { geo: new THREE.SphereGeometry(0.03, 6, 4), mat: glowMat('#fff1c4'), at: [0, 1, 2, 3, 4, 5, 6].map((i) => L(-0.45 + i * 0.15, 1.12, 0.33)) }, // marquee bulbs
  ]);
  bulk(root, trucks, [
    { geo: new THREE.BoxGeometry(1.7, 0.85, 0.85), mat: std('#ffffff', { roughness: 0.45 }), at: [L(-0.15, 0.62, 0)], color: (t) => t.colour },
    { geo: new THREE.BoxGeometry(0.55, 0.62, 0.82), mat: std('#ffffff', { roughness: 0.45 }), at: [L(0.95, 0.5, 0)], color: (t) => t.colour },
    { geo: new THREE.BoxGeometry(0.04, 0.28, 0.7), mat: std('#3a4a63', { roughness: 0.15, metalness: 0.3 }), at: [L(1.23, 0.62, 0)] },
    { geo: new THREE.BoxGeometry(1.0, 0.36, 0.04), mat: glowMat('#ffd9a0'), at: [L(-0.2, 0.72, 0.43)] },                   // the lit serving window
    { geo: new THREE.BoxGeometry(1.05, 0.04, 0.16), mat: white, at: [L(-0.2, 0.54, 0.5)] },
    { geo: new THREE.BoxGeometry(0.24, 0.02, 0.42), mat: tint, at: [0, 1, 2, 3, 4].map((i) => L(-0.68 + i * 0.24, 1.0, 0.6, 0.35)), color: (t, k) => (k % 2 ? '#ffffff' : t.accent) },
    { geo: new THREE.BoxGeometry(1.72, 0.08, 0.87), mat: tint, at: [L(-0.15, 0.3, 0)], color: (t) => t.accent },
    { geo: new THREE.CylinderGeometry(0.14, 0.14, 0.08, 14), mat: std('#2b2b30'), at: [[-0.65, 0.43], [-0.65, -0.43], [0.9, 0.43], [0.9, -0.43]].map(([x, z]) => L(x, 0.14, z, Math.PI / 2)) },
  ]);
  // signs: one bulk draw per name, on every booth, kiosk and truck that carries it
  NAMES.forEach((name) => {
    const mat = signMaterial(name, BRANDS[name][1]);
    bulk(root, booths.filter((b) => b.name === name), [{ geo: new THREE.PlaneGeometry(1.5, 0.375), mat, at: [L(0, 1.42, 0.42)] }]);
    bulk(root, trucks.filter((t) => t.name === name), [{ geo: new THREE.PlaneGeometry(1.7, 0.425), mat, at: [L(-0.15, 1.3, 0.1)] }]);
  });

  /* ---------- light: lamp posts, string lights along the rows, pools of warm light on the ground ---------- */
  const lamps = [];
  for (let z = -9.4; z <= 9.5; z += 4.72) { lamps.push([13.35, z], [-13.35, z]); }
  for (let x = -3.8; x <= 12; x += 4.72) { lamps.push([x, 12.35], [x, -12.35]); }
  lamps.push([-13, -12], [13, -12], [13, 12], [-13, 12]);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5, 6).translate(0, 0.75, 0), std('#2a2430', { metalness: 0.5, roughness: 0.4 }), lamps.length);
  const globes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), glowMat('#fff2d4'), lamps.length);
  lamps.forEach(([x, z], i) => { place(poles, i, x, G, z, 1); place(globes, i, x, G + 1.55, z, 1); });
  root.add(poles, globes);
  // string lights: along the front of every row, dipping between the booths
  const bulbs = [];
  const rowsOf = (pred) => booths.filter(pred);
  [rowsOf((b) => b.x > 15), rowsOf((b) => b.x < -15), rowsOf((b) => b.z > 14), rowsOf((b) => b.z < -14)].forEach((row) => {
    for (let r = 0; r < row.length - 1; r++) {
      const a = row[r], b = row[r + 1], fx = Math.sin(a.yaw) * 0.55, fz = Math.cos(a.yaw) * 0.55;
      for (let k = 0; k < 6; k++) { const t = k / 6; bulbs.push([a.x + (b.x - a.x) * t + fx, G + 1.32 - Math.sin(t * Math.PI) * 0.16, a.z + (b.z - a.z) * t + fz]); }
    }
  });
  const fairy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), glowMat('#ffffff'), bulbs.length);
  const fairyCol = ['#ffe2a8', '#ff8fb8', '#fff6e0', '#ffd0e2'];
  bulbs.forEach(([x, y, z], i) => { place(fairy, i, x, y, z, 1); fairy.setColorAt(i, c.set(fairyCol[i % 4])); });
  root.add(fairy);
  // pools of light on the ground (additive): under every lamp, in front of every vendor
  const pools = [
    ...lamps.map(([x, z]) => [x, z, 2.4, WARM]),
    ...booths.map((b) => [b.x + Math.sin(b.yaw) * 0.9, b.z + Math.cos(b.yaw) * 0.9, 1.7, b.name === 'Photo Booth' ? '#ff8fc8' : WARM]),
    ...trucks.map((t) => [t.x + Math.sin(t.yaw) * 1.0, t.z + Math.cos(t.yaw) * 1.0, 1.9, WARM]),
  ];
  const poolMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending }), pools.length);
  pools.forEach(([x, z, s, col], i) => { place(poolMesh, i, x, G + 0.02, z, s * 2, 1); poolMesh.setColorAt(i, c.set(col)); });
  poolMesh.renderOrder = 1;
  root.add(poolMesh);

  /* ---------- around the jogging loop: benches and flower beds ---------- */
  const benchSpots = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.4; return [Math.cos(a) * 28.2, Math.sin(a) * 28.2 * 0.88, Math.atan2(-Math.cos(a), -Math.sin(a) * 0.88)]; });
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

  /* ---------- visitors: strolling the promenade, jogging the loop, shopping at the vendors ---------- */
  const strollers = coarse ? 14 : 30, joggers = coarse ? 2 : 5;
  const vendors = [...booths, ...trucks];
  const shoppers = vendors.filter((_, k) => !coarse || k % 2 === 0).flatMap((vd, k) => [0, 1].slice(0, k % 3 === 2 ? 1 : 2).map((j) => {
    const side = (j - 0.5) * 0.6, out = 0.95 + (j % 2) * 0.2;
    return { x: vd.x + Math.sin(vd.yaw) * out + Math.cos(vd.yaw) * side, z: vd.z + Math.cos(vd.yaw) * out - Math.sin(vd.yaw) * side, yaw: vd.yaw + Math.PI, ph: k + j };
  }));
  const count = strollers + joggers + shoppers.length;
  const bodyGeo = new THREE.CylinderGeometry(0.07, 0.13, 0.42, 10).translate(0, 0.21, 0);
  const bodies = new THREE.InstancedMesh(bodyGeo, std('#ffffff'), count);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), std('#ffffff', { roughness: 0.55 }), count);
  bodies.frustumCulled = heads.frustumCulled = false;
  for (let i = 0; i < count; i++) { bodies.setColorAt(i, c.set(OUTFITS[(i * 5) % OUTFITS.length])); heads.setColorAt(i, c.set(SKIN[i % SKIN.length])); }
  root.add(bodies, heads);
  // the promenade loop: a rounded rectangle between the building and the booths, walked anticlockwise
  const LX = 12.1, LZ = 11.1, per = 4 * (LX + LZ);
  const onLoop = (s, out) => {
    s = ((s % per) + per) % per;
    if (s < 2 * LX) return out.set(-LX + s, -LZ, Math.PI / 2);
    s -= 2 * LX; if (s < 2 * LZ) return out.set(LX, -LZ + s, 0);
    s -= 2 * LZ; if (s < 2 * LX) return out.set(LX - s, LZ, -Math.PI / 2);
    s -= 2 * LX; return out.set(-LX, LZ - s, Math.PI);
  };
  const walkers = Array.from({ length: strollers + joggers }, (_, i) => ({ s: rnd() * per, speed: i < strollers ? 0.35 + rnd() * 0.25 : 1.3 + rnd() * 0.3, lane: (rnd() - 0.5) * 0.8, ph: rnd() * 6, jog: i >= strollers, a: rnd() * 6.28 }));
  const p3 = new THREE.Vector3(), hp = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const put = (i, x, z, yaw, bob) => {
    q.setFromEuler(e.set(0, yaw, 0));
    m4.compose(v3.set(x, G + bob, z), q, one); bodies.setMatrixAt(i, m4);
    m4.compose(hp.set(x, G + bob + 0.5, z), q, one); heads.setMatrixAt(i, m4);
  };
  const step = (dt, t) => {
    walkers.forEach((w, i) => {
      if (w.jog) { // joggers run the loop round the lawns
        w.a += dt * w.speed / 29.9;
        const x = Math.cos(w.a) * (29.9 + w.lane), z = Math.sin(w.a) * (29.9 + w.lane) * 0.88;
        put(i, x, z, Math.atan2(-Math.sin(w.a), Math.cos(w.a) * 0.88), Math.abs(Math.sin(t * 11 + w.ph)) * 0.05);
        return;
      }
      w.s += dt * w.speed;
      onLoop(w.s, p3);
      const alongZ = p3.z === 0 || p3.z === Math.PI;
      put(i, p3.x + (alongZ ? w.lane : 0), p3.y + (alongZ ? 0 : w.lane), p3.z, Math.abs(Math.sin(t * 7 + w.ph)) * 0.022);
    });
    shoppers.forEach((s, k) => put(strollers + joggers + k, s.x, s.z, s.yaw + Math.sin(t * 0.5 + s.ph) * 0.25, 0));
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    fairy.material.color.setScalar(0.85 + Math.sin(t * 2.2) * 0.15); // the string lights shimmer a little
  };
  step(0, 0);
  return { root, step, sky: NIGHT };
}
