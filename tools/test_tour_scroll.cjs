// Replay wheel streams against the actual tour handlers with a deterministic animation clock.
// Run: node --test tools/test_tour_scroll.cjs
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const source = readFileSync(require('node:path').join(__dirname, '../assets/js/tour.js'), 'utf8');
const handlers = source.slice(source.indexOf('  let animating ='), source.indexOf('  plan.forEach((r) => r.addEventListener'));

function tour({ start = 2, motion = 'full', live = true } = {}) {
  let now = 0, frames = [];
  const listeners = {};
  const card = {
    open: false, scrollTop: 0, scrollHeight: 900, clientHeight: 300,
    hasAttribute: () => card.open,
    getBoundingClientRect: () => ({ left: 0, right: 500, top: 0, bottom: 500 }),
  };
  const ctx = vm.createContext({
    Math, innerHeight: 800, scrollY: start * 800, position: start, last: 9,
    get: () => motion,
    performance: { now: () => now },
    addEventListener: (name, handler) => { listeners[name] = handler; },
    requestAnimationFrame: (frame) => { frames.push(frame); },
    root: {
      classList: { contains: () => live },
      getBoundingClientRect: () => ({ top: -ctx.scrollY, bottom: 8000 - ctx.scrollY }),
    },
    scrollTo: (x, y) => { ctx.scrollY = y; },
    measure: () => { ctx.position = Math.max(0, Math.min(9, ctx.scrollY / 800)); },
  });
  ctx.stops = Array.from({ length: 10 }, (_, i) => ({
    getBoundingClientRect: () => ({ top: i * 800 - ctx.scrollY, height: 800 }),
    querySelector: () => card,
  }));
  vm.runInContext(handlers, ctx);
  function advance(ms) {
    const end = now + ms;
    while (now < end) {
      now = Math.min(now + 16, end);
      const pending = frames; frames = [];
      pending.forEach((f) => f(now));
      ctx.measure();
    }
  }
  function wheel(deltaY, ms = 16, extra = {}) {
    advance(ms);
    let prevented = false;
    listeners.wheel({ deltaY, deltaX: 0, deltaMode: 0, clientX: 200, clientY: 200,
      preventDefault: () => { prevented = true; }, ...extra });
    return prevented;
  }
  return { advance, wheel, card, position: () => ctx.position };
}

test('one long swipe with a noisy momentum spike advances exactly one stop', () => {
  const t = tour();
  [60, 100, 80, 40, 15, 7, 20, 8, 5].forEach((d) => t.wheel(d));
  for (let i = 0; i < 100; i++) t.wheel(4 + i % 2);
  t.advance(1500);
  assert.equal(t.position(), 3);
});

test('a long steady stream cannot auto-repeat after the camera lands', () => {
  const t = tour();
  for (let i = 0; i < 150; i++) t.wheel(40);
  t.advance(1000);
  assert.equal(t.position(), 3);
});

test('subpixel momentum keeps the same swipe alive', () => {
  const t = tour();
  t.wheel(60);
  for (let i = 0; i < 70; i++) t.wheel(0.4);
  t.wheel(8);
  t.advance(1500);
  assert.equal(t.position(), 3);
});

test('another swipe works with an unmoved pointer and a stale event target', () => {
  const t = tour();
  const staleTarget = { closest: () => { throw new Error('Must not use the old target to choose a card'); } };
  for (let i = 0; i < 3; i++) {
    t.wheel(50, 250, { target: staleTarget });
    t.advance(1000);
  }
  assert.equal(t.position(), 5);
});

test('acceleration during a swipe cannot queue another stop', () => {
  const t = tour();
  [80, 60, 40, 20, 8, 4, 3].forEach((d) => t.wheel(d, 40));
  [6, 15, 30, 50, 25, 10, 4].forEach((d) => t.wheel(d));
  t.advance(2000);
  assert.equal(t.position(), 3);
  t.wheel(50, 350);
  t.advance(1000);
  assert.equal(t.position(), 4);
});

test('a rising momentum tail after landing cannot start another stop', () => {
  const t = tour();
  t.wheel(80);
  for (let i = 0; i < 55; i++) t.wheel(3);
  [6, 15, 30, 50, 25, 10, 4].forEach((d) => t.wheel(d));
  t.advance(1500);
  assert.equal(t.position(), 3);
});

test('a delivery gap during animation cannot queue another stop', () => {
  const t = tour();
  t.wheel(80);
  t.wheel(30, 350);
  t.advance(1800);
  assert.equal(t.position(), 3);
});

test('direction bounce during a swipe cannot reverse or queue movement', () => {
  const t = tour();
  t.wheel(80);
  t.wheel(-20);
  t.wheel(30);
  t.advance(1800);
  assert.equal(t.position(), 3);
});

test('diagonal momentum stays captured and cannot scroll the page underneath the animation', () => {
  const t = tour();
  t.wheel(80);
  assert.equal(t.wheel(20, 16, { deltaX: 30 }), true);
  t.advance(1000);
  assert.equal(t.position(), 3);
});

test('small direction jitter is held but deliberate reversal works', () => {
  const t = tour();
  t.wheel(60);
  [-1, 4, -2, 3].forEach((d) => t.wheel(d));
  t.advance(1100);
  assert.equal(t.position(), 3);
  t.wheel(-30);
  t.advance(900);
  assert.equal(t.position(), 2);
});

test('finale holds the incoming tail and releases a new outward swipe', () => {
  const t = tour({ start: 8 });
  t.wheel(60);
  for (let i = 0; i < 70; i++) assert.equal(t.wheel(4), true);
  assert.equal(t.position(), 9);
  assert.equal(t.wheel(40, 350), false);
});

test('reduced motion still advances once per swipe', () => {
  const t = tour({ motion: 'off' });
  for (let i = 0; i < 100; i++) t.wheel(40);
  assert.equal(t.position(), 3);
  t.wheel(40, 350);
  assert.equal(t.position(), 4);
});

test('expanded card scrolls first, then hands off once at its end', () => {
  const t = tour();
  t.card.open = true;
  assert.equal(t.wheel(40), false);
  t.card.scrollTop = 600;
  assert.equal(t.wheel(35), true);
  for (let i = 0; i < 80; i++) t.wheel(4);
  assert.equal(t.position(), 3);
});

test('zoom, horizontal scrolling, non-live tour and outward edges remain native', () => {
  assert.equal(tour().wheel(40, 16, { ctrlKey: true }), false);
  assert.equal(tour().wheel(5, 16, { deltaX: 50 }), false);
  assert.equal(tour({ live: false }).wheel(40), false);
  assert.equal(tour({ start: 0 }).wheel(-40), false);
  assert.equal(tour({ start: 9 }).wheel(40), false);
});

test('line and page wheel deltas move one stop', () => {
  for (const deltaMode of [1, 2]) {
    const t = tour();
    t.wheel(1, 16, { deltaMode });
    t.advance(900);
    assert.equal(t.position(), 3);
  }
});
