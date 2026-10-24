# PinkOut Partners — Components & templates

Live, interactive version: **`components.html`**. It uses the real `tokens.css`, `base.css` and `components.css` the site will load, so what you approve there is what ships.

Naming: one class per component (`.btn`, `.chip`, `.block` …), with variants as `--modifiers`. State lives in ARIA attributes (`aria-pressed`, `aria-current`, `aria-expanded`, `aria-invalid`), never in extra classes, so styling and accessibility can't drift apart.

## Components

| # | Component | Anatomy | Variants | States | Used in | A11y notes |
|---|---|---|---|---|---|---|
| C1 | **Button** `.btn` | label · optional icon | `--primary` (cherry), `--secondary` (white + berry ring), `--quiet` (text), `--sm`, `--icon` | default · hover · pressed · focus-visible · disabled · busy (spinner) | everywhere | `<button>` for actions, `<a>` for navigation; ≥ 44px; busy sets `aria-busy` |
| C2 | **Eyebrow pill** `.eyebrow` | short text | `--butter` (default), `--white` | static | section heads | plain text, not a heading |
| C3 | **Chip** `.chip` | label · optional colour dot | `--zone` (takes `--zone-c`), `--filter` (toggle) | default · hover · selected (`aria-pressed=true`) · focus | zone chips, form choices, theme tags | toggle chips are `<button aria-pressed>` |
| C4 | **Header** `.site-header` | logo · nav pill · lang · enquiry button · menu button | `[data-compact]` after scroll | link active (`aria-current`) · compact · menu open | all pages | skip link first; nav is a `<nav>` landmark |
| C5 | **Mobile menu sheet** `.menu-sheet` | links · lang · enquiry | — | open / closed | ≤ 800px | `<dialog>`, focus trap, Esc closes |
| C6 | **Section head** `.section-head` | eyebrow · h2 · lead | `--center` | — | every section | one h2 per section |
| C7 | **Colour block** `.block` | rounded container | `--white`, `--pink`, `--butter`, `--lavender`, `--mint`, `--peach`, `--sky`, `--rose`, `--film` | — | section wrappers | — |
| C8 | **Hero** `.hero` | film · invitation panel · pause button | — | film playing / paused / poster only | home | pause button has a live label; film `aria-hidden` |
| C9 | **Reason card** `.reason` | icon circle · h3 · text | — | — | Why | — |
| C10 | **Zone panel** `.zone-panel` | concept render · sticker · tag · h3 · text · sponsorship row · activation pills · enquire button · copy-link | desktop side panel / mobile `.sheet` | empty ("Select a zone") · selected | The world | `aria-live="polite"` on title; heading gets focus on select |
| C11 | **Map stage** `.map-stage` | canvas or SVG fallback · poster · disclaimer | `[data-mode=3d|2d|poster]` | loading · ready · fallback | The world | canvas `aria-hidden`; zone buttons are the real controls |
| C12 | **Stat** `.stat` | value · label · source/date | — | real · **pending** (hidden on the live site; dashed in the library) | Audience | value is text, not an image |
| C13 | **Journey** `.journey` | 5 steps + connecting line | horizontal / vertical (mobile) | — | Audience | ordered list |
| C14 | **Offer card** `.offer` | zone tag · title · line | `--sponsor` (large, pink block), `--activation` (white) | default · hover (lift + zone tint) · focus | Opportunities | whole card is one `<button>` that opens the form |
| C15 | **Theme card** `.theme` | image · name · brand-fit chips · sponsor button | — | — | Themed days | image alt describes the scene |
| C16 | **Step** `.step` | number dot · title · line | — | reached (motion only) | How it works | ordered list |
| C17 | **Fact list** `.facts` | label · value rows | — | value "to be announced" in berry-2 | Status | `<dl>` |
| C18 | **FAQ item** `.faq` | question · answer | — | open / closed | FAQ | native `<details>`/`<summary>` |
| C19 | **Closing arch** `.arch-cta` | arch frame · h2 · button | — | — | Closing | — |
| C20 | **Footer** `.site-footer` | logo · links · legal · lang · motion toggle · consumer-site link | — | motion on / off | all pages | motion toggle is a `<button aria-pressed>` |
| C21 | **Field** `.field` | label · control · hint · error | text, email (LTR), tel (LTR), textarea | default · focus · invalid (`aria-invalid` + message) · disabled | form | label always visible; error linked by `aria-describedby` |
| C22 | **Choice group** `.choices` | legend · chips (single or multi) | single (radio semantics) / multi | — | form | `<fieldset>` + `<legend>` |
| C23 | **Checkbox** `.check` | box · label | — | checked · focus · invalid | form (deck, consent) | native input, custom look |
| C24 | **Error summary** `.error-summary` | title · list of links to fields | — | shown on failed submit | form | `role="alert"`, receives focus |
| C25 | **Dialog** `.dialog` | header (title · progress · close) · body · footer actions | desktop modal / mobile full-height sheet | step 1 · step 2 · review · preview-sent · sending · sent · error | enquiry | native `<dialog>`, focus trap, returns focus to opener |
| C26 | **Notice** `.notice` | icon · text | `--info`, `--ok`, `--error` | — | preview mode, form result | `role="status"` |
| C27 | **Toast** `.toast` | short text | — | shows 2.4 s | copy link | `role="status"` |
| C28 | **Concept tag** `.concept` | "Concept" pill on images | — | — | all renders | part of the alt text context |
| C29 | **At-a-glance facts** `.glance` | 4 value + label pairs | — | — | hero, status | `<ul aria-label="At a glance">` |
| C30 | **Goal picker** `.goals` + `.fit` | 5 goal buttons with icons · live summary · offer grid | — | none selected (all shown) · goal selected (matches outlined, others dimmed) | Opportunities | `<button aria-pressed>`; summary is `aria-live` |
| C31 | **Package card** `.package` | badge · name · one line · 3–4 "included" rows (Visibility / Experience / Content / Recap) · enquire | `--featured` | — | Opportunities (sponsorship) | always followed by the *indicative* note |
| C32 | **Comparison table** `.compare` | caption · 5 columns | — | scrolls sideways on phones | Opportunities (sponsorship) | real `<table>` with `scope` headers |
| C33 | **Sticky enquiry bar** `.cta-bar` | Partner deck · Start a partnership | — | hidden while the hero or the form is on screen | phones ≤ 800px | doesn't cover content: page gets bottom padding |
| C34 | **"For you" line** `.so-what` | bold lead-in + one sentence | — | — | section heads | — |
| C35 | **Partner-type door** `.door` | icon · "for whom" · title · line · 2–3 chips · Explore + Apply | `--primary` (event, wide, pink) · `--beauty` (lavender) · `--shop` (peach) | hover lift · focus | after hero (#partner) | Explore is a link to the track; Apply is a button opening the form |
| C36 | **Track head** `.track-head` | outlined number · eyebrow · h2 · apply + deck buttons | — | — | top of each track | number `aria-hidden` |
| C37 | **Channel card** `.channel` | image or app concept · title · line · optional `.badge-soon` "When the app launches" | `--soon` (app concept, no photo) | — | beauty (event / home), e-commerce (event / app) | app visuals labelled "App concept" |
| C38 | **Requirements** `.reqs` | title · checklist | — | — | beauty, e-commerce | real `<ul>` |
| C39 | **Type card** `.typecard` | icon · title · line | takes its track colour when checked | checked (`aria-checked`) · hover · focus | form step 1 | `role="radiogroup"` + `role="radio"`, arrow keys move |

| C40 | **What you get** `.benefits` / `.benefit` | 4 benefit cards: icon in track colour · title · line | — | — | every track | written in that partner's words |
| C41 | **Signature preview** `.signature` + `.profile-mock` / `.product-mock` | copy ("Picture your profile / product in the PinkOut app") + a concept card of *their* presence | beauty: profile · shop: product · event: packages + stage | buttons disabled ("when the app launches") | beauty, e-commerce | always labelled "App concept"; no fake names, ratings or prices |
| C42 | **Personal welcome** `?for=event\|beauty\|shop` | hero eyebrow in track colour ("Welcome, beauty artists & salons"), personal line 2, lead, CTA and deck button | 4 states incl. everyone | their door moves first with **"Made for you"**; sticky bar and form follow | hero, doors | content stays the same for everyone; only emphasis and wording change |
| C43 | **Personal form** `.dialog[data-type]` | head in track colour + icon + intro line ("Let's get your craft in front of her.") · personal thank-you | event · beauty · shop · neutral | — | application dialog | title changes per type (Event partner enquiry / Beauty partner application / Seller application) |

**Track colours:** Event = pink · Beauty = lavender · E-commerce = peach (`--track-*` tokens).

**"Every partner feels special" rules**
1. **Equal doors.** All three doors use full colour, an icon, a promise line and a solid Explore button. Order (Event first) is the only priority signal.
2. **Each track speaks to one person.**
   - Event: "Your brand, part of her world."
   - Beauty: "Your craft, at the heart of her world."
   - E-commerce: "Your products, on her shelf."
3. **Each track has its own "What you get"** (C40) **and a signature moment** (C41, or the packages and stage for event). No track is a copy of another.
4. **Personal links** (C42) for outreach: send artists `/?for=beauty`, sellers `/?for=shop`, sponsors `/?for=event`.
5. **The form greets them in their colour and words** (C43); the thank-you names what happens next for *their* type. Each track section is a block in its colour, so partners always know which track they are in.

## Templates

| Template | Structure | Pages |
|---|---|---|
| **T1 · Home (one page)** | skip link → C4 header → C8 hero → blocks (Why · World · Audience · Opportunities · Themes · Process · Status · FAQ · Closing) → C20 footer → C25 dialog | `index.html` |
| **T2 · Utility page** | C4 header (no section nav, "Back to partners" link) → one white C7 block with prose (max 70ch) → C20 footer | `privacy.html`, `credits.html` |
| **T3 · Not found** | C4 header → pink C7 block: h1 "This page wandered off." + C1 "Back to PinkOut Partners" → C20 footer | `404.html` |
| **T4 · Application dialog** | C25 with C39 (type step) → branch step (event / beauty / shop fields) → details → review → preview notice. Pre-fill API `openApplication({partnerType, interest, zone, goal, theme, source})` | inside T1 |
| **T5 · Track section** | C36 head → C37 channels (beauty, shop) or packages and goals (event) → wanted chips + C38 requirements → C16 steps (4) | inside T1 ×3 |

## Rules

0. **Partner-first:** every section says what's in it *for the partner* (C34). Offers are structured as Zone / Best for. Packages are indicative, never priced.
1. Any section is a C7 block; never a raw full-bleed band (except the hero film inside its block). Business sections (Opportunities, Process, FAQ) use the calm white `.block--business` with a thin accent line.
2. Each block uses **one** pastel. Zone colours appear only where a zone is meant. **No stickers on business content**; at most one, in the closing block.
3. **One primary (cherry) button per view area**; everything else is secondary or quiet.
4. Arabic: no letter-spacing, taller line heights, and arrows and motion flip via `--dir: 1 | -1`.
5. New UI first goes into `components.html`, then into the page.
