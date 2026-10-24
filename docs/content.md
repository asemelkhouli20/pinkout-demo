# PinkOut Partners — Sitemap & content plan (v3: three partner tracks)

## Sitemap

```
/              Home: invitation, three doors, why, 3D map (all zones), audience, status, FAQ, closing
/event.html    Event partners: page hero, sponsorship, activations by goal, themed days, steps, map (event zones), FAQ, other ways
/beauty.html   Beauty service partners: page hero, where you work, what you get, profile preview, requirements, steps, map, FAQ, other ways
/shop.html     E-commerce partners: page hero, where you sell, what you get, product preview, categories, steps, map, FAQ, other ways
/privacy  /credits  /404
```
v4 (23 Oct 2026, client): each partner type has its own page; the home page routes to them.

**v5 (24 Oct 2026, client): who belongs where.** Event partners = the whole event (every zone). Beauty service partners = the app only (home bookings). E-commerce partners = the app only, not part of the event. So:
- beauty and e-commerce pages tell their story **on a phone** (app journey, 6 screens each, `src/partials/phone-*.html`), with no venue walk-through and no venue map;
- their hero shows the app concept (profile / product) instead of a venue render;
- the form no longer asks "where would you work / sell" (payload `where` is fixed: `app-home` / `app`);
- FAQ adds "Can I work at the event?" (beauty) and "Can I sell at the event?" (e-commerce);
- the event page carries a **live venue map** ("The whole event, live.") right after its walk-through; the home map drops the partner-type filter.
Rows below that still mention beauty or e-commerce "at the event" are superseded; the live copy is in the partials and `assets/js/copy.js`.

## Story arc

**Invitation → Choose your partnership (3 doors) → Why PinkOut → The world (3D map) → The audience → Track 1 Event → Track 2 Beauty service → Track 3 E-commerce → Status → FAQ → Closing**

Every visitor sees the shared proof once (why, world, audience), then reads only their own track. The doors and the header let anyone jump straight to their track.

## Sections

| # | Section · anchor | Question it answers | Content | Action |
|---|---|---|---|---|
| 0 | Header | — | Logo · Event partners · Beauty services · E-commerce · The world · FAQ · AR · [**Become a partner**] | Become a partner (form opens on the type question) |
| 1 | Hero · `#top` | What is it? | Eyebrow · headline · lead · at-a-glance facts (7 zones · Riyadh · Women-first · Opening TBA) | **Become a partner** · Request a partner deck · Explore the world |
| 2 | **Choose your partnership** · `#partner` | Is there a place for me? | 3 door cards (Event is first and largest): who it's for, one line, "where", 2 example chips | Each door → its track; "Apply" → form with the type pre-selected |
| 3 | Why PinkOut · `#why` | Why should I care? | 3 reasons: people take part · they come back · one premium world | — |
| 4 | The world (3D map) · `#world` | Where would I be? | 7 zones. The panel shows the zone + **which partner types fit here** (e.g. Beauty Lab → Event activations, Beauty services). Track filter chips: All · Event · Beauty · E-commerce | Zone → enquire (type + zone pre-filled) |
| 5 | Audience · `#audience` | Who will I reach? | Description + ⏳ figures from the decks + visit journey | — |
| 6 | **Track 1: Event partners** · `#event` | What can my brand do? | 6a Sponsorship packages (4, indicative) + comparison table · 6b Goal picker + 7 activation offers · 6c Themed days as sponsorable moments · How it works (4 steps) | Enquire as event partner · Request the event deck |
| 7 | **Track 2: Beauty service partners** · `#beauty` | Can I work here? | Where you work: **At the event** (Beauty Lab stations, themed-day looks) / **At home** (bookings through the app when it launches) · Services wanted · Who can apply (freelancers and salons) · Requirements · How it works (4 steps) | Apply as beauty partner · Request the beauty deck |
| 8 | **Track 3: E-commerce partners** · `#shop` | Can I sell here? | Where you sell: **At the event** (Pink Market pop-ups and curated shelves) / **In the app** (when it launches) · Categories wanted · Requirement · How it works (4 steps) | Apply as seller · Request the e-commerce deck |
| 9 | Status · `#status` | Is it real, and when? | City Riyadh · Opening TBA · App: in development | — |
| 10 | FAQ · `#faq` | Remaining doubts | Grouped: General · Event · Beauty · E-commerce | — |
| 11 | Closing · `#start` | Let's talk | "Shape the first season with us." + 3 small type buttons | Form with type |
| 12 | Footer | — | Links per track, privacy, credits, motion, language, "Visiting PinkOut? pinkoutsa.com" | — |

## Track details (drafts for client OK)

### Track 1: Event partners
- **Sponsorship (indicative, no prices):** Season partner · Zone partner · Stage partner · Themed-day partner. Included: visibility / experience / content / recap. Plus a comparison table.
- **Activations, by goal (Launch · Trial · Awareness · Content · Community):**
  - Launch on stage (PinkOut Live)
  - Product trials and personalisation (Beauty Lab)
  - Hub takeover and signature drink (Rose Hub)
  - Branded make-and-take (Make Studio)
  - Entrance installation (Pink Passage)
  - Launch pop-up and limited drop (Pink Market)
  - Sponsored class series (Move Studio)
- **Themed days:** 8 ideas, "sponsor this theme".
- **How it works:** Enquire → Deck & intro call → Co-design → Activate.

### Track 2: Beauty service partners
- **Where you work:**
  - *At the event:* touch-up and glam stations in Beauty Lab; looks for themed days (Princess Day, Coffee & Henna Night).
  - *At home:* clients book you through the PinkOut app, **when the app launches**.
- **Services wanted:** Makeup · Hair styling · Nails · Lashes & brows · Henna · Skincare.
- **Who can apply:** freelance artists and salons / beauty businesses.
- **Requirements:** a valid license or professional certificate · a portfolio or Instagram showing your work.
- **How it works:** Apply → Portfolio review → Onboarding → Start (event first; home bookings when the app launches).

### Track 3: E-commerce partners
- **Where you sell:**
  - *At the event:* Pink Market pop-ups and curated shelves.
  - *In the app:* your products in the PinkOut app store, **when the app launches**.
- **Categories wanted:** Beauty · Fashion · Accessories · Sweets & treats · Gifts · Lifestyle.
- **Requirement:** products that fit PinkOut's categories.
- **How it works:** Apply → Catalogue review → Onboarding → Start selling (event first; app when it launches).

## Application form (one dialog, three branches)

**Step 1 · Partnership type** *: Event partner / Beauty service partner / E-commerce partner.
(Pre-selected when opened from a track; still changeable.)

| Step 2 · About your partnership | Event | Beauty service | E-commerce |
|---|---|---|---|
| Type-specific | Sponsorship / Activation / Not sure · Goals (multi) · Zones (multi) · Themed days · Timing | Applying as: Freelancer / Salon or business · Services (multi) * · Where: Event / Home / Both · Years of experience · **License or certificate**: Yes / In progress * · **Portfolio or Instagram link** * | Categories (multi) * · Where: Event / App / Both · Store or Instagram link · Number of products: 1–20 / 21–100 / 100+ |

**Step 3 · Your details**
- Event: company *, full name *, job title, work email *, phone, message.
- Beauty: full name *, business name (if salon), email *, phone *, message.
- E-commerce: brand name *, full name *, email *, phone, message.

All branches also have:
- ☑ **Send me the [type] deck** (on by default)
- ☐ consent *

**Review → preview notice:** "Applications open soon. This was a preview; nothing was sent."

## Copy (all `draft`: English for client approval, Arabic for native review; Arabic is neutral, no direct address)

| Key | English | Arabic |
|---|---|---|
| nav.event | Event partners | شركاء الفعاليات |
| nav.beauty | Beauty services | خدمات التجميل |
| nav.shop | E-commerce | التجارة الإلكترونية |
| nav.cta | Become a partner | الانضمام كشريك |
| hero.title | Her own world. Room for partners who belong in it. | عالمها الخاص. ومكان للشركاء الذين ينتمون إليه. |
| hero.lead | A women-first destination opening in Riyadh, with an app on the way. Partner with PinkOut at the event, through beauty services, or by selling your products. | وجهة مصمّمة للنساء أولاً، قريباً في الرياض، ومعها تطبيق قادم. الشراكة ممكنة في الفعالية، أو عبر خدمات التجميل، أو ببيع المنتجات. |
| doors.title | Three ways to partner. | ثلاث طرق للشراكة. |
| door.event | Event partners: add value inside the event, from sponsorships to brand activations. | شركاء الفعاليات: قيمة مضافة داخل الفعالية، من الرعاية إلى تفعيلات العلامات. |
| door.beauty | Beauty service partners: bring your craft to PinkOut, at the event and at home. | شركاء خدمات التجميل: خبرة التجميل داخل الفعالية وفي المنازل. |
| door.shop | E-commerce partners: sell your products at the event and in the PinkOut app. | شركاء التجارة الإلكترونية: بيع المنتجات في الفعالية وفي تطبيق PinkOut. |
| beauty.title | Your craft, at the event and at home. | خبرة التجميل، في الفعالية وفي المنزل. |
| beauty.home | At home: bookings through the PinkOut app, when the app launches. | في المنزل: الحجز عبر تطبيق PinkOut عند إطلاقه. |
| beauty.reqs | A valid license or professional certificate · A portfolio or Instagram showing your work | رخصة سارية أو شهادة مهنية · معرض أعمال أو حساب إنستغرام |
| shop.title | Sell where she shops: at the event and in the app. | البيع حيث تتسوّق: في الفعالية وفي التطبيق. |
| shop.app | In the app: your products in the PinkOut app, when it launches. | في التطبيق: المنتجات في تطبيق PinkOut عند إطلاقه. |
| shop.req | Products that fit PinkOut's categories | منتجات ضمن فئات PinkOut |
| form.type | How would you like to partner? | ما نوع الشراكة؟ |
| form.preview | Applications open soon. This was a preview; nothing was sent. | استقبال الطلبات قريباً. هذه معاينة ولم يُرسل أي شيء. |

All event-track copy from v2 still applies. Reused copy comes from SWSH `copy.js`.

## Every partner feels special (v3.1, client: "make sure every one of the partners feels special")

| | Event | Beauty service | E-commerce |
|---|---|---|---|
| Promise (door) | Your brand, part of her world. | Your craft, at the heart of her world. | Your products, on her shelf. |
| Personal link | `/?for=event` | `/?for=beauty` | `/?for=shop` |
| Welcome (hero) | Welcome, sponsors & brands · "Her own world. Your brand, inside it." | Welcome, beauty artists & salons · "Her own world. Your craft, at the heart of it." | Welcome, brands & sellers · "Her own world. Your products, on her shelf." |
| What you get | Packages: visibility · experience · content · recap | A stage for your work · New clients at home (app) · Your own profile · Credit for your looks | A shelf at Pink Market · A shop in the app · Featured moments (gift edits, themed-day picks) · Your story, told |
| Signature moment | 3D map stage + packages | "Picture your profile in the PinkOut app" (concept card) | "Picture your product in the PinkOut app" (concept card) |
| Form | Event partner enquiry · "Let's put your brand inside her world." | Beauty partner application · "Let's get your craft in front of her." | Seller application · "Let's get your products on her shelf." |
| Thank-you | We'll send the event partner deck | We'll review your portfolio | We'll look at your catalogue |

**Draft promises to confirm:** "Credit for your looks", "Your own profile", "Featured moments", "Your story, told". These are things PinkOut would commit to, so please confirm or remove.

**v6 (24 Oct 2026, client): event page v2.** The event page is built around one continuous tour of the venue. Copy per world (tagline, what it is, inside, what the brand can do, what it gets, EN + AR) lives in `src/tour.json`; taglines and "inside" lists come from the client's zone descriptions.
