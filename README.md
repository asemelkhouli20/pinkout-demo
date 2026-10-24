# PinkOut Partners

> **Beauty page handoff (24 Oct 2026):** Read [the beauty journal implementation guide](docs/beauty-journal.md) and [structured AI context](docs/beauty-journal-context.json) before editing `beauty.html`. They describe all 18 app images and every journey step. The latest user direction includes **home and venue** services. This page currently contains intentional local customizations; the build script will overwrite them from older partials.

Partner website for PinkOut (Riyadh): a home page plus **one page per partner type**, `event.html`, `beauty.html` and `shop.html`. Static HTML/CSS/JS, GSAP + Three.js vendored, English-first with Arabic (RTL).

Who belongs where: **event partners** get the whole event (the venue tour: `tour.js` + `tour3d.js` over the miniature in `venue.js`, content in `src/tour.json`); **beauty service** and **e-commerce** partners work in the PinkOut app, so their pages tell the story on a phone (`assets/js/phone.js`, screens in `src/partials/phone-*.html`).

## Run locally

```bash
python3 -m http.server 5173
```

Open http://localhost:5173. Modules need a server; opening the file directly won't work.

## Pages are generated: edit the partials

The four pages are assembled from `src/partials/` so the header, footer, form and map stay identical:

```bash
python3 tools/build_pages.py
```

Edit `src/partials/*.html` (or the page list in `tools/build_pages.py`), then run the script. Don't edit `index.html`, `event.html`, `beauty.html` or `shop.html` directly; they say so at the top. The output is plain static HTML, so deployment is unchanged.

## Useful links

- `/?for=event`, `/?for=beauty`, `/?for=shop`: personal welcome for each partner type (send these in outreach).
- `/?apply=beauty`: opens the beauty application directly.
- `/#world/beauty`: the 3D map focused on a zone (works on every page with the map).
- `/beauty.html`, `/shop.html`, `/event.html`: the partner-type pages. Their map opens pre-filtered to that partner's zones.
- `/event.html?walk=4`: opens a partner page at a walk-through chapter (e.g. the sponsor's stage moment).
- `/?lang=ar`: opens in Arabic.
- `/?motion=off`: no animation (for still screenshots and demos; the footer toggle does the same for visitors).

## The partner walk-through

Story text, camera keyframes and the name-sign position live in `src/journey.json` (EN + AR); then run `python3 tools/build_pages.py`. Camera keys are `[plan x m, plan y m, height]` on the 50 × 45 m concept plan. The 3D model itself is in `assets/js/venue.js` (shared with the map).

## Configure

`assets/js/config.js`:
- `applicationEndpoint`: `null` = preview mode (nothing is sent). Set a same-origin JSON POST URL to turn sending on (payload shape in `docs/system-design.md`).
- `decks`: the three partner decks (sent on request).

Audience figures: in `index.html`, fill a `.stat` and remove its `data-pending` attribute. Pending stats never show.

## Files

- `index.html`, `privacy.html`, `credits.html`, `404.html`
- `assets/css/`: `tokens` → `base` → `components` → `layout`
- `assets/js/`:
  - `app.js` (page)
  - `form.js` (application)
  - `i18n.js` + `copy.js` (EN/AR)
  - `store.js` (state)
  - `data.js` (zones)
  - `motion.js` (GSAP)
  - `map3d.js` / `map2d.js` (map)
  - `vendor/`
- `docs/`: brief, content, system design, UX, wireframe, design system, motion notes, components, QA
- `wireframe.html`, `components.html`: internal review files (blocked by nginx)
- `deploy/nginx.conf`: gzip, caching, HTTPS, 404, and it blocks the internal files

## Version rule

Browsers cache `?v=N` files for a year. When you change a file, raise its `?v=` everywhere it's referenced. Internal JS imports must all share the **same** tag, or the shared state module loads twice.
