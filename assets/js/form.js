// PinkOut Partners — application dialog: one form, three branches (event · beauty · shop).
// Steps: [type] → about (branch) → details → review → done. Preview mode while CONFIG.applicationEndpoint is null.
import { CONFIG } from './config.js?v=20';
import { get, on, safeStore, $, $$ } from './store.js?v=20';
import { t } from './i18n.js?v=24';
import { ZONES, THEMES } from './data.js?v=22';

const ICONS = {
  event: '<svg viewBox="0 0 24 24"><path d="M5 21V10a7 7 0 0 1 14 0v11"/><path d="M3 21h18"/></svg>',
  beauty: '<svg viewBox="0 0 24 24"><path d="M9 3h6v4H9zM8 7h8l1 14H7z"/></svg>',
  shop: '<svg viewBox="0 0 24 24"><path d="M4 9l1.5-5h13L20 9M4 9h16v11H4z"/></svg>',
};
const DRAFT_KEY = 'po-apply-draft';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FREE_MAIL = /@(gmail|hotmail|outlook|yahoo|icloud|live)\./i;

let dlg, form;
let flow = [];
let idx = 0;
let type = '';
let opener = null;
let sending = false;

const step = () => flow[idx];
const stepEl = (name = step()) => $$(`[data-step="${name}"]`, form).find((el) => !el.dataset.branch || el.dataset.branch === type);

/* ---------- Option lists built from data (labels follow the language) ---------- */
function buildOptions() {
  const lang = get('lang');
  $('[data-zone-options]', form).innerHTML = ZONES.map((z) =>
    `<label class="chip-input"><input type="checkbox" name="zones" value="${z.id}"><span class="chip chip--dot" style="--zone-c:var(${z.colour})">${z.name}</span></label>`).join('');
  $('[data-theme-options]', form).innerHTML = THEMES.map((th) =>
    `<label class="chip-input"><input type="checkbox" name="themes" value="${th.id}"><span class="chip">${th[lang]}</span></label>`).join('');
}
function relabelThemes() {
  const lang = get('lang');
  $$('[data-theme-options] input', form).forEach((input) => {
    input.nextElementSibling.textContent = THEMES.find((th) => th.id === input.value)[lang];
  });
}

/* ---------- Personal touch: colour, icon, words for the chosen type ---------- */
function personalise() {
  dlg.dataset.type = type;
  $('[data-dlg-title]', dlg).textContent = type ? t(`form.title.${type}`) : t('form.neutralTitle');
  const intro = $('[data-dlg-intro]', dlg);
  intro.hidden = !type;
  intro.textContent = type ? t(`form.intro.${type}`) : '';
  const icon = $('[data-dlg-icon]', dlg);
  icon.hidden = !type;
  icon.innerHTML = type ? ICONS[type] : '';

  $('[data-org-label]', form).textContent = t(`form.org.${type || 'event'}`);
  $('[data-org-req]', form).hidden = type === 'beauty';
  $('[data-jobtitle-field]', form).hidden = type !== 'event';
  $('[data-phone-req]', form).hidden = type !== 'beauty';
  $('[data-deck-label]', form).textContent = t(`form.deck.${type}`);
}

/* ---------- Rendering the current step ---------- */
function render() {
  $$('[data-step]', form).forEach((el) => { el.hidden = el !== stepEl(); });
  const counted = flow.filter((s) => s !== 'review' && s !== 'done');
  const s = step();
  const progress = $('[data-progress]', dlg);
  if (counted.includes(s)) progress.textContent = t('form.progress')(counted.indexOf(s) + 1, counted.length);
  else progress.textContent = s === 'review' ? t('form.review') : t('form.doneLabel');
  const pct = s === 'done' || s === 'review' ? 100 : ((counted.indexOf(s) + 1) / counted.length) * 100;
  dlg.style.setProperty('--progress', `${pct}%`);

  const back = $('[data-back]', dlg);
  const next = $('[data-next]', dlg);
  back.hidden = idx === 0 || s === 'done';
  next.textContent = { details: t('form.toReview'), review: t('form.send'), done: t('form.close') }[s] || t('form.next');
  next.removeAttribute('aria-busy');
  dlg.querySelector('.dialog__body:not([hidden])')?.scrollTo?.(0, 0);
}

function focusStep() {
  const el = stepEl();
  const target = el && (el.querySelector('input:not([type=hidden]):not(.hp), select, textarea, [data-done-text]') || el);
  if (target) { if (target.matches('[data-done-text]')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
}

/* ---------- Validation ---------- */
function clearErrors() {
  $$('[data-errors]', form).forEach((box) => { box.hidden = true; $('ul', box).innerHTML = ''; });
  $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
  $$('.field__error[data-generated]', form).forEach((el) => el.remove());
  $$('[aria-describedby]', form).forEach((el) => el.removeAttribute('aria-describedby'));
}

function validate() {
  const errs = [];
  const el = stepEl();
  const add = (target, key, focusEl = target) => errs.push({ target, msg: t(`form.err.${key}`), focusEl });
  if (step() === 'type' && !type) add($('.typecards', form), 'partnerType', $('input[name="partnerType"]', form));
  if (step() === 'about') {
    $$('[data-required]', el).forEach((fs) => {
      if (!$('input:checked', fs)) add(fs, fs.dataset.required, $('input', fs));
    });
    $$('[data-required-input]', el).forEach((input) => {
      if (!input.value.trim()) add(input, input.name);
    });
  }
  if (step() === 'details') {
    const f = form.elements;
    if (type !== 'beauty' && !f.org.value.trim()) add(f.org, 'org');
    if (!f.name.value.trim()) add(f.name, 'name');
    if (!EMAIL.test(f.email.value.trim())) add(f.email, 'email');
    if (type === 'beauty' && f.phone.value.replace(/\D/g, '').length < 8) add(f.phone, 'phone');
    if (!f.consent.checked) add(f.consent, 'consent');
  }
  return errs;
}

function showErrors(errs) {
  const box = $('[data-errors]', stepEl());
  const list = $('ul', box);
  errs.forEach((err, i) => {
    const id = `err-${step()}-${i}`;
    err.target.setAttribute('aria-invalid', 'true');
    if (err.target.matches('input:not([type=checkbox]):not([type=radio]), select, textarea')) {
      const msg = Object.assign(document.createElement('span'), { className: 'field__error', id, textContent: err.msg });
      msg.dataset.generated = '';
      err.target.after(msg);
      err.target.setAttribute('aria-describedby', id);
    }
    const li = document.createElement('li');
    const a = Object.assign(document.createElement('a'), { href: '#', textContent: err.msg });
    a.addEventListener('click', (e) => { e.preventDefault(); err.focusEl.focus(); });
    li.append(a);
    list.append(li);
  });
  box.hidden = false;
  box.focus();
}

/* ---------- Review + payload ---------- */
function answers() {
  const scope = [stepEl('about'), stepEl('details')];
  const out = [];
  const seen = new Set();
  const labels = t('form.labels');
  out.push([labels.partnerType, t(`trackName.${type}`)]);
  scope.forEach((root) => {
    $$('input, select, textarea', root).forEach((input) => {
      const name = input.name;
      if (!name || seen.has(name) || name === 'consent' || name === 'website') return;
      let value;
      if (input.type === 'checkbox' || input.type === 'radio') {
        if (name === 'wantsDeck') value = input.checked ? t('form.yes') : t('form.no');
        else value = $$(`input[name="${name}"]:checked`, root).map((i) => i.nextElementSibling.textContent).join(', ');
      } else if (input.tagName === 'SELECT') {
        value = input.value ? input.selectedOptions[0].textContent : '';
      } else {
        value = input.value.trim();
      }
      seen.add(name);
      if (value && !input.closest('[hidden]:not([data-step])')) out.push([name === 'org' ? $('[data-org-label]', form).textContent : labels[name] || name, value]);
    });
  });
  return out;
}

function buildReview() {
  const dl = $('[data-review]', form);
  dl.innerHTML = '';
  answers().forEach(([k, v]) => {
    const row = document.createElement('div');
    const dt = Object.assign(document.createElement('dt'), { textContent: k });
    const dd = Object.assign(document.createElement('dd'), { textContent: v });
    if (/@|https?:|^\+?\d/.test(v)) dd.classList.add('t-ltr');
    row.append(dt, dd);
    dl.append(row);
  });
}

function payload() {
  const data = new FormData(form);
  const all = (name) => data.getAll(name);
  const shared = {
    partnerType: type,
    name: data.get('name'), email: data.get('email'), phone: data.get('phone'), message: data.get('message'),
    wantsDeck: data.get('wantsDeck') === 'on', lang: get('lang'), consent: data.get('consent') === 'on',
    source: form.dataset.source || 'page',
  };
  const branch = {
    event: { interest: data.get('interest'), goals: all('goals'), zones: all('zones'), themes: all('themes'), timing: data.get('timing'), company: data.get('org'), jobTitle: data.get('jobTitle') },
    beauty: { applyingAs: data.get('applyingAs'), services: all('services'), where: 'app-home', experience: data.get('experience'), license: data.get('license'), portfolio: data.get('portfolio'), businessName: data.get('org') },
    shop: { brand: data.get('org'), categories: all('categories'), where: 'app', storeLink: data.get('storeLink'), productCount: data.get('productCount') },
  }[type];
  return { ...shared, ...branch };
}

async function send() {
  if (sending) return;
  const done = $('[data-done-text]', form);
  const finish = (text, kind) => {
    done.textContent = text;
    done.className = `notice${kind ? ` notice--${kind}` : ''}`;
    safeStore.remove('sessionStorage', DRAFT_KEY);
    idx = flow.indexOf('done');
    render();
    focusStep();
  };
  if (form.elements.website.value) return finish(t(`form.done.${type}`)); // honeypot: quietly accept
  if (!CONFIG.applicationEndpoint) return finish(t(`form.done.${type}`)); // preview mode: nothing is sent

  sending = true;
  const next = $('[data-next]', dlg);
  next.setAttribute('aria-busy', 'true');
  next.textContent = t('form.sending');
  try {
    const res = await fetch(CONFIG.applicationEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
    if (!res.ok) throw new Error(String(res.status));
    finish(t(`form.sent.${type}`), 'ok');
  } catch {
    next.removeAttribute('aria-busy');
    next.textContent = t('form.send');
    const box = $('[data-errors]', stepEl()) || stepEl().insertAdjacentElement('afterbegin', Object.assign(document.createElement('div'), { className: 'notice notice--error' }));
    box.textContent = t('form.failed');
    box.hidden = false;
  } finally {
    sending = false;
  }
}

/* ---------- Navigation ---------- */
function next() {
  const s = step();
  if (s === 'done') return dlg.close();
  if (s === 'review') return send();
  clearErrors();
  const errs = validate();
  if (errs.length) return showErrors(errs);
  if (s === 'details') buildReview();
  idx++;
  render();
  focusStep();
}
function back() {
  clearErrors();
  idx = Math.max(0, idx - 1);
  render();
  focusStep();
}

/* ---------- Draft (session only; never consent, never the honeypot) ---------- */
function saveDraft() {
  const data = {};
  $$('input, select, textarea', form).forEach((el) => {
    if (!el.name || el.name === 'consent' || el.name === 'website') return;
    if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) (data[el.name] ||= []).push(el.value); }
    else if (el.value) data[el.name] = el.value;
  });
  safeStore.set('sessionStorage', DRAFT_KEY, JSON.stringify(data));
}
function restoreDraft() {
  let data;
  try { data = JSON.parse(safeStore.get('sessionStorage', DRAFT_KEY) || 'null'); } catch { data = null; }
  if (!data) return;
  $$('input, select, textarea', form).forEach((el) => {
    if (!(el.name in data) || el.name === 'partnerType') return;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = data[el.name].includes(el.value);
    else el.value = data[el.name];
  });
}

/* ---------- Public API ---------- */
export function openApplication({ type: preset = '', interest, zone, theme, goal, deck, source, opener: from } = {}) {
  if (sending) return;
  opener = from || document.activeElement;
  restoreDraft();
  const radios = $$('input[name="partnerType"]', form);
  if (['event', 'beauty', 'shop'].includes(preset)) {
    type = preset;
    radios.forEach((r) => { r.checked = r.value === preset; });
    flow = ['about', 'details', 'review', 'done'];
  } else {
    type = radios.find((r) => r.checked)?.value || '';
    flow = ['type', 'about', 'details', 'review', 'done'];
  }
  const check = (name, value) => { const input = $(`input[name="${name}"][value="${value}"]`, form); if (input) input.checked = true; };
  if (interest) check('interest', interest);
  if (zone) check('zones', zone);
  if (theme) check('themes', theme);
  if (goal) check('goals', goal);
  if (deck) form.elements.wantsDeck.checked = true;
  // The name typed in the journey carries into the form (organisation, or the artist's own name).
  const brand = safeStore.get('sessionStorage', 'po-brand');
  const brandField = type === 'beauty' ? form.elements.name : form.elements.org;
  if (brand && brandField && !brandField.value) brandField.value = brand;
  form.dataset.source = source || 'page';
  idx = 0;
  clearErrors();
  personalise();
  render();
  if (!dlg.open) dlg.showModal();
  focusStep();
}

export function initForm() {
  dlg = $('#apply');
  form = $('[data-apply-form]', dlg);
  buildOptions();

  $$('input[name="partnerType"]', form).forEach((r) => r.addEventListener('change', () => { type = r.value; personalise(); clearErrors(); }));
  // Type cards: arrow keys move between them (native radio behaviour), Enter continues.
  $('[data-next]', dlg).addEventListener('click', next);
  $('[data-back]', dlg).addEventListener('click', back);
  $('[data-dlg-close]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // backdrop click
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio]):not(.hp)')) { e.preventDefault(); next(); }
  });
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);
  form.elements.email.addEventListener('blur', () => {
    $('[data-email-hint]', form).hidden = !(type === 'event' && FREE_MAIL.test(form.elements.email.value));
  });

  on('lang', () => {
    relabelThemes();
    if (!dlg.open) return;
    personalise();
    render();
    if (step() === 'review') buildReview();
    if (step() === 'done') { /* keep the message already shown */ }
  });
}
