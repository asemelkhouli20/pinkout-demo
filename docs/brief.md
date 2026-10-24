# PinkOut Partners — Brief

**Status:** v3 · 23 Oct 2026 · Almond Lab. Updated after the client defined **three partner types**.
**Sources:** `PinkOut_Knowledge_Base.md` (v2.0), consumer site `PinkOut_SWSH_Rebuild/` (assets, copy), client answers on 23 Oct 2026 (5 rounds).
**❓** = open · **⏳** = waiting on a file from the client.

> **Change log:**
> - **v4 (24 Oct 2026, client):** event partners get **the whole event** (all seven zones). Beauty service partners work **only in the app** (home bookings). E-commerce partners are **not part of the event**: they sell in the app. The venue map now speaks only to event partners, and the event page's map is live (visitors, stage lights, a zone tour).
> - **v3:** the site now serves three partner types: Event-based, Beauty service, E-commerce. Retail sellers and individual beauty providers are back in scope (v2 had dropped retail and talent). At-home beauty services and in-app selling are **new client direction** beyond the knowledge base, and are described honestly as starting "when the app launches".
> - **v2:** partner-only, English-first.

---

## 1. What we are building

A **partner website for PinkOut**, a women-first lifestyle and experience destination coming soon to Riyadh, with a PinkOut app on the way. It speaks **only to partners**; the consumer site is pinkoutsa.com.

**One page, three partner tracks**, each with its own offer, requirements, steps, deck and form branch:

| Priority | Partner type | Who | What they do with PinkOut |
|---|---|---|---|
| **1** | **Event partners** | Sponsors and brands | Add value **inside the event**: sponsorships (season, zone, stage, themed day) and brand activations (launches, trials, takeovers, installations) |
| 2 | **Beauty service partners** | Freelance artists **and** salons / beauty businesses | Provide beauty services **in the app only**: clients book them at home (when the app launches). No work at the event. |
| 3 | **E-commerce partners** | Product brands and sellers | Sell products **in the app** (when it launches). Not part of the event. |

Built with **GSAP + Three.js**. The signature feature is a **3D map of the seven zones**, which now also shows where each partner type lives (for example, Beauty Lab for beauty services and Pink Market for sellers).

## 2. Goal and main action

| | |
|---|---|
| **Main action** | **Apply / enquire as one of the three partner types.** The form's first question is the type; the rest branches. |
| Supporting action | **Request the deck for your type** (one deck per type), via a checkbox in the form |
| What every partner should feel | "PinkOut is a real, well-designed world with an audience I want. There's a clear place for someone like me, and applying takes two minutes." |

## 3. Audience

| Type | Persona | Device | Needs |
|---|---|---|---|
| Event | Faisal, sponsorship lead; Noura, brand manager | Desktop, then phone | Concept credibility, audience proof, sponsorable assets, activation formats per zone, deck |
| Beauty service | Reem, freelance makeup artist; Hessa, salon owner | **Phone** (Instagram / WhatsApp) | Where she'd work (event / home), which services are wanted, requirements, quick application with a portfolio link |
| E-commerce | Lama, founder of a small accessories brand | **Phone** | Where she'd sell (event / app), which categories fit, quick application with a store or Instagram link |

## 4. Brand

**Direction B · Sorbet Showroom**, partner-friendly edition (see `design-system.md`). Logo Option 2.
- English-first, with a full Arabic switch.
- Arabic is neutral, with no direct address.
- Never invent figures, partners, dates, prices or addresses. Say "women-first".

## 5. Scope

**Pages:** `/`, `/privacy`, `/credits`, `/404`.

**Features:**
- Hero with three partner "doors"
- Three tracks: offers, where you work or sell, wanted services or categories, requirements, how it works, CTAs
- 3D zone map with track highlights, plus a 2D fallback
- Audience proof
- Event-track goal picker, packages and comparison table
- Themed days (event track)
- FAQ grouped by type
- **One enquiry form with three branches** (preview mode)
- Deck request per type
- Phone sticky CTA bar
- EN/AR, reduced motion

## 6. Content status

| Content | Status |
|---|---|
| Zones, renders, themed days, film, logo | ✅ exists |
| Event offers, packages, comparison | 🟡 drafted, needs client OK |
| Beauty services wanted (makeup, hair, nails, lashes and brows, henna, skincare) | 🟡 draft list, needs client OK |
| E-commerce categories (beauty, fashion, accessories, sweets and treats, gifts, lifestyle) | 🟡 from the knowledge base (Pink Market), needs OK |
| Requirements | ✅ beauty: valid license or certificate + portfolio/Instagram · ✅ e-commerce: fits PinkOut categories |
| Commercial terms (fees, commission) | 🚫 not on the site; shared after the enquiry |
| **Three partner decks** (event, beauty, e-commerce) | ⏳ needed; the audience figures come from them |
| App store links, opening date, address | ⛔ unconfirmed: "when the app launches", "to be announced" |

## 7. Constraints

- Live within ~1 week.
- Static site on nginx; GSAP and Three.js vendored.
- Enquiries in **preview mode** (no destination yet).
- Mobile Lighthouse ≥ 85.

## 8. Out of scope

Consumer content and waitlist, publishing fees or commission, accounts or login, real bookings or orders, app store links, ticketing, CMS, a real floor plan.

## 9. Success

Applications per type, deck requests per type, share of visitors choosing a track door, Lighthouse mobile ≥ 85, accessibility 100, EN and AR correct.

## 10. Still needed from the client

1. ⏳ **The three partner decks** (for audience figures and deck requests).
2. ❓ OK on the draft lists: beauty services wanted, e-commerce categories, event offers and packages.
3. ❓ Later: where applications are sent; who reviews the Arabic copy.
