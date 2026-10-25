# PinkOut Partners — Wireframe v1

Interactive version: `wireframe.html`. Its toolbar switches Desktop / Mobile 375, EN / AR and notes on or off. The zone map and the enquiry form are clickable.

1. **Header:** logo · The world · Opportunities · Audience · How it works · FAQ · AR · [Partnership enquiry]. Sticky, with a progress line. Mobile: logo · Enquiry · ☰ full-screen sheet.
2. **Hero:** existing hero film full-bleed, with a white panel: eyebrow "PinkOut Partners · Coming soon to Riyadh", headline "Her own world. Room for brands that belong in it.", one-line lead, [Start a partnership] [Explore the world], and a pause control.
   - motion: panel lines rise once; on scroll the film scales back and the panel lifts away.
3. **Why PinkOut:** "Not an event. A world that keeps changing." + 3 cards (People take part · They come back · One premium world).
   - motion: word reveal and card stagger, once.
4. **The world, 3D map ★:** Three.js diorama of 7 zones + zone buttons + side panel (desktop) / chip row + bottom sheet (mobile). The panel shows the render, a one-line description, a sponsorship row, activations, [Enquire about this zone] and [Copy link]. "Illustrative concept layout" note.
   - Fallback: SVG map. Lazy-loaded.
5. **Audience:** headline + qualitative description + **4 figure slots from the partner deck** (hidden on the live site if empty) + journey Arrive → Explore → Create → Gather → Return.
6. **Opportunities:** Sponsorship card first (season / zone / stage / themed day), then 6 brand-activation cards, each tagged with its zone. Every card → enquiry pre-filled.
7. **Themed days:** horizontal scroll of 8 themes, each with draft "brand fit" chips and [Sponsor this theme]. "Programme ideas, not dated events."
8. **How it works:** 5 steps: Enquire · Deck & intro call · Co-design · Activate · Recap.
9. **Status:** facade concept render + City: Riyadh · Opening: to be announced · App: in development.
10. **FAQ:** 7 partner questions, native `<details>`.
11. **Closing:** arch visual + "Shape the first season with us." + [Start a partnership].
12. **Footer:** logo, links, Privacy · Credits · Motion off · العربية · "Visiting PinkOut? pinkoutsa.com".

**Enquiry dialog:** Step 1 *Your interest* (type, zones, themes, timing) → Step 2 *Your company* (company, name, job title, work email, phone, message, ☑ send me the deck, consent) → Review → Preview notice ("nothing was sent").

## Open questions for the client

1. Are the 5 process steps right?
2. Do the "brand fit" chips on themed days help, or should they be removed?
3. Any section to remove or reorder? (For example, the Status section could merge into the FAQ.)
4. ⏳ The partner deck PDF, for the 4 audience figures.

## v1.1: partner-friendly changes (23 Oct 2026, after client feedback "make it more partner friendly")

- Hero: at-a-glance facts row; second CTA is now **Request the partner deck**; "Explore the world" becomes a quiet link.
- Opportunities split in two:
  - **5a Sponsorship:** indicative package cards and a comparison table.
  - **5b Brand activations:** a goal picker that filters 7 structured offer cards.
- Enquiry step 1 gains "What do you want to achieve?".
- Phones get a sticky bar: Partner deck · Start a partnership.
- Business sections use calm white blocks; no stickers on business content.

## v2: three partner tracks (23 Oct 2026)

Interactive: `wireframe.html` (v2).

1. **Header:** Event partners · Beauty services · E-commerce · The world · FAQ · AR · [Become a partner]. Mobile: logo · Become a partner · ☰. Sticky phone bar whose label follows the visible track.
2. **Hero:** "Her own world. Room for partners who belong in it." + at-a-glance facts + Become a partner / Request a partner deck.
3. **Choose your partnership (NEW):** 3 doors; Event is first and widest.
4. **Why PinkOut.**
5. **The world (3D map):** new "Show where" filter (All / Event / Beauty / E-commerce); the panel lists the partner types per zone.
6. **Audience:** figure slots from the decks.
7. **Track 1, Event:** sponsorship packages + comparison · goal picker + 7 activations · themed days · 4 steps.
8. **Track 2, Beauty service (NEW):** where you work (event / home when the app launches) · services · who can apply · requirements · 4 steps.
9. **Track 3, E-commerce (NEW):** where you sell (event / app when it launches) · categories · requirement · 4 steps.
10. **Status.**
11. **FAQ** grouped by type.
12. **Closing** with 3 type buttons.
13. **Footer.**

**Application dialog:** [type step only when no type is known] → about (branch) → your details → review → preview.

## Event page v2 (24 Oct 2026) · approved and built

Wireframe: `docs/wireframe-event.html`. Client answers: one continuous 3D tour (journey and map merged), detailed-miniature model, each zone shows *what the brand can do*, *what the brand gets* and an *Enquire about this zone* button.

1. Hero: brand-name input, "Take the tour", aerial still of the venue
2. The tour (pinned): overview → Pink Passage → Rose Hub → Craft Studio → Pink Market → PinkOut Live → Beauty Lab → Move Studio → finale (free explore). Mini floor plan + progress rail.
3. Ways to partner (4 packages)
4. Themed days (goal picker removed: folded into the tour)
5. How it works · 6. FAQ · 7. Other ways · 8. Closing
