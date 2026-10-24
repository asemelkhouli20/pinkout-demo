// PinkOut Partners — 3D venue map on the home page (Three.js r160, vendored): explore the zones.
// The model comes from venue.js (concept floor plan). The HTML zone chips stay the real controls.
// The event page has its own, richer experience: the scroll tour (tour.js / tour3d.js).
import * as THREE from './vendor/three.module.min.js?v=1';
import { buildVenue, studioEnvironment, back } from './venue.js?v=30';

/** ghost a material to k × its own opacity (glass stays glass); solid again at k = 1 */
const fade = (m, k) => {
  m.userData.opacity ??= m.opacity;
  m.opacity = m.userData.opacity * k;
  const see = m.opacity < 0.999;
  if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
};

const OVERVIEW = { radius: 34, polar: 0.86, target: new THREE.Vector3(0, 0, 0.6) };
const FOCUS = { radius: 15, polar: 0.82 };
const MAX_ORBIT = 0.45;                         // ±25° of drag

export function mount(stage, api) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  const labelsLayer = stage.querySelector('[data-map-labels]');
  const coarse = matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !coarse;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  scene.environment = studioEnvironment(renderer);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6dcd6, 0.45));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(-8, 16, 10);
  sun.castShadow = !coarse;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const venue = buildVenue(api.zones);
  scene.add(venue.root);
  const zones = venue.zones.map((v) => {
    const z = v.data;
    const label = document.createElement('button');
    label.type = 'button';
    label.tabIndex = -1;
    label.textContent = z.name;
    label.addEventListener('click', () => api.select(z.id));
    labelsLayer.append(label);
    return { ...v, label };
  });

  /* ---------- Camera rig: spherical coords around a target, damped ---------- */
  const reduced = () => api.get('motion') !== 'full';
  const rig = { radius: reduced() ? OVERVIEW.radius : OVERVIEW.radius * 1.35, polar: OVERVIEW.polar, azimuth: 0, target: OVERVIEW.target.clone() };
  const goal = { radius: OVERVIEW.radius, polar: OVERVIEW.polar, target: OVERVIEW.target.clone() };
  let orbit = 0;
  const overviewRadius = () => OVERVIEW.radius * (camera.aspect < 1 ? 1.55 : camera.aspect < 1.3 ? 1.15 : 1);

  const applyCamera = () => {
    const az = rig.azimuth + orbit;
    const sinP = Math.sin(rig.polar);
    camera.position.set(rig.target.x + rig.radius * sinP * Math.sin(az), rig.target.y + rig.radius * Math.cos(rig.polar), rig.target.z + rig.radius * sinP * Math.cos(az));
    camera.lookAt(rig.target);
  };

  const focusZone = (id) => {
    const z = zones.find((x) => x.data.id === id);
    if (z) { goal.target.set(z.anchor.x, 0.4, z.anchor.z); goal.radius = FOCUS.radius * (camera.aspect < 1 ? 1.4 : 1); goal.polar = FOCUS.polar; }
    else { goal.target.copy(OVERVIEW.target); goal.radius = overviewRadius(); goal.polar = OVERVIEW.polar; }
    zones.forEach((x) => {
      x.group.userData.liftTarget = x.data.id === id ? 0.3 : 0;
      x.label.setAttribute('aria-pressed', String(x.data.id === id));
    });
    wake();
  };

  const applyTrack = (track) => {
    zones.forEach((x) => {
      const on = track === 'all' || x.data.tracks.includes(track);
      x.group.userData.opacityTarget = on ? 1 : 0.2;
      x.label.toggleAttribute('data-off', !on);
    });
    wake();
  };

  /* ---------- Resize ---------- */
  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!api.get('zone')) goal.radius = overviewRadius();
    applyCamera();
    renderer.render(scene, camera); // setSize clears the canvas: draw now, don't wait for the loop
    wake();
  };
  new ResizeObserver(resize).observe(stage);

  /* ---------- Pointer: hover, click, small orbit drag ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;
  let drag = null;
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(zones.map((z) => z.group), true)[0];
    return hit ? hit.object.userData.zone : null;
  };
  canvas.addEventListener('pointermove', (e) => {
    if (drag) {
      orbit = Math.max(-MAX_ORBIT, Math.min(MAX_ORBIT, drag.orbit + (e.clientX - drag.x) * 0.006));
      drag.moved ||= Math.abs(e.clientX - drag.x) > 4;
      wake();
      return;
    }
    const id = pick(e);
    if (id !== hovered) {
      hovered = id;
      canvas.style.cursor = id ? 'pointer' : 'grab';
      zones.forEach((x) => { if (x.data.id !== api.get('zone')) x.group.userData.liftTarget = x.data.id === id ? 0.15 : 0; });
      wake();
    }
  });
  canvas.addEventListener('pointerdown', (e) => { if (!coarse) { drag = { x: e.clientX, orbit, moved: false }; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointerup', (e) => {
    const moved = drag?.moved;
    drag = null;
    if (moved) return;
    const id = pick(e);
    if (id) api.select(id);
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; });

  /* ---------- Render loop: runs only while visible; sleeps when settled ---------- */
  const tmp = new THREE.Vector3();
  let running = false;
  let visible = false;
  let settledFrames = 0;
  let introStart = reduced() ? -1 : 0;
  const clock = new THREE.Clock();

  function wake() { settledFrames = 0; if (visible && !document.hidden && !running) { running = true; renderer.setAnimationLoop(tick); } }
  function sleep() { running = false; renderer.setAnimationLoop(null); }

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = reduced() ? 1 : 1 - Math.pow(0.0015, dt);
    const t = clock.elapsedTime;
    if (introStart === 0) introStart = t || 0.001;
    zones.forEach((x, i) => {
      const u = x.group.userData;
      u.scale = introStart > 0 ? back(Math.min(1, Math.max(0, (t - introStart - i * 0.08) / 0.6))) : 1;
      u.lift += (u.liftTarget - u.lift) * k;
      u.opacity += (u.opacityTarget - u.opacity) * k;
      const bob = !reduced() && x.data.id === api.get('zone') ? Math.sin(t * 2) * 0.04 : 0;
      x.group.scale.setScalar(Math.max(0.001, u.scale));
      x.group.position.y = u.lift + bob;
      x.group.traverse((o) => { if (o.isMesh) fade(o.material, u.opacity); });
    });
    rig.radius += (goal.radius - rig.radius) * k;
    rig.polar += (goal.polar - rig.polar) * k;
    rig.target.lerp(goal.target, k);
    applyCamera();
    renderer.render(scene, camera);

    const { width, height } = canvas.getBoundingClientRect();
    zones.forEach((x) => {
      tmp.copy(x.anchor); tmp.y += x.group.userData.lift;
      tmp.project(camera);
      x.label.style.transform = `translate(${((tmp.x * 0.5 + 0.5) * width).toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * height).toFixed(1)}px)`;
      x.label.style.opacity = x.group.userData.scale < 0.6 ? '0' : '';
    });

    const moving = Math.abs(goal.radius - rig.radius) > 0.01 || rig.target.distanceTo(goal.target) > 0.01
      || zones.some((x) => Math.abs(x.group.userData.liftTarget - x.group.userData.lift) > 0.002 || Math.abs(x.group.userData.opacityTarget - x.group.userData.opacity) > 0.01 || x.group.userData.scale < 0.999);
    const bobbing = !reduced() && !!api.get('zone');
    settledFrames = moving || bobbing ? 0 : settledFrames + 1;
    if (settledFrames > 3) sleep();
  }

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); else sleep(); }, { threshold: 0.05 }).observe(stage);
  document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : wake()));
  api.on('zone', focusZone);
  api.on('track', applyTrack);
  api.on('motion', wake);
  addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    sleep();
    scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); } });
    renderer.dispose();
  });

  resize();
  applyTrack(api.get('track'));
  focusZone(api.get('zone'));
  applyCamera();
  renderer.render(scene, camera);
  stage.dataset.mode = '3d';
  wake();
}
