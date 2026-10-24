// PinkOut Partners — shared state. One source of truth for the map, panel, form and page.
// Keys: lang ('en'|'ar'), zone (id|null), track ('all'|'event'|'beauty'|'shop'), for (''|track), motion ('full'|'reduced')

const state = { lang: 'en', zone: null, track: 'all', for: '', motion: 'full' };
const listeners = new Map();

export const get = (key) => state[key];

export function set(key, value) {
  if (state[key] === value) return;
  state[key] = value;
  (listeners.get(key) || []).forEach((fn) => fn(value));
}

export function on(key, fn) {
  if (!listeners.has(key)) listeners.set(key, []);
  listeners.get(key).push(fn);
}

// Storage that never throws (private mode, blocked storage).
export const safeStore = {
  get(area, key) { try { return window[area].getItem(key); } catch { return null; } },
  set(area, key, value) { try { window[area].setItem(key, value); } catch { /* ignore */ } },
  remove(area, key) { try { window[area].removeItem(key); } catch { /* ignore */ } },
};

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
