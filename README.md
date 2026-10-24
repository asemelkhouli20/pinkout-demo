# PinkOut Partners

Partner website for PinkOut (Riyadh). The home page `index.html` is the **event partners' page** (it opens on the venue tour); `beauty.html` and `shop.html` are the other partner types. Static HTML/CSS/JS, GSAP + Three.js vendored, English-first with Arabic (RTL).

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

Edit `src/partials/*.html` (or the page list in `tools/build_pages.py`), then run the script. Don't edit `index.html`, `beauty.html` or `shop.html` directly; they say so at the top. (A page that must be kept by hand goes in `HAND_MAINTAINED` in the script.) The old home page is archived in `_archive/old-home/`. The output is plain static HTML, so deployment is unchanged.

## Useful links

- `/?for=event`, `/?for=beauty`, `/?for=shop`: personal welcome for each partner type (send these in outreach).
- `/?apply=beauty`: opens the beauty application directly.
- `/`: the event partners' page (the venue tour, with the themed-day switcher on the map). Old `/event.html` links redirect here (`deploy/nginx.conf`).
- `/beauty.html`, `/shop.html`: the app partner pages; `/beauty.html?walk=4` opens a chapter of the app journey.
- `/?lang=ar`: opens in Arabic.
- `/?motion=off`: no animation (for still screenshots and demos; the footer toggle does the same for visitors).

## The partner walk-through

Story text, camera keyframes and the name-sign position live in `src/journey.json` (EN + AR); then run `python3 tools/build_pages.py`. Camera keys are `[plan x m, plan y m, height]` on the 50 × 45 m concept plan. The 3D model itself is in `assets/js/venue.js` (shared with the map).

## Configure

`assets/js/config.js`:
- `applicationEndpoint`: `null` = preview mode (nothing is sent). Set a same-origin JSON POST URL to turn sending on (payload shape in `docs/system-design.md`).
- `decks`: the three partner decks (sent on request).


## Files

- `index.html` (event partners: the venue tour), `beauty.html`, `shop.html` (generated), `privacy.html`, `credits.html`, `404.html`
- `assets/css/`: `tokens` → `base` → `components` → `layout`
- `assets/js/`:
  - `app.js` (page), `form.js` (application), `i18n.js` + `copy.js` (EN/AR), `store.js` (state), `data.js` (zones), `motion.js` (GSAP)
  - `tour.js` + `tour3d.js` (the venue tour), `venue.js` (the model), `crowd.js` (visitors), `park.js` (the park around it), `themes3d.js` (themed days)
  - `journey.js` + `phone.js` (the app journeys on the beauty and e-commerce pages)
  - `loop.js` ("One booking / one order, three views" on those pages; content in `src/loop-beauty.json` and `src/loop-shop.json`, then rebuild)
  - `vendor/`
- `docs/`: brief, content, system design, UX, wireframe, design system, motion notes, components, QA
- `_archive/`: retired pages and code (old home, internal wireframe and component pages, the old zone map), kept for reference
- `deploy/nginx.conf`: gzip, caching, HTTPS, 404, and it blocks the internal files

## Version rule

Browsers cache `?v=N` files for a year. When you change a file, raise its `?v=` everywhere it's referenced. Internal JS imports must all share the **same** tag, or the shared state module loads twice.
