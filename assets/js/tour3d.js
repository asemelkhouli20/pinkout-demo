// PinkOut Partners — the event tour, filmed in the venue miniature.
// tour.js feeds a position (0 = overview, 1…8 = the stops of the visitor loop, 9 = finale; fractional while scrolling).
// The camera flies the visitor loop, the zone on show glows and gets a pink outline, visitors keep walking.
// At a stop, what happens there pops up over the spot where it happens (its "inside" items, one by one), with a
// little burst of icons, once; a bubble that would sit under the card or on another one stays hidden. Zone name
// labels only show in the overview and the finale (at a stop, the card names the zone).
// The map answers the pointer everywhere: the camera leans after the mouse, a drag looks around (at the finale it
// orbits freely), and a click or tap makes something happen (see "The pointer" below).
// Kept light: pixel density steps down by itself when frames run slow, layout is measured on resize (and twice a second
// at a stop, for the bubbles), never every frame, and the themed days load on the first theme click.
import * as THREE from './vendor/three.module.min.js?v=1';
import { buildVenue, studioEnvironment, toX, toZ, U } from './venue.js?v=31';
import { liveLayer } from './crowd.js?v=35';
import { buildPark } from './park.js?v=12';

const P = ([x, y, h]) => new THREE.Vector3(toX(x), h, toZ(y)); // plan metres + height (units) → scene

export function mount(stageEl, { zones, data, get, on, onPick, onReady }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'tour__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stageEl.prepend(canvas);
  const labelsLayer = stageEl.querySelector('[data-tour-labels]');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduced = () => get('motion') !== 'full';

  // phones: their dense screens need no edge smoothing, and it costs a lot of GPU time there
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, alpha: true, powerPreference: 'high-performance' });
  const maxDpr = Math.min(devicePixelRatio, coarse ? 1.5 : 2), minDpr = Math.min(1, maxDpr);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !coarse;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // soft, render-like highlights on marble and gold
  renderer.toneMappingExposure = 0.95; // night in the park: themes3d.js EVERYDAY holds the same values

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.8, 300);
  scene.environment = studioEnvironment(renderer);
  const hemi = new THREE.HemisphereLight(0xb8c4ff, 0x2a2440, 0.36); // a cool night sky above, dark lawns below
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xdfe4ff, 1.6); // moonlight: soft, a little cool
  sun.position.set(-9, 18, 11);
  sun.castShadow = !coarse;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 14, bottom: -14, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffcf9e, 0.75); // warm light from inside the venue and the stalls
  fill.position.set(10, 8, -12);
  scene.add(fill);
  // a soft light from high above that falls on the building only: the venue is the bright heart of the night,
  // the park around it stays in the dark (no shadow, no fall-off: one cone, edge softened)
  const spot = new THREE.SpotLight(0xfff1f4, 1.3, 0, Math.atan(16 / 34), 0.35, 0);
  spot.position.set(0, 34, 0);
  spot.target.position.set(0, 0, 0);
  scene.add(spot, spot.target);

  const venue = buildVenue(zones);
  scene.add(venue.root);
  venue.zones.forEach((z) => z.group.scale.setScalar(1));
  const live = liveLayer(scene, zones, venue.zones, { coarse, spots: venue.spots });
  const park = buildPark(scene, { coarse, venue }); // the setting: a park with vendors and visitors under a soft sky
  // themed days (the map's theme icons): loaded and built on the first pick, so most visits never pay for them
  let themes = null, wantTheme = 'default', loadingThemes = null;
  const useTheme = (id) => {
    wantTheme = id;
    if (!themes && id === 'default') return;
    loadingThemes ||= import('./themes3d.js?v=8').then((m) => { themes = m.mountThemes({ scene, renderer, hemi, sun, fill, venue, live, stageEl, coarse, reduced }); });
    loadingThemes.then(() => { themes.set(wantTheme); if (reduced() || !running) draw(0); });
  };

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
  // bubble sizes are measured once per language / screen size (reading them every frame forces a re-layout)
  const sizeMoments = () => moments.forEach((list) => list.forEach((mo) => { mo.w = mo.el.offsetWidth; mo.h = mo.el.offsetHeight; }));
  const momentText = () => { const lang = get('lang'); moments.forEach((list, i) => list.forEach((mo) => { mo.el.textContent = data.zones[i][lang]?.inside?.[mo.k] ?? ''; })); sizeMoments(); };
  momentText();
  let at = 0;        // the stop the camera has arrived at (0 = none)
  const tourRoot = stageEl.closest('[data-tour]');
  const planEl = stageEl.querySelector('[data-tour-plan]'), headerEl = document.getElementById('site-header');
  const themesEl = stageEl.querySelector('[data-tour-themes]');
  let atSince = 0;   // when it arrived (clock seconds: frame times fall behind when the tab runs slowly)
  let view = { w: 1, h: 1 };            // the canvas size (measured on resize)
  let blocks = [], blocksAt = -1;       // the panels a bubble must stay clear of, relative to the canvas
  const measureBlocks = (t) => {
    const cr = canvas.getBoundingClientRect();
    blocks = [tourRoot?.querySelector('.tour__stop[data-active] .stop-card'), planEl, headerEl, themesEl]
      .map((el) => el?.getBoundingClientRect()).filter((r) => r && r.width && r.height)
      .map((r) => [r.left - cr.left, r.top - cr.top, r.right - cr.left, r.bottom - cr.top]);
    blocksAt = t;
  };


  /* Camera path: overview → the eight stops → finale */
  const keys = [data.intro, ...data.zones, data.finale];
  const last = keys.length - 1;
  const camPath = new THREE.CatmullRomCurve3(keys.map((k) => P(k.cam)), false, 'centripetal', 0.35);
  const lookPath = new THREE.CatmullRomCurve3(keys.map((k) => P(k.look)), false, 'centripetal', 0.35);

  let target = 0;
  let current = reduced() ? 0 : -0.4; // a short dolly-in on first view
  let orbit = 0;      // finale: free look (drag)
  let nudge = 0, nudgeHome = false;      // at a stop: drag to look around a little; it settles back when the stop changes
  const lean = { x: 0, y: 0, tx: 0, ty: 0 }; // the camera leans a touch towards the mouse
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
    view = { w: width, h: height };
    blocksAt = -1;
    sizeMoments();
    camera.aspect = width / height;
    narrow = camera.aspect < 1.1;
    camera.fov = camera.aspect < 0.8 ? 56 : narrow ? 48 : 40;
    // wide screens: the card sits on the reading side, so frame the venue on the other side
    // the card covers one side (desktop: the reading side; phones: the bottom), so frame the venue in the rest
    const shiftX = narrow ? 0 : width * 0.15 * (document.documentElement.dir === 'rtl' ? 1 : -1);
    const shiftY = narrow ? height * 0.08 : 0; // phones: the card is a small sheet at the bottom, so lift the venue just a little
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
      lean.x += (lean.tx - lean.x) * Math.min(1, dt * 3); lean.y += (lean.ty - lean.y) * Math.min(1, dt * 3);
      if (!drag && nudgeHome) nudge *= Math.pow(0.08, dt);
      off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, (exploring ? orbit + orbitAuto : nudge) + Math.sin(t * 0.25) * 0.035 - lean.x * 0.07);
      off.y *= 1 + lean.y * 0.05;
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
    const { w: width, h: height } = view;
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
    if (here !== at) { at = here; atSince = t; blocksAt = -1; }
    const atTime = t - atSince;
    if (at && (blocksAt < 0 || t - blocksAt > 0.5)) measureBlocks(t); // the card slides in: look again twice a second
    const placed = [];
    moments.forEach((list, i) => list.forEach((mo) => {
      const want = i + 1 === at && (reduced() || atTime > 0.15 + mo.k * 0.12);
      const fresh = want && mo.el.hasAttribute('data-hidden');
      mo.el.toggleAttribute('data-hidden', !want);
      if (!want) return;
      proj.copy(mo.pos).project(camera);
      const x = (proj.x * 0.5 + 0.5) * width, y = (-proj.y * 0.5 + 0.5) * height;
      mo.el.style.translate = `calc(${x.toFixed(1)}px - 50%) calc(${y.toFixed(1)}px - 100% - 10px)`; // not transform: scale must not shrink the position
      if (!mo.w) { mo.w = mo.el.offsetWidth; mo.h = mo.el.offsetHeight; }
      const w = mo.w, h = mo.h;
      const box = [x - w / 2, y - h - 16, x + w / 2, y - 4]; // the bubble and its tail
      const pad = mo.el.hasAttribute('data-off') ? 10 : -2;  // harder to come back than to stay: no flicker at an edge
      const hit = (b) => box[0] - pad < b[2] && b[0] < box[2] + pad && box[1] - pad < b[3] && b[1] < box[3] + pad;
      const clear = proj.z <= 1 && box[0] > 6 && box[2] < width - 6 && box[1] > 6 && box[3] < height - 6 && !blocks.some(hit) && !placed.some(hit);
      mo.el.toggleAttribute('data-off', !clear);
      if (!clear) return;
      placed.push(box);
      if (fresh && !reduced()) live.burst(mo.pos, data.zones[i].moment.icons, coarse ? 1 : 2);
    }));

    rings.forEach((r) => {
      if (r.life <= 0) return;
      r.life -= (dt || 0.016) * 1.4;
      const k = 1 - Math.max(0, r.life);
      r.m.scale.setScalar(0.2 + k * r.size);
      r.m.material.opacity = Math.max(0, r.life) * 0.9;
      r.m.visible = r.life > 0;
    });
    const pingOn = t < ping.until;
    if (pingOn) {
      proj.copy(ping.at).project(camera);
      ping.el.style.translate = `calc(${((proj.x * 0.5 + 0.5) * width).toFixed(1)}px - 50%) calc(${((-proj.y * 0.5 + 0.5) * height).toFixed(1)}px - 100% - 10px)`;
    }
    if (pingOn === ping.el.hasAttribute('data-hidden')) ping.el.toggleAttribute('data-hidden', !pingOn);
  }

  /* The pointer. Drag: look around (the finale: orbit freely). Mouse: the camera leans after it, and whatever can be
     clicked shows a hand. Click / tap: everything answers — a vendor pops what it sells and says its
     name, the wheel spins up, the fountain leaps, visitors hop, a world in the overview takes you there, and anywhere
     else a ring of light spreads where you touched. */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.3);
  const targets = [venue.root, ...park.pick];
  const zoneOf = (o) => { while (o && !o.userData.zone) o = o.parent; return o?.userData.zone || null; };
  const castAt = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; }; // hidden things (a themed day's) never catch a click
    return ray.intersectObjects(targets, true).find((h) => shown(h.object)) || null;
  };
  // rings of light spreading on the ground
  const ringMat = () => new THREE.MeshBasicMaterial({ color: '#ff8fc8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -12, polygonOffsetUnits: -48 });
  const ringGeo = new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2);
  const rings = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(ringGeo, ringMat()); m.visible = false; m.renderOrder = 2; scene.add(m); return { m, life: 0 }; });
  let ringNext = 0;
  const ripple = (at, colour = '#ff8fc8', size = 1.6) => {
    const r = rings[ringNext++ % rings.length];
    r.m.position.set(at.x, at.y + 0.02, at.z); r.m.material.color.set(colour); r.size = size; r.life = 1; r.m.visible = true;
  };
  // a name that pops up for a moment where you clicked (and one that follows the mouse)
  const chip = (cls) => { const el = document.createElement('span'); el.className = cls; el.toggleAttribute('data-hidden', true); labelsLayer.append(el); return el; };
  const ping = { el: chip('tour__ping'), at: new THREE.Vector3(), until: 0 };
  const say = (text, at) => { ping.el.textContent = text; ping.at.copy(at); ping.until = performance.now() / 1000 + 1.6; };
  const tapAt = new THREE.Vector3();
  const tap = (e) => {
    const hit = castAt(e);
    if (!hit) { // the lawn, the sky: a ring of light where the ground is
      if (ray.ray.intersectPlane(groundPlane, tapAt)) { ripple(tapAt, '#bfe2ff'); live.burst(tapAt.clone().setY(tapAt.y + 0.2), ['sparkle'], 3); }
      return;
    }
    tapAt.copy(hit.point);
    const answer = park.react(hit);
    if (answer) {
      const at = answer.at || tapAt.clone().setY(tapAt.y + 0.4);
      live.burst(at, answer.icons, coarse ? Math.ceil(answer.n / 2) : answer.n);
      ripple(answer.at ? answer.at.clone().setY(-0.3) : tapAt, '#ffd0e2', answer.kind === 'wheel' ? 4 : 1.8);
      if (answer.label) say(answer.label, at);
      return;
    }
    const zone = zoneOf(hit.object);
    if (zone) {
      const stopIdx = data.zones.findIndex((q) => (q.zone || q.id) === zone) + 1;
      const name = venue.zones.find((z) => z.data.id === zone)?.data.name;
      const here = stopAt(current);
      if (!here || (here.zone || here.id) !== zone) { // the overview, or another world: go there
        ripple(tapAt, '#ff8fc8', 2.2);
        if (name) say(name, tapAt.clone().setY(tapAt.y + 0.5));
        if (stopIdx > 0) onPick(stopIdx);
        return;
      }
      const icons = (here.moment?.icons || []).filter(Boolean);
      live.burst(tapAt.clone().setY(tapAt.y + 0.3), icons.length ? [...icons, 'heart'] : ['heart', 'sparkle'], coarse ? 3 : 5);
      ripple(tapAt, '#ff8fc8', 1.2);
      return;
    }
    live.burst(tapAt.clone().setY(tapAt.y + 0.3), ['sparkle', 'heart'], 3); // the walls, the roof
    ripple(tapAt, '#ffe2a8', 1.2);
  };
  let drag = null, hoverAt = 0;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, orbit, nudge, moved: false, mouse: e.pointerType === 'mouse', at: performance.now() };
    if (drag.mouse) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (e.pointerType === 'mouse') { lean.tx = ((e.clientX - r.left) / r.width) * 2 - 1; lean.ty = ((e.clientY - r.top) / r.height) * 2 - 1; }
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) + Math.abs(e.clientY - drag.y) > 6) drag.moved = true;
      if (drag.mouse && drag.moved) { // touch drags belong to the page's scrolling
        if (current > last - 0.3) orbit = drag.orbit + dx * 0.006;
        else { nudge = Math.max(-0.9, Math.min(0.9, drag.nudge + dx * 0.005)); nudgeHome = false; }
        canvas.style.cursor = 'grabbing';
        if (reduced() || !running) draw(0);
      }
      return;
    }
    if (e.pointerType !== 'mouse' || performance.now() - hoverAt < 90) return; // hover: ten looks a second at most
    hoverAt = performance.now();
    const hit = castAt(e);
    let o = hit?.object;
    while (o && !o.userData.pick && !o.userData.zone) o = o.parent;
    canvas.style.cursor = o ? 'pointer' : ''; // a hand over what answers a click; no labels following the mouse
  });
  const release = (e) => {
    if (!drag) return;
    const wasTap = !drag.moved && performance.now() - drag.at < 600;
    drag = null;
    canvas.style.cursor = '';
    if (wasTap) { tap(e); if (reduced() || !running) draw(0); }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { lean.tx = lean.ty = 0; } });

  /* Loop: only while the stage is on screen and the tab is visible */
  let visible = false;
  let running = false;
  const clock = new THREE.Clock();
  // quality: when frames keep running slow (under ~42 fps for a second or so), draw fewer pixels; never below 1×
  let slow = 0, settleUntil = performance.now() + 2500; // ignore the first seconds (shaders compiling)
  const govern = (ms) => {
    if (ms > 200 || performance.now() < settleUntil) return; // a paused or hidden tab, or still starting up
    slow = ms > 24 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 40 && dpr > minDpr) { dpr = Math.max(minDpr, dpr - 0.25); renderer.setPixelRatio(dpr); slow = 0; settleUntil = performance.now() + 1000; }
  };
  const tick = () => {
    const raw = clock.getDelta();
    govern(raw * 1000);
    const dt = Math.min(raw, 0.05);
    if (!reduced()) { live.step(dt, clock.elapsedTime); park.step(dt, clock.elapsedTime); }
    themes?.step(dt, clock.elapsedTime);
    draw(dt);
  };
  const wake = () => { if (visible && !document.hidden && !running) { running = true; clock.getDelta(); settleUntil = Math.max(settleUntil, performance.now() + 500); renderer.setAnimationLoop(tick); } };
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
  // the venue has drawn (shaders compiled in that first draw): two frames later, let the loading film go
  requestAnimationFrame(() => requestAnimationFrame(() => { stageEl.toggleAttribute('data-ready', true); onReady?.(); }));
  return {
    setPosition(c) { if (Math.round(c) !== Math.round(target)) nudgeHome = true; target = c; if (reduced() || !running) draw(0); },
    setTheme(id) { useTheme(id); },
  };
}
