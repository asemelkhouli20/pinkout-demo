// PinkOut Partners — language switching. English lives in the HTML; Arabic comes from copy.js.
import { AR, DYN } from './copy.js?v=22';
import { get, set, safeStore, $$ } from './store.js?v=20';


// Remember the English text once, so switching back never needs a reload.
function captureEnglish() {
  $$('[data-i18n]').forEach((el) => { if (el.dataset.en === undefined) el.dataset.en = el.textContent; });
  $$('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr] = pair.split(':');
      const store = `en${attr.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())}`;
      if (el.dataset[store] === undefined) el.dataset[store] = el.getAttribute(attr) || '';
    });
  });
}

function apply(lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = (lang === 'ar' ? document.body.dataset.titleAr : document.body.dataset.titleEn) || document.title;

  $$('[data-i18n]').forEach((el) => {
    const text = lang === 'ar' ? AR[el.dataset.i18n] : el.dataset.en;
    if (text !== undefined) el.textContent = text;
  });
  $$('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      const store = `en${attr.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())}`;
      const text = lang === 'ar' ? AR[key] : el.dataset[store];
      if (text !== undefined) el.setAttribute(attr, text);
    });
  });
  // The toggle always offers the *other* language, written in that language.
  $$('[data-lang-toggle]').forEach((btn) => {
    btn.textContent = lang === 'ar' ? 'English' : 'العربية';
    btn.lang = lang === 'ar' ? 'en' : 'ar';
  });
}

/** Translate a runtime string: t('form.title.beauty'). Functions are returned as-is. */
export function t(path) {
  return path.split('.').reduce((node, part) => (node == null ? node : node[part]), DYN[get('lang')]);
}

export function initI18n() {
  captureEnglish();
  const fromUrl = new URLSearchParams(location.search).get('lang');
  const saved = safeStore.get('localStorage', 'po-lang');
  const lang = ['en', 'ar'].includes(fromUrl) ? fromUrl : ['en', 'ar'].includes(saved) ? saved : 'en';
  set('lang', lang);
  apply(lang);

  $$('[data-lang-toggle]').forEach((btn) => btn.addEventListener('click', () => {
    const next = get('lang') === 'ar' ? 'en' : 'ar';
    safeStore.set('localStorage', 'po-lang', next);
    apply(next);
    set('lang', next);
  }));
}
