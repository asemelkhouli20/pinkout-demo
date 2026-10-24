// PinkOut Partners — one booking (beauty) or one order (shop), three views. Content: src/loop-<track>.json, embedded in
// the page by tools/build_pages.py. The same record steps from request to review; each glass card shows what that
// person sees at that step. Without this script the section stays a short list of who sees what.
import { get, on, $, $$ } from './store.js?v=20';
import { brandName } from './journey.js?v=23';

const ICONS = {
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  brush: '<path d="M18.5 3.5l2 2-9 9-2-2z"/><path d="M9.5 12.5c-2.5 0-4 1.6-4 4 0 1.6-.8 2.6-2 3 4 .8 8-.6 8-4.5z"/>',
  store: '<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  spark: '<path d="M12 3l2 6.5 6.5 2.5-6.5 2.5L12 21l-2-6.5L3.5 12 10 9.5z"/>',
};
const STEP_MS = 3400;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initLoop() {
  const root = $('[data-loop]');
  if (!root) return;
  const data = JSON.parse($('[data-loop-data]', root).textContent);
  const stage = $('[data-loop-stage]', root);
  const n = data.steps.length;
  const S = { mode: data.modes[0].id, view: data.views[0].id, step: 0, playing: false, auto: true, hold: 0 };

  // A value is {en, ar}, or split by mode first: {home: {en, ar}, pinkout: {en, ar}}.
  const pick = (v) => {
    if (v == null) return '';
    const m = v[S.mode] || v;
    return m[get('lang')] ?? m.en ?? '';
  };
  const list = (v) => (Array.isArray(v) ? v : (v && v[S.mode]) || []);
  const name = () => brandName() || data.default[get('lang')];
  const fill = (s, status = '') => s.replaceAll('{name}', name()).replaceAll('{status}', status);
  const ui = (k) => data.ui[get('lang')][k];

  /* ---------- Skeleton (rebuilt when the language changes; the state is kept) ---------- */
  function build() {
    const seg = (label, kind, items, current) => `
      <div class="loop__seg" role="group" aria-label="${esc(label)}"><span class="loop__seg-label" aria-hidden="true">${esc(label)}</span>
        ${items.map((it) => `<button class="loop__opt" type="button" data-${kind}="${it.id}" aria-pressed="${it.id === current}">${esc(pick(it))}</button>`).join('')}
      </div>`;
    const card = (v) => `
      <article class="loop-card" data-view="${v.id}" style="--view-c:${v.c}">
        <header class="loop-card__head">
          <span class="loop-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[v.icon]}</svg></span>
          <span class="loop-card__who"><b>${esc(pick(v))}</b><small>${esc(pick(v.app))}</small></span>
          <span class="loop-card__status" data-status></span>
        </header>
        <div class="loop-card__rec">
          <span class="loop-card__id">${esc(ui('record'))} <span class="t-ltr">${esc(data.record.id)}</span></span>
          <ul class="loop-card__facts">${data.record.facts.map(() => '<li data-fact></li>').join('')}</ul>
        </div>
        <div class="loop-card__msg" data-msg><b data-msg-t></b><p data-msg-x></p></div>
        <div class="loop-card__acts" data-acts></div>
        <p class="loop-card__foot">${esc(pick(v.foot))}</p>
      </article>`;
    stage.innerHTML = `
      <div class="loop__bar">
        ${seg(ui('where'), 'mode', data.modes, S.mode)}
        ${seg(ui('who'), 'view', data.views, S.view)}
        <span class="loop__ctrl">
          <button class="loop__btn" type="button" data-play aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span data-play-label></span></button>
          <button class="loop__btn loop__btn--next" type="button" data-next aria-label="${esc(ui('next'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
        </span>
      </div>
      <ol class="loop__steps">
        ${data.steps.map((st, i) => `<li><button type="button" data-step="${i}"><i class="t-ltr">${i + 1}</i><span data-step-label></span></button></li>`).join('')}
      </ol>
      <div class="loop__cards">
        <span class="loop__thread" aria-hidden="true"></span>
        ${data.views.map(card).join('')}
      </div>
      <p class="loop__caption" aria-live="polite"><b data-cap-who></b> <span data-cap></span></p>
      <span class="concept loop__concept">${esc(ui('concept'))}</span>`;
    root.classList.add('is-live');
    render(false);
  }

  /* ---------- State → text ---------- */
  function render(pulse = true) {
    const step = data.steps[S.step];
    const status = pick(step);
    $$('[data-mode]', stage).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
    $$('[data-view]', stage).forEach((b) => b.matches('button') && b.setAttribute('aria-pressed', String(b.dataset.view === S.view)));
    $$('[data-step]', stage).forEach((b, i) => {
      $('[data-step-label]', b).textContent = pick(data.steps[i]);
      if (i === S.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.toggleAttribute('data-done', i < S.step);
    });
    $('.loop__steps', stage).style.setProperty('--p', String(S.step / (n - 1)));
    $('[data-play-label]', stage).textContent = S.playing ? ui('pause') : ui('play');
    $('[data-play]', stage).setAttribute('aria-pressed', String(S.playing));
    $('[data-play] svg', stage).innerHTML = S.playing ? '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>' : '<path d="M8 5v14l11-7z"/>';

    const cards = $('.loop__cards', stage);
    cards.dataset.viewOn = S.view;
    $$('.loop-card', stage).forEach((card) => {
      const v = card.dataset.view;
      const idle = data.idle?.[v]?.[S.mode];
      const st = idle || data.states[v][step.id];
      card.toggleAttribute('data-idle', !!idle);
      card.toggleAttribute('data-on', v === S.view);
      $('[data-status]', card).textContent = idle ? ui('idleTag') : status;
      $$('[data-fact]', card).forEach((li, i) => { li.textContent = pick(data.record.facts[i]); });
      $('[data-msg-t]', card).textContent = fill(pick(st.t), status);
      $('[data-msg-x]', card).textContent = fill(pick(st.x), status);
      const acts = $('[data-acts]', card);
      acts.replaceChildren(...list(st.a).map((a) => Object.assign(document.createElement('span'), { className: 'loop-card__act', textContent: pick(a) })));
      if (pulse && !idle) { // the change lands in every card at once: one booking, three screens
        const msg = $('[data-msg]', card);
        msg.removeAttribute('data-flash'); void msg.offsetWidth; msg.setAttribute('data-flash', '');
      }
    });
    if (pulse) { cards.removeAttribute('data-pulse'); void cards.offsetWidth; cards.setAttribute('data-pulse', ''); }
    const view = data.views.find((v) => v.id === S.view);
    $('[data-cap-who]', stage).textContent = `${pick(view)}:`;
    $('[data-cap]', stage).textContent = fill(pick(data.captions[S.view]));
  }

  /* ---------- Playing: steps forward on its own while on screen (motion on), until someone takes over ---------- */
  let timer = 0;
  let visible = false;
  const tick = () => {
    if (S.step === n - 1 && S.hold < 1) { S.hold += 1; return; } // rest on the last step, then start again
    S.hold = 0;
    S.step = (S.step + 1) % n;
    render();
  };
  const sync = () => {
    const run = S.playing && visible;
    if (run && !timer) timer = setInterval(tick, STEP_MS);
    if (!run && timer) { clearInterval(timer); timer = 0; }
  };
  const takeOver = () => { S.auto = false; S.playing = false; sync(); };

  stage.addEventListener('click', (e) => {
    const b = e.target.closest('button, .loop-card');
    if (!b) return;
    if (b.dataset.mode) { S.mode = b.dataset.mode; render(); return; }
    if (b.dataset.view) { S.view = b.dataset.view; render(false); return; }
    if (b.dataset.step) { takeOver(); S.step = +b.dataset.step; render(); return; }
    if (b.hasAttribute('data-next')) { takeOver(); S.step = (S.step + 1) % n; render(); return; }
    if (b.hasAttribute('data-play')) {
      S.auto = false;
      S.playing = !S.playing;
      if (S.playing && S.step === n - 1) S.step = 0;
      render(S.playing); sync();
    }
  });
  // the steps rail also works with the arrow keys
  stage.addEventListener('keydown', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const rtl = document.documentElement.dir === 'rtl';
    const d = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
    const i = Math.min(n - 1, Math.max(0, +b.dataset.step + d));
    takeOver(); S.step = i; render();
    $(`[data-step="${i}"]`, stage).focus();
    e.preventDefault();
  });

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && S.auto && get('motion') === 'full') { S.playing = true; render(false); }
    sync();
  }, { threshold: 0.35 }).observe(stage);
  on('motion', (m) => { if (m !== 'full' && S.auto) { S.playing = false; sync(); render(false); } });

  // The section head and the "when plans change" list follow the language too.
  const renderStatic = () => {
    $$('[data-loop-ui]', root).forEach((el) => { el.textContent = ui(el.dataset.loopUi); });
    $$('[data-loop-text]', root).forEach((el) => {
      const [, i, k] = el.dataset.loopText.split('.');
      el.textContent = pick(data.changes[i][k]);
    });
  };
  build();
  renderStatic();
  on('lang', () => { build(); renderStatic(); });
  document.addEventListener('input', (e) => { if (e.target.matches('[data-brand-input]')) render(false); });
}
