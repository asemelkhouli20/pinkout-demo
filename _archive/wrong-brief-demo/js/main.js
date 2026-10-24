/* =========================================================
   PINK OUT — Three.js ribbon + GSAP scroll choreography
   ---------------------------------------------------------
   1. Shared state      — `ribbon` is tweened by GSAP, read by the render loop
   2. Three.js stage    — custom ribbon geometry, physical material, dust
   3. Smooth scroll     — Lenis feeding ScrollTrigger
   4. Intro             — loader curtain, ribbon draws itself, title converges
   5. Scroll scenes     — one section = one ribbon pose + its own text motion
   6. Interactions      — cursor, magnetic buttons, tilt, pledge, share
   ========================================================= */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const isMobile = () => innerWidth <= 760;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* ---------------------------------------------------------
   1. SHARED STATE
   xf / yf are fractions of the visible half-width / half-height,
   so a pose means the same thing on a phone and on a 4K screen.
   --------------------------------------------------------- */
const ribbon = {
  xf: 0, yf: 0, s: 1, rx: 0, ry: 0, rz: 0, // scroll pose
  draw: 0, introS: 0.55, introRy: -2.4, dust: 0, // intro
  spin: 0, pulse: 0, // pledge celebration
};
const POSE_KEYS = ["xf", "yf", "s", "rx", "ry", "rz"];
const TAU = Math.PI * 2;

const POSES = {
  desktop: {
    hero:    { xf: 0,     yf: 0.03,  s: 1,    rx: 0,    ry: 0,             rz: 0 },
    why:     { xf: 0.56,  yf: 0,     s: 0.78, rx: 0.1,  ry: -0.7,          rz: 0.16 },
    numbers: { xf: 0,     yf: 0,     s: 0.7,  rx: 0,    ry: Math.PI,       rz: 0 },
    signsA:  { xf: 0.5,   yf: -0.28, s: 0.78, rx: 0.2,  ry: TAU + 0.3,     rz: -0.25 },
    signsB:  { xf: -0.5,  yf: -0.28, s: 0.78, rx: 0.2,  ry: TAU + 1.2,     rz: 0.25 },
    checks:  { xf: 0.72,  yf: 0.02,  s: 0.62, rx: 0,    ry: Math.PI * 3,   rz: 0.12 },
    join:    { xf: -0.62, yf: 0.42,  s: 0.5,  rx: 0.3,  ry: Math.PI * 3.4, rz: -0.3 },
    pledge:  { xf: 0.52,  yf: 0.02,  s: 0.98, rx: 0,    ry: TAU * 2,       rz: -0.08 },
  },
  mobile: {
    hero:    { xf: 0,     yf: 0.12,  s: 0.86, rx: 0,    ry: 0,             rz: 0 },
    why:     { xf: 0.58,  yf: 0.66,  s: 0.42, rx: 0.1,  ry: -0.7,          rz: 0.2 },
    numbers: { xf: 0,     yf: 0,     s: 0.5,  rx: 0,    ry: Math.PI,       rz: 0 },
    signsA:  { xf: 0.45,  yf: -0.5,  s: 0.62, rx: 0.2,  ry: TAU + 0.3,     rz: -0.25 },
    signsB:  { xf: -0.45, yf: -0.5,  s: 0.62, rx: 0.2,  ry: TAU + 1.2,     rz: 0.25 },
    checks:  { xf: 0.62,  yf: 0.8,   s: 0.34, rx: 0,    ry: Math.PI * 3,   rz: 0.12 },
    join:    { xf: 0.6,   yf: 0.7,   s: 0.36, rx: 0.3,  ry: Math.PI * 3.4, rz: -0.3 },
    pledge:  { xf: 0,     yf: 0.5,   s: 0.48, rx: 0,    ry: TAU * 2,       rz: 0 },
  },
};
const pose = (key) => POSES[isMobile() ? "mobile" : "desktop"][key];
// Function-based values so every ScrollTrigger refresh (resize) re-reads the right pose set.
const poseVals = (key) => Object.fromEntries(POSE_KEYS.map((k) => [k, () => pose(key)[k]]));
Object.assign(ribbon, pose("hero"));

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.__pinkout = { ribbon }; // handy for poking at poses from the console
let pageProgress = 0;

/* ---------------------------------------------------------
   2. THREE.JS STAGE
   --------------------------------------------------------- */
const RIBBON_SEGMENTS = 480;

/**
 * The awareness ribbon: a centripetal Catmull-Rom curve swept with a thin
 * rectangular cross-section. The flat face always looks toward the camera
 * (width vector = tangent × Z). Indices are ordered segment by segment so
 * `setDrawRange` reveals the ribbon from one tail to the other.
 */
function buildRibbonGeometry({ segments = RIBBON_SEGMENTS, width = 0.46, thickness = 0.05 } = {}) {
  const curve = new THREE.CatmullRomCurve3(
    [
      [-1.05, -2.35, 0.1], [-0.7, -1.55, 0.14], [-0.32, -0.75, 0.18], [0.05, -0.05, 0.18],
      [0.42, 0.65, 0.12], [0.66, 1.3, 0.04], [0.58, 1.82, -0.02], [0.25, 2.1, -0.06],
      [-0.25, 2.1, -0.06], [-0.58, 1.82, -0.02], [-0.66, 1.3, 0], [-0.42, 0.65, -0.08],
      [-0.05, -0.05, -0.16], [0.32, -0.75, -0.16], [0.7, -1.55, -0.12], [1.05, -2.35, -0.08],
    ].map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal"
  );

  const hw = width / 2, ht = thickness / 2;
  const Z = new THREE.Vector3(0, 0, 1);
  const P = new THREE.Vector3(), T = new THREE.Vector3(), W = new THREE.Vector3(), N = new THREE.Vector3();
  const positions = [], normals = [];
  // 4 faces × 2 verts per sample. Each face: [offset W sign, offset N sign] pairs + face normal.
  const faces = [
    { a: [1, 1], b: [-1, 1], n: (w, n) => n },               // front
    { a: [1, -1], b: [-1, -1], n: (w, n) => n.clone().negate() }, // back
    { a: [1, 1], b: [1, -1], n: (w) => w },                  // top edge
    { a: [-1, 1], b: [-1, -1], n: (w) => w.clone().negate() }, // bottom edge
  ];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T);
    W.crossVectors(T, Z).normalize();
    N.crossVectors(W, T).normalize();
    for (const f of faces) {
      const fn = f.n(W, N);
      for (const [sw, sn] of [f.a, f.b]) {
        positions.push(P.x + W.x * hw * sw + N.x * ht * sn, P.y + W.y * hw * sw + N.y * ht * sn, P.z + W.z * hw * sw + N.z * ht * sn);
        normals.push(fn.x, fn.y, fn.z);
      }
    }
  }

  // Pick the winding per face so triangles face outward (checked once on segment 0).
  const pos = (idx) => new THREE.Vector3(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]);
  const flip = faces.map((_, f) => {
    const v0 = pos(f * 2), v1 = pos(f * 2 + 1), v2 = pos(8 + f * 2);
    const tri = new THREE.Vector3().crossVectors(v1.clone().sub(v0), v2.clone().sub(v0));
    const n = new THREE.Vector3(normals[f * 6], normals[f * 6 + 1], normals[f * 6 + 2]);
    return tri.dot(n) < 0;
  });

  const indices = [];
  for (let i = 0; i < segments; i++) {
    for (let f = 0; f < 4; f++) {
      const a = i * 8 + f * 2, b = a + 1, c = a + 8, d = c + 1;
      if (flip[f]) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.center();
  return geo;
}

/** Soft round sprite drawn on a canvas — used for dust and the glow halo. */
function radialTexture(size, stops) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStage() {
  const canvas = $("#gl");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    document.documentElement.classList.add("no-webgl");
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, finePointer ? 2 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  // Lights: a warm key from the top-right, hot-pink rims from behind.
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 6);
  const rimA = new THREE.PointLight(0xff2a7f, 40, 0, 2);
  rimA.position.set(-4, 2, -3);
  const rimB = new THREE.PointLight(0xffb3d1, 22, 0, 2);
  rimB.position.set(4, -3, -2);
  scene.add(key, rimA, rimB);

  // The ribbon
  const geometry = buildRibbonGeometry();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xff1f75,
    roughness: 0.34,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    sheen: 0.45,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color(0xffc2da),
    iridescence: 0.2,
    iridescenceIOR: 1.3,
    envMapIntensity: 0.75,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);

  // A halo behind the ribbon — a cheap stand-in for bloom.
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture(256, [[0, "rgba(255,61,139,0.4)"], [0.4, "rgba(255,31,117,0.12)"], [1, "rgba(255,31,117,0)"]]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  halo.scale.set(7, 8, 1);
  halo.position.z = -1.2;

  const group = new THREE.Group();
  group.add(halo, mesh);
  scene.add(group);

  // Dust — a tall column of particles we drift through as the page scrolls.
  const count = finePointer ? 1600 : 700;
  const dustPos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    dustPos[i * 3] = THREE.MathUtils.randFloatSpread(26);
    dustPos[i * 3 + 1] = THREE.MathUtils.randFloat(-34, 9);
    dustPos[i * 3 + 2] = THREE.MathUtils.randFloat(-8, 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.09,
    map: radialTexture(64, [[0, "rgba(255,220,235,1)"], [0.35, "rgba(255,143,184,0.6)"], [1, "rgba(255,143,184,0)"]]),
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Viewport math: visible half-size of the z = 0 plane.
  const view = { halfW: 1, halfH: 1, base: 1 };
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    view.halfW = view.halfH * camera.aspect;
    // Ribbon bbox ≈ 2.6 × 4.9 units: fit 78% of height, or 62% of width on narrow screens.
    view.base = Math.min((view.halfH * 2 * 0.72) / 4.9, (view.halfW * 2 * 0.62) / 2.6);
  }
  resize();
  addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function render() {
    const t = clock.getElapsedTime();
    const still = reduceMotion ? 0 : 1;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    const scale = ribbon.s * view.base * ribbon.introS * (1 + ribbon.pulse);
    group.position.set(
      ribbon.xf * view.halfW + mouse.x * 0.25 * still,
      ribbon.yf * view.halfH + Math.sin(t * 0.8) * 0.08 * still - mouse.y * 0.15 * still,
      0
    );
    group.scale.setScalar(scale);
    mesh.rotation.set(
      ribbon.rx + (mouse.y * 0.18 + Math.sin(t * 0.6) * 0.05) * still,
      ribbon.ry + ribbon.introRy + ribbon.spin + (mouse.x * 0.4 + Math.sin(t * 0.4) * 0.18) * still,
      ribbon.rz + Math.sin(t * 0.5) * 0.03 * still
    );
    geometry.setDrawRange(0, Math.floor(ribbon.draw * RIBBON_SEGMENTS) * 24);
    halo.material.opacity = ribbon.draw;

    dust.position.y = pageProgress * 26;
    dust.rotation.y = t * 0.02 * still;
    dustMat.opacity = 0.75 * ribbon.dust;

    renderer.render(scene, camera);
  }

  return { render, resize };
}

const stage = createStage();
if (reduceMotion) {
  // The ribbon stays in the hero instead of travelling with the page.
  Object.assign($("#gl").style, { position: "absolute", height: "100svh" });
  stage?.resize();
}

/* ---------------------------------------------------------
   3. SMOOTH SCROLL (Lenis → ScrollTrigger)
   --------------------------------------------------------- */
let lenis = null;
if (!reduceMotion && Lenis) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
if (stage) gsap.ticker.add(stage.render);

// Smooth anchor links
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id === "#top" ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else if (target === 0) scrollTo(0, 0);
    else target.scrollIntoView();
    if (target !== 0) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  });
});

/* ---------------------------------------------------------
   4. INTRO
   --------------------------------------------------------- */
// Wait for fonts so SplitText measures the real glyphs (with a safety timeout).
await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);

const heroL = SplitText.create(".hero__word--l", { type: "chars", aria: "none" });
const heroR = SplitText.create(".hero__word--r", { type: "chars", aria: "none" });

function intro() {
  if (reduceMotion) {
    document.body.classList.remove("is-loading");
    Object.assign(ribbon, { draw: 1, introS: 1, introRy: 0, dust: 1 });
    return;
  }
  history.scrollRestoration = "manual";
  scrollTo(0, 0);
  lenis?.stop();

  const counter = { v: 0 };
  const countEl = $("[data-count]");
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  tl.to(counter, { v: 100, duration: 1.3, ease: "power2.inOut", onUpdate: () => (countEl.textContent = Math.round(counter.v)) })
    .addLabel("reveal")
    .to(".loader", { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "power4.inOut" }, "reveal")
    .set(".loader", { display: "none" }, "reveal+=1.1")
    .add(() => {
      document.body.classList.remove("is-loading");
      lenis?.start();
    }, "reveal+=0.4")
    .to(ribbon, { draw: 1, duration: 2.6, ease: "power2.inOut" }, "reveal+=0.2")
    .to(ribbon, { introS: 1, introRy: 0, duration: 3, ease: "expo.out" }, "reveal+=0.2")
    .to(ribbon, { dust: 1, duration: 2, ease: "power1.out" }, "reveal+=0.6")
    .from(heroL.chars, { xPercent: -180, rotate: -14, opacity: 0, duration: 1.6, stagger: 0.06 }, "reveal+=0.45")
    .from(heroR.chars, { xPercent: 180, rotate: 14, opacity: 0, duration: 1.6, stagger: { each: 0.06, from: "end" } }, "reveal+=0.45")
    .from([".nav", ".hero__eyebrow", ".hero__tag", ".hero__cta", ".hero__scroll"], { y: 30, opacity: 0, duration: 1.2, stagger: 0.08, ease: "power3.out" }, "reveal+=1");
}

/* ---------------------------------------------------------
   5. SCROLL SCENES
   --------------------------------------------------------- */
/** Move the ribbon from one section pose to the next, scrubbed by scroll. */
function travel(from, to, scrollTrigger) {
  return gsap.fromTo(ribbon, poseVals(from), {
    ...poseVals(to),
    ease: "none",
    immediateRender: false,
    scrollTrigger: { scrub: 1.2, invalidateOnRefresh: true, ...scrollTrigger },
  });
}

/** Masked line reveal for every heading marked [data-reveal]. */
function revealHeadings() {
  $$("[data-reveal]").forEach((el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "line",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115,
          rotate: 3,
          duration: 1.2,
          stagger: 0.1,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        }),
    });
  });
}

function scenes() {
  /* --- Hero exit: PINK slides left, OUT slides right, UI lifts away --- */
  const heroOut = { trigger: ".hero", start: "top top", end: "bottom top", scrub: true };
  gsap.to(".hero__word--l", { xPercent: -35, opacity: 0.15, ease: "none", scrollTrigger: heroOut });
  gsap.to(".hero__word--r", { xPercent: 35, opacity: 0.15, ease: "none", scrollTrigger: heroOut });
  gsap.to(".hero__ui", { yPercent: -18, opacity: 0, ease: "none", scrollTrigger: { ...heroOut, end: "60% top" } });

  /* --- Manifesto: pinned, words light up one by one --- */
  travel("hero", "why", { trigger: ".manifesto", start: "top bottom", end: "top top" });
  const words = SplitText.create(".manifesto__text", { type: "words", wordsClass: "word" });
  gsap.to(words.words, {
    opacity: 1,
    stagger: 0.1,
    ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top top", end: () => "+=" + innerHeight * 1.4, pin: true, scrub: true },
  });

  /* --- Numbers: circle iris opens into the blush panel, counters run --- */
  travel("why", "numbers", { trigger: ".numbers", start: "top bottom", end: "top top" });
  gsap.fromTo(
    ".numbers__panel",
    { clipPath: "circle(6% at 50% 70%)" },
    { clipPath: "circle(80% at 50% 50%)", ease: "none", scrollTrigger: { trigger: ".numbers", start: "top bottom", end: "top 10%", scrub: true } }
  );
  gsap.from(".stat", {
    y: 80, opacity: 0, duration: 1.1, stagger: 0.12, ease: "expo.out",
    scrollTrigger: { trigger: ".stats", start: "top 80%", once: true },
  });
  $$("[data-counter]").forEach((el) => {
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    if (target <= 1) return;
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 2, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
      onStart: () => (el.textContent = "0"),
      onUpdate: () => (el.textContent = o.v.toFixed(decimals)),
    });
  });

  /* --- Signs: pinned horizontal track; the ribbon drifts behind the glass --- */
  travel("numbers", "signsA", { trigger: ".signs", start: "top bottom", end: "top top" });
  const track = $(".signs__track");
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.from(".sign", {
    y: 90, rotate: 4, opacity: 0, duration: 1.1, stagger: 0.07, ease: "expo.out",
    scrollTrigger: { trigger: ".signs", start: "top 65%", once: true },
  });
  gsap.timeline({
    scrollTrigger: { trigger: ".signs", start: "top top", end: () => "+=" + distance(), pin: true, scrub: 1, invalidateOnRefresh: true },
  })
    .to(track, { x: () => -distance(), ease: "none" }, 0)
    .to(".signs__progress i", { scaleX: 1, ease: "none" }, 0);
  // Standalone (not inside the timeline): a child at time 0 would render its start pose on load.
  travel("signsA", "signsB", { trigger: ".signs", start: "top top", end: () => "+=" + distance(), scrub: 1 });

  /* --- Checks: sticky cards; each one tips back as the next arrives --- */
  travel("signsB", "checks", { trigger: ".checks", start: "top bottom", end: "top 30%" });
  const cards = $$(".card");
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.9 + i * 0.03,
      rotationX: 6,
      transformPerspective: 1200,
      ease: "none",
      scrollTrigger: { trigger: next, start: "top bottom", end: "top 20%", scrub: true },
    });
  });

  /* --- Join: staggered 3D cards --- */
  travel("checks", "join", { trigger: ".join", start: "top bottom", end: "top top" });
  gsap.from(".way", {
    y: 100, rotationX: -35, opacity: 0, transformOrigin: "50% 100%", transformPerspective: 900,
    duration: 1.2, stagger: 0.1, ease: "expo.out",
    scrollTrigger: { trigger: ".ways", start: "top 80%", once: true },
  });

  /* --- Marquee: loops forever, speeds up and reverses with scroll velocity --- */
  const loops = $$(".marquee__track").map((tr, i) =>
    i % 2
      ? gsap.fromTo(tr, { xPercent: -50 }, { xPercent: 0, duration: 30, ease: "none", repeat: -1 })
      : gsap.to(tr, { xPercent: -50, duration: 26, ease: "none", repeat: -1 })
  );
  ScrollTrigger.create({
    trigger: ".marquee",
    start: "top bottom",
    end: "bottom top",
    onUpdate(self) {
      const boost = gsap.utils.clamp(1, 7, Math.abs(self.getVelocity()) / 220);
      loops.forEach((l) => {
        gsap.to(l, { timeScale: boost * self.direction, duration: 0.15, overwrite: true });
        gsap.to(l, { timeScale: self.direction, duration: 1.2, delay: 0.2 });
      });
    },
  });

  /* --- Pledge: ribbon returns to centre stage --- */
  travel("join", "pledge", { trigger: ".pledge", start: "top bottom", end: "top top" });
  gsap.from([".pledge__sub", ".pledge__actions"], {
    y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out",
    scrollTrigger: { trigger: ".pledge__inner", start: "top 70%", once: true },
  });

  /* --- Footer: giant outline word rises --- */
  gsap.from(".footer__big", {
    yPercent: 60, opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".footer", start: "top bottom", end: "top 40%", scrub: true },
  });

  /* --- Page progress drives the dust; nav highlights the current section --- */
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => (pageProgress = s.progress) });
  ScrollTrigger.create({
    trigger: ".numbers",
    start: "top 40px",
    end: "bottom 40px",
    toggleClass: { targets: ".nav", className: "nav--light" },
  });
  ["why", "signs", "checks", "join"].forEach((id) => {
    const link = $(`.nav__links a[href="#${id}"]`);
    ScrollTrigger.create({
      trigger: "#" + id,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => link.classList.toggle("is-active", self.isActive),
    });
  });
}

/* ---------------------------------------------------------
   6. INTERACTIONS
   --------------------------------------------------------- */
function interactions() {
  addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
  });

  if (finePointer && !reduceMotion) {
    // Cursor
    const cursor = $(".cursor");
    const dotX = gsap.quickTo(".cursor__dot", "x", { duration: 0.1 });
    const dotY = gsap.quickTo(".cursor__dot", "y", { duration: 0.1 });
    const ringX = gsap.quickTo(".cursor__ring", "x", { duration: 0.5, ease: "power3" });
    const ringY = gsap.quickTo(".cursor__ring", "y", { duration: 0.5, ease: "power3" });
    addEventListener("pointermove", (e) => {
      dotX(e.clientX); dotY(e.clientY); ringX(e.clientX); ringY(e.clientY);
    });
    $$("a, button, .tilt").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });

    // Magnetic buttons
    $$(".magnetic").forEach((btn) => {
      const label = btn.querySelector("span");
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        gsap.to(btn, { x: dx * 0.3, y: dy * 0.35, duration: 0.4, ease: "power3.out" });
        gsap.to(label, { x: dx * 0.12, y: dy * 0.12, duration: 0.4, ease: "power3.out" });
      });
      btn.addEventListener("pointerleave", () => {
        gsap.to([btn, label], { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" });
      });
    });

    // 3D tilt cards
    $$(".tilt").forEach((card) => {
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 16);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 16);
      });
      card.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
  }

  // Pledge
  const pledgeBtn = $("[data-pledge]");
  const status = $(".pledge__status");
  const KEY = "pinkout-pledged";
  const setDone = () => {
    pledgeBtn.classList.add("is-done");
    pledgeBtn.querySelector("span").textContent = "You’re in. Thank you 💗";
  };
  try { if (localStorage.getItem(KEY)) setDone(); } catch {}

  pledgeBtn.addEventListener("click", () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setDone();
    status.textContent = "Pledge saved on this device. Now pass the six signs to one person you love.";
    if (reduceMotion) return;
    gsap.to(ribbon, { spin: "+=" + TAU, duration: 1.8, ease: "expo.out" });
    gsap.fromTo(ribbon, { pulse: 0.16 }, { pulse: 0, duration: 1.6, ease: "elastic.out(1, 0.35)" });
    burstConfetti(pledgeBtn);
  });

  // Share
  const shareBtn = $("[data-share]");
  shareBtn.addEventListener("click", async () => {
    const data = { title: "Pink Out", text: "Six signs of breast cancer worth a check — and a pink day this October.", url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(location.href);
        status.textContent = "Link copied — paste it in the group chat.";
      }
    } catch (err) {
      if (err?.name !== "AbortError") status.textContent = "Couldn’t share automatically — copy the address bar link instead.";
    }
  });
}

function burstConfetti(origin) {
  const layer = $(".confetti");
  const box = layer.getBoundingClientRect();
  const r = origin.getBoundingClientRect();
  const ox = r.left + r.width / 2 - box.left;
  const oy = r.top + r.height / 2 - box.top;
  const colors = ["#ff3d8b", "#ff8fb8", "#ffe3ee", "#ff1f75", "#fff4f8"];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement("i");
    p.style.background = colors[i % colors.length];
    p.style.left = ox + "px";
    p.style.top = oy + "px";
    layer.appendChild(p);
    const angle = gsap.utils.random(-Math.PI * 0.95, -Math.PI * 0.05);
    const power = gsap.utils.random(220, 620);
    gsap.timeline({ onComplete: () => p.remove() })
      .set(p, { xPercent: -50, yPercent: -50, scale: gsap.utils.random(0.5, 1.2), rotate: gsap.utils.random(0, 360) })
      .to(p, { x: Math.cos(angle) * power, y: Math.sin(angle) * power, rotate: "+=" + gsap.utils.random(-540, 540), duration: 0.9, ease: "expo.out" })
      .to(p, { y: "+=" + gsap.utils.random(260, 520), x: "+=" + gsap.utils.random(-80, 80), opacity: 0, duration: 1.6, ease: "power1.in" }, ">-0.2");
  }
}

/* ---------------------------------------------------------
   BOOT
   --------------------------------------------------------- */
interactions();
if (reduceMotion) {
  intro();
} else {
  revealHeadings();
  scenes();
  intro();
}
ScrollTrigger.refresh();
