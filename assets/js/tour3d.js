// PinkOut Partners — the event tour, filmed in the venue miniature.
// tour.js feeds a position (0 = overview, 1…8 = the stops of the visitor loop, 9 = finale; fractional while scrolling).
// The camera flies the visitor loop, the zone on show glows and gets a pink outline, visitors keep walking.
// At a stop, what happens there pops up over the spot where it happens (its "inside" items, one by one), with a
// little burst of icons, once; a bubble that would sit under the card or on another one stays hidden. Zone name
// labels only show in the overview and the finale (at a stop, the card names the zone).
// At the finale the map unlocks: drag to orbit, tap a zone to jump back to its stop.
import * as THREE from './vendor/three.module.min.js?v=1';
import { buildVenue, studioEnvironment, toX, toZ, U } from './venue.js?v=30';
import { liveLayer } from './crowd.js?v=34';
import { mountThemes } from './themes3d.js?v=5';

const P = ([x, y, h]) => new THREE.Vector3(toX(x), h, toZ(y)); // plan metres + height (units) → scene

export function mount(stageEl, { zones, data, get, on, onPick }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'tour__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stageEl.prepend(canvas);
  const labelsLayer = stageEl.querySelector('[data-tour-labels]');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduced = () => get('motion') !== 'full';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !coarse;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // soft, render-like highlights on marble and gold
  renderer.toneMappingExposure = 0.86;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 300);
  scene.environment = studioEnvironment(renderer);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe6dcd6, 0.42); // neutral fill: a pink one tinted every world the same
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1e4, 2.1);
  sun.position.set(-9, 18, 11);
  sun.castShadow = !coarse;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 14, bottom: -14, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffd6e6, 0.5);
  fill.position.set(10, 8, -12);
  scene.add(fill);

  const venue = buildVenue(zones);
  scene.add(venue.root);
  venue.zones.forEach((z) => z.group.scale.setScalar(1));
  const live = liveLayer(scene, zones, venue.zones, { coarse, spots: venue.spots });
  const themes = mountThemes({ scene, renderer, hemi, sun, fill, venue, live, stageEl, coarse, reduced }); // themed days (the map's theme icons)

  /* Each zone: a pulsing glow on its materials (not on lights that already glow) and a pink outline on the floor */
  const outlineMat = new THREE.MeshBasicMaterial({ color: '#ff3d8b', transparent: true, opacity: 0, depthWrite: false });
  const fx = venue.zones.map((z) => {
    const mats = [];
    z.group.traverse((o) => { if (o.isMesh && !o.userData.screen && o.material.emissive.getHex() === 0) { mats.push(o.material); o.material.emissive.set('#ff3d8b'); } });
    const outline = new THREE.Group();
    z.data.plan.rects.forEach(([x1, y1, x2, y2]) => {
      const t = 0.12, h = 0.05;
      const cx = (toX(x1) + toX(x2)) / 2, cz = (toZ(y1) + toZ(y2)) / 2, w = (x2 - x1) / U, d = (y2 - y1) / U;
      [[cx, toZ(y1), w, t], [cx, toZ(y2), w, t], [toX(x1), cz, t, d], [toX(x2), cz, t, d]].forEach(([x, zz, sw, sd]) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(sw, h, sd), outlineMat);
        bar.position.set(x, 0.09, zz);
        outline.add(bar);
      });
    });
    outline.visible = false;
    scene.add(outline);
    return { id: z.data.id, mats, outline, glow: 0 };
  });

  /* Labels: one per zone, projected from 3D; at a zone stop only that zone's label shows */
  const labels = venue.zones.map((z, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    b.textContent = z.data.name;
    b.style.setProperty('--zone-c', `var(${z.data.colour})`);
    b.addEventListener('click', () => onPick(data.zones.findIndex((q) => (q.zone || q.id) === z.data.id) + 1));
    labelsLayer.append(b);
    return { el: b, anchor: z.anchor, id: z.data.id, i };
  });

  /* Moments: one bubble per "inside" item of a stop, placed where it happens in the model */
  const moments = data.zones.map((s, i) => (s.moment?.spots || []).map(([mx, my, h], k) => {
    const el = document.createElement('span');
    el.className = 'tour__moment';
    el.style.setProperty('--zone-c', `var(--zone-${s.zone || s.id})`);
    el.toggleAttribute('data-hidden', true);
    labelsLayer.append(el);
    return { el, k, pos: P([mx, my, h / U]) };
  }));
  const momentText = () => { const lang = get('lang'); moments.forEach((list, i) => list.forEach((mo) => { mo.el.textContent = data.zones[i][lang]?.inside?.[mo.k] ?? ''; })); };
  momentText();
  let at = 0;        // the stop the camera has arrived at (0 = none)
  const tourRoot = stageEl.closest('[data-tour]');
  const planEl = stageEl.querySelector('[data-tour-plan]'), headerEl = document.getElementById('site-header');
  const themesEl = stageEl.querySelector('[data-tour-themes]');
  let atSince = 0;   // when it arrived (clock seconds: frame times fall behind when the tab runs slowly)


  /* Camera path: overview → the eight stops → finale */
  const keys = [data.intro, ...data.zones, data.finale];
  const last = keys.length - 1;
  const camPath = new THREE.CatmullRomCurve3(keys.map((k) => P(k.cam)), false, 'centripetal', 0.35);
  const lookPath = new THREE.CatmullRomCurve3(keys.map((k) => P(k.look)), false, 'centripetal', 0.35);

  let target = 0;
  let current = reduced() ? 0 : -0.4; // a short dolly-in on first view
  let orbit = 0;      // finale: free look (drag)
  let orbitAuto = 0;
  let narrow = false;
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const off = new THREE.Vector3();
  const proj = new THREE.Vector3();
  const stopAt = (c) => { const i = Math.round(c); return i >= 1 && i <= data.zones.length ? data.zones[i - 1] : null; };
  const zoneAt = (c) => { const s = stopAt(c); return s ? s.zone || s.id : null; }; // the venue zone a stop films

  const resize = () => {
    const { width, height } = stageEl.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    narrow = camera.aspect < 1.1;
    camera.fov = camera.aspect < 0.8 ? 56 : narrow ? 48 : 40;
    // wide screens: the card sits on the reading side, so frame the venue on the other side
    // the card covers one side (desktop: the reading side; phones: the bottom), so frame the venue in the rest
    const shiftX = narrow ? 0 : width * 0.15 * (document.documentElement.dir === 'rtl' ? 1 : -1);
    const shiftY = narrow ? height * 0.2 : 0;
    if (shiftX || shiftY) camera.setViewOffset(width, height, shiftX, shiftY, width, height); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    draw(0);
  };
  new ResizeObserver(resize).observe(stageEl);

  function draw(dt) {
    const t = performance.now() / 1000;
    current = reduced() ? Math.round(target) : current + (target - current) * (1 - Math.pow(0.0006, dt));
    const u = Math.min(1, Math.max(0, current / last));
    camPath.getPoint(u, pos);
    lookPath.getPoint(u, look);
    off.copy(pos).sub(look);
    if (narrow) off.multiplyScalar(1.3);                                  // phones: step back so the zone fits
    if (current < 0) off.multiplyScalar(1 - current * 0.6);                 // dolly-in
    const exploring = current > last - 0.3;
    if (!reduced()) {
      if (exploring && !drag) orbitAuto += dt * 0.08;
      off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, (exploring ? orbit + orbitAuto : 0) + Math.sin(t * 0.25) * 0.035);
      off.y += Math.sin(t * 0.4) * 0.15;                                  // a slow breath, like a camera on a crane
    } else if (exploring) off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, orbit);
    camera.position.copy(look).add(off);
    camera.lookAt(look);

    // the zone on show: a steady warm glow + outline, faded in as the camera arrives. The glow must not pulse:
    // on big surfaces (the Live stage and its back wall) a pulsing tint reads as a box flashing on and off.
    const showing = zoneAt(current);
    const arrive = 1 - Math.min(1, Math.abs(current - Math.round(current)) * 2.5);
    fx.forEach((f) => {
      const want = f.id === showing ? arrive : 0;
      f.glow += (want - f.glow) * (dt ? Math.min(1, dt * 2.5) : 1);
      f.mats.forEach((m) => { m.emissiveIntensity = f.glow * 0.06; });
      f.outline.visible = f.glow > 0.02;
    });
    outlineMat.opacity = reduced() ? 0.85 : 0.75 + Math.sin(t * 2) * 0.1; // only the thin floor outline breathes
    const stop = stopAt(current);
    live.setFocus(stop && arrive > 0.5 ? stop : null);
    renderer.render(scene, camera);

    // zone labels: only in the overview and the finale; at a stop the card already names the zone
    const cr = canvas.getBoundingClientRect();
    const { width, height } = cr;
    const overview = !showing;
    labels.forEach((l) => {
      proj.copy(l.anchor).project(camera);
      l.el.style.transform = `translate(${((proj.x * 0.5 + 0.5) * width).toFixed(1)}px, ${((-proj.y * 0.5 + 0.5) * height).toFixed(1)}px)`;
      l.el.toggleAttribute('data-hidden', !overview || proj.z > 1);
      l.el.tabIndex = exploring ? 0 : -1;
    });
    stageEl.toggleAttribute('data-exploring', exploring);

    // moments: arrive → the bubbles pop up one by one, once (each with a small burst of icons). A bubble only shows
    // where it is whole and alone: never under the card, the floor plan, the theme bar or the header, never on another bubble.
    const here = stop && arrive > 0.85 ? Math.round(current) : 0;
    if (here !== at) { at = here; atSince = t; }
    const atTime = t - atSince;
    const blocks = at ? [tourRoot?.querySelector('.tour__stop[data-active] .stop-card'), planEl, headerEl, themesEl]
      .map((el) => el?.getBoundingClientRect()).filter((r) => r && r.width && r.height)
      .map((r) => [r.left - cr.left, r.top - cr.top, r.right - cr.left, r.bottom - cr.top]) : [];
    const placed = [];
    moments.forEach((list, i) => list.forEach((mo) => {
      const want = i + 1 === at && (reduced() || atTime > 0.5 + mo.k * 0.55);
      const fresh = want && mo.el.hasAttribute('data-hidden');
      mo.el.toggleAttribute('data-hidden', !want);
      if (!want) return;
      proj.copy(mo.pos).project(camera);
      const x = (proj.x * 0.5 + 0.5) * width, y = (-proj.y * 0.5 + 0.5) * height;
      mo.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      const w = mo.el.offsetWidth, h = mo.el.offsetHeight;
      const box = [x - w / 2, y - h - 16, x + w / 2, y - 4]; // the bubble and its tail
      const pad = mo.el.hasAttribute('data-off') ? 10 : -2;  // harder to come back than to stay: no flicker at an edge
      const hit = (b) => box[0] - pad < b[2] && b[0] < box[2] + pad && box[1] - pad < b[3] && b[1] < box[3] + pad;
      const clear = proj.z <= 1 && box[0] > 6 && box[2] < width - 6 && box[1] > 6 && box[3] < height - 6 && !blocks.some(hit) && !placed.some(hit);
      mo.el.toggleAttribute('data-off', !clear);
      if (!clear) return;
      placed.push(box);
      if (fresh && !reduced()) live.burst(mo.pos, data.zones[i].moment.icons, coarse ? 1 : 2);
    }));
  }

  /* Finale: drag to orbit */
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (current < last - 0.3) return;
    drag = { x: e.clientX, orbit };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => { if (drag) { orbit = drag.orbit + (e.clientX - drag.x) * 0.006; if (reduced() || !running) draw(0); } });
  canvas.addEventListener('pointerup', () => { drag = null; });

  /* Loop: only while the stage is on screen and the tab is visible */
  let visible = false;
  let running = false;
  const clock = new THREE.Clock();
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced()) live.step(dt, clock.elapsedTime);
    themes.step(dt, clock.elapsedTime);
    draw(dt);
  };
  const wake = () => { if (visible && !document.hidden && !running) { running = true; clock.getDelta(); renderer.setAnimationLoop(tick); } };
  const sleep = () => { running = false; renderer.setAnimationLoop(null); };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? wake() : sleep(); }, { threshold: 0.01 }).observe(stageEl);
  document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : wake()));
  on('motion', () => { draw(0); wake(); });
  on('lang', () => { momentText(); resize(); });
  addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    sleep();
    scene.traverse((o) => { if (o.isMesh || o.isPoints) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose(); m.dispose(); }); } });
    renderer.dispose();
  });

  resize();
  wake();
  stageEl.dataset.mode = '3d';
  return {
    setPosition(c) { target = c; if (reduced() || !running) draw(0); },
    setTheme(id) { themes.set(id); if (reduced() || !running) draw(0); },
  };
}
