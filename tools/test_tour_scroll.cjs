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
    listeners.wheel({ deltaY, deltaX: 0, deltaMode: 0, cancelable: true, clientX: 200, clientY: 200,
      preventDefault: () => { prevented = true; }, ...extra });
    return prevented;
  }
  function key(key) {
    listeners.keydown({ key, code: key, target: { closest: () => false }, preventDefault() {} });
  }
  return { advance, wheel, key, card, y: () => ctx.scrollY, position: () => ctx.position };
}

test('a flick locks onto one world and its fading momentum cannot queue another', () => {
  const t = tour();
  [80, 60, 40, 20, 8, 4, 3].forEach((d) => t.wheel(d));
  for (let i = 0; i < 80; i++) t.wheel(3);
  t.advance(1800);
  assert.equal(t.position(), 3);
});

test('a new swipe during the tail works without silence or pointer movement', () => {
  const t = tour();
  const staleTarget = { closest: () => { throw new Error('Must not consult a stale target'); } };
  for (let i = 0; i < 3; i++) {
    if (i === 0) t.wheel(60);
    else [8, 16, 32, 48, 48, 48, 40].forEach((d) => t.wheel(d, 16, { target: staleTarget }));
    for (let j = 0; j < 55; j++) t.wheel(0.5);
    assert.equal(t.position(), 3 + i);
  }
});

test('continued wheel input advances at most one world per transition instead of freezing', () => {
  const t = tour();
  for (let i = 0; i < 120; i++) t.wheel(40);
  t.advance(1200);
  assert.ok(t.position() >= 4 && t.position() <= 5);
  assert.equal(t.position(), Math.round(t.position()));
});

test('a quiet new swipe works as soon as the transition lock finishes', () => {
  const t = tour();
  t.wheel(60);
  t.advance(720);
  t.wheel(40);
  t.advance(1000);
  assert.equal(t.position(), 4);
});

test('a pause or direction bounce during animation cannot queue a second world', () => {
  const t = tour();
  t.wheel(80);
  t.wheel(-20, 100);
  t.wheel(40, 350);
  t.advance(2000);
  assert.equal(t.position(), 3);
});

test('an isolated rising momentum spike after landing does not unlock another world', () => {
  const t = tour();
  t.wheel(80);
  for (let i = 0; i < 50; i++) t.wheel(3);
  [6, 15, 30, 50, 25, 10, 4].forEach((d) => t.wheel(d));
  t.advance(1800);
  assert.equal(t.position(), 3);
});

test('gradually decaying momentum after landing does not count as sustained input', () => {
  const t = tour();
  t.wheel(100);
  for (let i = 0; i < 100; i++) t.wheel(80 * Math.pow(0.97, i));
  t.advance(1800);
  assert.equal(t.position(), 3);
});

test('direction can reverse after the transition without waiting for silence', () => {
  const t = tour();
  t.wheel(80);
  for (let i = 0; i < 50; i++) t.wheel(0.5);
  [-8, -16, -32, -48, -48, -48, -40].forEach((d) => t.wheel(d));
  t.advance(1000);
  assert.equal(t.position(), 2);
});

test('small deliberate input can resume scrolling without moving the pointer', () => {
  const t = tour();
  t.wheel(50);
  for (let i = 0; i < 50; i++) t.wheel(0.5);
  for (let i = 0; i < 30; i++) t.wheel(5);
  t.advance(1000);
  assert.equal(t.position(), 4);
});

test('diagonal momentum is held while the tour is locked', () => {
  const t = tour();
  t.wheel(80);
  assert.equal(t.wheel(20, 16, { deltaX: 30 }), true);
  t.advance(1000);
  assert.equal(t.position(), 3);
});

test('Details scrolls its current card, then hands off to exactly one world', () => {
  const t = tour();
  t.card.open = true;
  t.card.scrollTop = 580;
  assert.equal(t.wheel(10), true);
  assert.equal(t.card.scrollTop, 590);
  assert.equal(t.y(), 1600);
  t.wheel(50);
  t.advance(1000);
  assert.equal(t.card.scrollTop, 600);
  assert.equal(t.position(), 3);
});

test('incoming tail stays locked at finale; a new outward swipe releases the page', () => {
  const t = tour({ start: 8 });
  t.wheel(60);
  for (let i = 0; i < 70; i++) assert.equal(t.wheel(3), true);
  assert.equal(t.position(), 9);
  assert.equal(t.wheel(40, 200), false);
});

test('reduced motion retains one-world steps and a finite wheel lock', () => {
  const t = tour({ motion: 'off' });
  t.wheel(60);
  for (let i = 0; i < 50; i++) t.wheel(0.5);
  assert.equal(t.position(), 3);
  [8, 16, 32, 48, 48, 48, 40].forEach((d) => t.wheel(d));
  assert.equal(t.position(), 4);
});

test('keyboard still steps one world in both directions', () => {
  const t = tour();
  t.key('ArrowDown');
  t.advance(1000);
  assert.equal(t.position(), 3);
  t.key('ArrowUp');
  t.advance(1000);
  assert.equal(t.position(), 2);
});

test('zoom, initial horizontal gestures, fallback and uncancelable events stay native', () => {
  for (const extra of [{ ctrlKey: true }, { deltaX: 50 }, { cancelable: false }]) {
    const t = tour();
    assert.equal(t.wheel(40, 16, extra), false);
    assert.equal(t.y(), 1600);
  }
  assert.equal(tour({ live: false }).wheel(40), false);
});

test('line and page wheel events each step one world', () => {
  for (const deltaMode of [1, 2]) {
    const t = tour();
    t.wheel(1, 16, { deltaMode });
    t.advance(1000);
    assert.equal(t.position(), 3);
  }
});
