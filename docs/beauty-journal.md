# PinkOut beauty journal — implementation and AI handoff

Updated: **24 October 2026**. Page: [`beauty.html`](../beauty.html). Structured companion: [`beauty-journal-context.json`](beauty-journal-context.json).

## Read this before changing the page

This document records the latest user decisions, what was implemented, the meaning of all supplied images, and the steps to preserve or extend the work. Use it and the JSON companion for screen semantics; there is no need to reopen unchanged images merely to understand the flow. Visual layout QA still requires rendering the page. If an image changes, inspect the replacement and update its description and SHA-256 in the JSON.

**The latest user instruction overrides the older home-only brief.** The user explicitly answered **“Show both, as in the app images”** when asked about home versus venue. Beauty services therefore include **At home and At the venue**, according to what the provider offers for that service. The app connects client discovery/booking with the partner’s service and appointment management. Do not equate the venue option with a sponsorship package or assume a confirmed physical address.

**Keep the scrolling journal.** The user rejected the conventional landing-page redesign and asked to put the “journal thing” back. The required format is an illustrated, chapter-by-chapter journey, with an app screen held on screen while the accompanying journal cards advance. It is not a blog or a wall of marketing paragraphs.

The site addresses potential **freelance artists, salons and beauty businesses**. The app is still presented as a concept/coming soon. Names, reviews, ratings, prices, brands, dates, availability and booking counts visible in the artwork are illustrative, not confirmed partners or commercial promises.

Older `docs/brief.md`, `docs/content.md`, `src/journey.json`, beauty partials and some shared copy still contain superseded home-only assumptions. For this beauty-page experience, use the decision above. Other partner pages were not redesigned in this task.

## What was changed

1. Replaced the initial text-heavy redesign with a 12-chapter scrolling journal.
2. Replaced fabricated HTML app previews and generic beauty stickers with the user-supplied app artwork.
3. Split the story into **chapters 01–06: the client** and **chapters 07–12: the partner**.
4. Added a cover/hero pairing the client Book screen and partner My services screen, with shortcuts into each side of the story.
5. Explained both home and venue service locations in the hero, journey, FAQ, metadata and page-local beauty type-card text.
6. Restored the existing journey controller, progress dots, chapter navigation, `?walk=N` entry points and name/salon personalisation.
7. Added an enlarged-screen dialog, plus supplementary views for the makeup kit, client-facing profile reviews and the artist reviewing a client.
8. Kept application and deck-request CTAs connected to the existing beauty application flow.
9. Kept supporting content compact: partner preparation checklist, four FAQs and links to the other partner tracks.
10. Added English/Arabic page copy, RTL layout, reduced-motion support and mobile arrangements for image, card, zoom control and sticky CTA.
11. Deferred inactive stage-image loading; the active and next screen load as the story advances. Added loading feedback and image decoding handling.
12. Kept redesign implementation in `beauty.html`. Supplied PNG files and shared JS/CSS were not rewritten. This follow-up adds documentation and discoverability links.

## Page sequence and what each part must do

| Part | Purpose | Required behavior |
|---|---|---|
| Shared header | Orient visitors and provide application/language controls | Keep partner navigation, mobile menu, English/Arabic toggle and application opener. FAQ links to this page’s `#faq`. |
| Journal cover | Introduce the two perspectives and service locations | Preserve title “Her beauty story. Your next chapter.”, home/venue/one-app chips, actual client/partner artwork, Start the journey and application CTA. |
| Contents shortcuts | Let visitors enter either half | `01–06` jumps to `#chapter-1`; `07–12` jumps to `#chapter-7`. |
| Scrolling journal | Explain the full app story through pictures and concise narrative | Twelve cards and twelve matching stage screens; see step specifications below. |
| Partnership details (`#beauty`) | Turn the story into a partner enquiry | Explain artist/salon eligibility and show credentials, portfolio and service/contact preparation. Keep application and deck-request controls. |
| FAQ (`#faq`) | Resolve the main questions without extending the story into a long brochure | Cover both locations, who can apply, launch status and what happens after applying. |
| Other tracks and shared footer | Preserve site navigation and preferences | Keep event/shop links, privacy/credits, language and motion controls. |
| Screen viewer dialog | Make image detail readable, especially on phones | Enlarge the original image, provide a translated title and close control, support Escape and return focus to the opener. It must not perform any pictured app action. |

## The twelve journey steps

Numbers below are public chapter numbers. `data-screen` and `data-chapter` indexes are zero-based. Exact English and Arabic chapter copy is included in the JSON companion and in `beauty.html`’s `data-walk-data` script.

### 01. Her discovery — client

- **Headline:** Imagine {brand} in her day.
- **Purpose:** Introduce the breadth of the booking app. A client discovers the available service categories before selecting one.
- **What this step must do:** Show the Book screen; keep the optional name/salon personalisation disclosure. Next chapter opens service selection.
- **Artwork:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_45 PM-1.png` (`client-book`).
- **Navigation:** `#chapter-1`; `data-screen="0"`; `?walk=1`.

### 02. The service — client

- **Headline:** First, the look she has in mind.
- **Purpose:** Explain choosing the actual service, not only a beauty category.
- **What this step must do:** Show the makeup-service list. Describe service choice without promising the example prices or durations.
- **Artwork:** `assets/images/beauty/Evening Glam Makeup Booking Screen-8.png` (`client-makeup-services`).
- **Navigation:** `#chapter-2`; `data-screen="1"`; `?walk=2`.

### 03. Her place or yours — client

- **Headline:** Beauty, wherever she wants it.
- **Purpose:** Explain the user-approved home AND venue model. Availability depends on the selected service.
- **What this step must do:** Show both location photo cards. Never replace this chapter with home-only wording or assume venue means event sponsorship.
- **Artwork:** `assets/images/beauty/Evening Glam makeup service location screen-9.png` (`client-location`).
- **Navigation:** `#chapter-3`; `data-screen="2"`; `?walk=3`.

### 04. The right match — client

- **Headline:** She finds an artist who fits.
- **Purpose:** Explain how a client narrows down artists.
- **What this step must do:** Show the filter sheet. Mention location, price, rating and availability, without treating sample counts as live inventory.
- **Artwork:** `assets/images/beauty/Evening glam artist filters-11.png` (`client-filters`).
- **Navigation:** `#chapter-4`; `data-screen="3"`; `?walk=4`.

### 05. Your signature — client

- **Headline:** Your work tells your story.
- **Purpose:** Explain how the client evaluates an artist’s work before booking.
- **What this step must do:** Show the portfolio tab. Preserve the two extra-screen links for makeup kit and profile reviews.
- **Artwork:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_51 PM-4.png` (`client-portfolio`).
- **Navigation:** `#chapter-5`; `data-screen="4"`; `?walk=5`.

### 06. A time for beauty — client

- **Headline:** A day. A time. A plan.
- **Purpose:** Explain selecting an available appointment after choosing service, location and artist.
- **What this step must do:** Show day/time selection. Do not call this a confirmed booking: the screen says Continue. Next chapter explicitly switches to the partner perspective.
- **Artwork:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_48 PM-2.png` (`client-time`).
- **Navigation:** `#chapter-6`; `data-screen="5"`; `?walk=6`.

### 07. Now, your side — partner

- **Headline:** Behind every look, your business.
- **Purpose:** Introduce the partner’s management side of the same app.
- **What this step must do:** Show My services with active/draft services and availability entry point. Preserve the second hero shortcut to this chapter.
- **Artwork:** `assets/images/beauty/Beauty artist services dashboard-9.png` (`partner-services`).
- **Navigation:** `#chapter-7`; `data-screen="6"`; `?walk=7`.

### 08. Make it yours — partner

- **Headline:** You shape the service.
- **Purpose:** Explain what the partner configures for a service.
- **What this step must do:** Show name, description, price, duration, home/venue locations, tools, photos and active status. Describe screen controls; do not turn the image into fake working inputs.
- **Artwork:** `assets/images/beauty/Beauty service editor on iPhone-13.png` (`partner-service-editor`).
- **Navigation:** `#chapter-8`; `data-screen="7"`; `?walk=8`.

### 09. Your working rhythm — partner

- **Headline:** Your schedule has a say.
- **Purpose:** Explain availability management rather than guaranteed booking availability.
- **What this step must do:** Show hours, days off, appointment buffers and blocked dates. Keep both locations in the explanation.
- **Artwork:** `assets/images/beauty/Availability Editor on iPhone-3.png` (`partner-availability`).
- **Navigation:** `#chapter-9`; `data-screen="8"`; `?walk=9`.

### 10. The request arrives — partner

- **Headline:** The details, before you say yes.
- **Purpose:** Explain the decision point after a request arrives.
- **What this step must do:** Show client, service, time, address and notes. Include message, propose-time, accept and decline possibilities. Do not imply that every request is automatically accepted.
- **Artwork:** `assets/images/beauty/Booking request details with Requests active-14.png` (`partner-request`).
- **Navigation:** `#chapter-10`; `data-screen="9"`; `?walk=10`.

### 11. The day takes shape — partner

- **Headline:** A clear view of what’s next.
- **Purpose:** Explain how confirmed appointments fit into a partner’s day.
- **What this step must do:** Show the reservations timeline. Treat the displayed month, clients, appointment times and statuses as examples.
- **Artwork:** `assets/images/beauty/Beauty bookings timeline for October-1.png` (`partner-calendar`).
- **Navigation:** `#chapter-11`; `data-screen="10"`; `?walk=11`.

### 12. Beyond the appointment — partner

- **Headline:** A reputation that grows with you.
- **Purpose:** Explain reputation and feedback after the appointment, in both directions.
- **What this step must do:** Show the partner review overview; preserve the artist-reviews-client extra screen and the beauty-partner application CTA.
- **Artwork:** `assets/images/beauty/Beauty artist ratings and reviews-5.png` (`partner-reviews`).
- **Navigation:** `#chapter-12`; `data-screen="11"`; `?walk=12`.

## Complete image catalog — all 18 supplied files

Paths are relative to the project root. Each entry describes the visible app intent and controls so another AI can reason about the flow without reopening the PNG. These are artwork descriptions, not claims that the website implements the controls. The JSON also records dimensions and content hashes.

### `client-book` — Book / service discovery

- **File:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_45 PM-1.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** A phone with a Book heading, search control, artist applying makeup hero photograph, and service-category tiles. Bottom navigation: Home, Book (selected), Explore, Account.
- **Visible controls/content:** Makeup: soft glam, evening glam, bridal; Skincare: facials, hydration, skin prep; Hair styling: blow-dry, waves, updos; Nail care: manicure, pedicure, nail art; Hair removal: waxing, sugaring, threading; Henna & tattoos: bridal henna, simple henna, temporary tattoos; Massage & spa: relaxation, deep tissue, spa rituals; Photography: portraits, events, beauty shoots; Beauty consultations: makeup advice, skin routine, hair advice.
- **Current use:** Hero foreground; Chapter 01.

### `client-makeup-services` — Choose a makeup service

- **File:** `assets/images/beauty/Evening Glam Makeup Booking Screen-8.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Makeup heading with All, Everyday and Occasions filters. Illustrated rows for Soft Glam, Evening Glam, Bridal Makeup and Makeup Lesson; rows include descriptions, durations and sample prices.
- **Visible controls/content:** Choose a service category filter; Choose a specific makeup service; Bottom navigation retains the Book context.
- **Current use:** Chapter 02.

### `client-location` — Choose the service location

- **File:** `assets/images/beauty/Evening Glam makeup service location screen-9.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Where would you like it? screen. Two large photo options: At home (artist comes to client) and At the venue (client visits the beauty space). At home is selected. A Home address row and Find artists action appear below.
- **Visible controls/content:** Review selected service; Select At home or At the venue; Change the saved address; Find artists.
- **Current use:** Chapter 03.

### `client-filters` — Filter available artists

- **File:** `assets/images/beauty/Evening glam artist filters-11.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Evening Glam Makeup results behind a Filters bottom sheet. Controls include location, price range, minimum rating, availability date and sorting. The sheet ends with a result-count action.
- **Visible controls/content:** At home / At the venue location chips; Price-per-service range; Minimum rating options; Availability date; Sort: recommended, top rated, price low to high; Reset or show matching artists.
- **Current use:** Chapter 04.

### `client-portfolio` — Artist profile / previous work

- **File:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_51 PM-4.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Artist identity, summary rating and booking information, location indicator, Makeup kit link, Services / Previous work / Ratings tabs, and a grid of six makeup looks. Previous work is selected.
- **Visible controls/content:** Browse soft glam, evening glam, bridal glow, natural glam, smoky eyes and classic glam examples; Open makeup kit; Switch profile tabs; Choose day and time from the service bar.
- **Current use:** Chapter 05.

### `client-time` — Choose a day and time

- **File:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_48 PM-2.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Booking screen with the selected artist and service, a location summary and Change control, selectable dates, time slots, a selected appointment summary, sample price, and Continue.
- **Visible controls/content:** Change location; Choose an available date; Choose a time slot; Review selected time and duration; Continue the booking.
- **Current use:** Chapter 06.

### `partner-services` — My services

- **File:** `assets/images/beauty/Beauty artist services dashboard-9.png`
- **Perspective / dimensions:** Partner; 1024 × 1536 px.
- **What is shown:** Artist avatar and My services heading. Active and Drafts tabs, Add service control, and service cards with duration, sample price, location labels, active toggles and Edit buttons. Manage availability appears below. Bottom navigation: Today, Requests, Calendar, Services (selected), Account.
- **Visible controls/content:** Add a service; View active services or drafts; Edit Evening Glam, Bridal Makeup or Everyday Makeup examples; Enable or disable a service; Open Manage availability.
- **Current use:** Hero background; Chapter 07.

### `partner-service-editor` — Edit service

- **File:** `assets/images/beauty/Beauty service editor on iPhone-13.png`
- **Perspective / dimensions:** Partner; 1024 × 1536 px.
- **What is shown:** Service editor for Evening Glam with name, category, description, price, duration, location selections, tools and brands, previous-work photographs, availability setting and active toggle. Both At home and At the venue are checked.
- **Visible controls/content:** Edit service name, category and description; Set price and duration; Choose one or both service locations; Add or edit tools and brands; Add portfolio photos; Use working hours for availability; Toggle active status; Save changes.
- **Current use:** Chapter 08.

### `partner-availability` — Working hours and availability

- **File:** `assets/images/beauty/Availability Editor on iPhone-3.png`
- **Perspective / dimensions:** Partner; 1024 × 1536 px.
- **What is shown:** Weekly working-hour rows with start/end times and enabled/off switches, booking settings, a buffer between appointments, a Home & venue location summary, and date exceptions with an Add date control.
- **Visible controls/content:** Set daily working hours; Turn days off; Set time between appointments; Review service location setting; Block a specific date; Save availability.
- **Current use:** Chapter 09.

### `partner-request` — Review a booking request

- **File:** `assets/images/beauty/Booking request details with Requests active-14.png`
- **Perspective / dimensions:** Partner; 1024 × 1536 px.
- **What is shown:** New request screen showing client identity, client rating and profile link, selected service, duration and sample price, date, time, home address, and a client note. Requests is selected in bottom navigation.
- **Visible controls/content:** View client profile; Read the requested service, location and notes; Message client; Propose another time; Decline request; Accept request.
- **Current use:** Chapter 10.

### `partner-calendar` — Reservations timeline

- **File:** `assets/images/beauty/Beauty bookings timeline for October-1.png`
- **Perspective / dimensions:** Partner; 1024 × 1536 px.
- **What is shown:** Reservations screen with a filter icon, week-date strip under an October 2026 sample calendar, Timeline and Week views, and time-positioned appointment cards. Cards show client, service, status and location details; the timeline also illustrates an availability gap.
- **Visible controls/content:** Choose a day; Switch Timeline / Week; Review confirmed appointments in chronological order; Inspect free time between appointments; Open reservation details.
- **Current use:** Chapter 11.

### `partner-reviews` — Ratings and reviews

- **File:** `assets/images/beauty/Beauty artist ratings and reviews-5.png`
- **Perspective / dimensions:** Partner; 1024 × 1536 px.
- **What is shown:** Artist-side review overview with a sample aggregate rating, review count, star distribution, Received and Given tabs, rating filters and individual review cards. A reply to a client review is visible.
- **Visible controls/content:** Switch received and given reviews; Filter reviews by rating; Read client feedback; Review replies to feedback.
- **Current use:** Chapter 12.

### `client-makeup-kit` — Artist makeup kit

- **File:** `assets/images/beauty/Evening glam face makeup kit-4.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Makeup kit screen identifies the artist and service and offers Face, Eyes & lips and Tools tabs. Face is selected. Rows pair product thumbnails with their role, brand and product name. A Back to artist control closes the flow.
- **Visible controls/content:** Inspect skin prep, foundation, concealer, blush and finishing-product examples; Switch kit categories; Return to artist profile.
- **Current use:** Chapter 05 extra: data-extra="kit".

### `client-profile-reviews` — Artist profile / ratings

- **File:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_52 PM-5.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Artist profile with portrait, identity, sample rating and booking summary, Makeup kit shortcut and Services / Previous work / Ratings tabs. Ratings is selected, showing a large aggregate score and client review cards.
- **Visible controls/content:** Read prior client reviews; Switch profile tabs; Open makeup kit; Choose day and time.
- **Current use:** Chapter 05 extra: data-extra="reviews".

### `partner-review-client` — Review a client after an appointment

- **File:** `assets/images/beauty/Artist reviews client after appointment-7.png`
- **Perspective / dimensions:** Partner; 1024 × 1536 px.
- **What is shown:** Review client screen identifies a completed appointment and shows a star-rating control, written review, public-review note, preview of the artist’s review and Publish review action.
- **Visible controls/content:** Rate a completed client appointment; Write a review; Preview how the review will appear; Publish review in the app concept.
- **Current use:** Chapter 12 extra: data-extra="client-review".

### `client-filters-alternate` — Alternative artist filter composition

- **File:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_49 PM-3.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Choose your artist results with a portrait/card behind an open Filters bottom sheet. It represents the same location, price, minimum rating, availability and sorting flow as the selected filter artwork.
- **Visible controls/content:** Filter location, price, rating and availability; Choose sorting; Reset filters; Show matching artists.
- **Current use:** Available reference; not rendered by the current page.

### `client-profile-services` — Artist profile / services

- **File:** `assets/images/beauty/ChatGPT Image Oct 9, 2026, 11_14_54 PM-6.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Artist profile with Services selected. Radio-style service choices include Evening Glam, Soft Glam and Bridal Makeup, with durations and sample prices. Evening Glam is selected; continuation and day/time controls are visible.
- **Visible controls/content:** Choose a service on the artist profile; Continue with the selected service; Choose day and time.
- **Current use:** Available reference; not rendered by the current page.

### `client-location-alternate` — Alternative location screen with named artist

- **File:** `assets/images/beauty/Evening glam location selection-3.png`
- **Perspective / dimensions:** Client; 941 × 1672 px.
- **What is shown:** Alternative Where would you like it? composition. The service summary includes a named artist. Photo options show At home and At the venue, followed by a saved home address and Find artists.
- **Visible controls/content:** Choose home or venue for the selected service; Change the home address; Find artists.
- **Current use:** Available reference; not rendered by the current page.

## Interaction and code map

| Location | Responsibility | Editing guidance |
|---|---|---|
| `beauty.html` — `<style id="beauty-journal-styles">` | Page-local cover, paper-card styling, sticky screens, responsive layouts and viewer | Keep styles scoped to the beauty page and `j-` classes. Do not create cross-page style changes as a side effect. |
| `beauty.html` — `[data-walk-data]` JSON | Twelve EN/AR chapter titles, kickers, descriptions and UI strings | This is the runtime copy source. Keep the corresponding static chapter markup synchronized for fallback readability. |
| `beauty.html` — `.j-screens > [data-screen]` | Artwork for each chapter | Order must match the chapter data and chapter list. Preserve source-image proportions with contain sizing. Do not crop away app controls. |
| `beauty.html` — `.walk__chapters > [data-chapter]` | Narrative cards, fallback images, personalisation and extra-screen buttons | Keep headings and accessible anchor targets. Copy should explain the pictured step, with short paragraphs. |
| `assets/js/journey.js?v=20` | Existing scroll position measurement, active chapter, progress dots, personalised text and deep links | Shared with shop; it was reused, not modified. Chapter changes are based on chapter centers, not simply element tops. |
| `assets/js/phone.js?v=20` | Toggles `data-on` / `data-past` on stage screens | It works with the new supplied-image figures; do not restore the old fabricated phone UI to satisfy the filename. |
| `beauty.html` — final inline module | Page-local translation, image preloading/captions, screen viewer, extra views, centered chapter links | Imports the same version of `store.js` as the shared app so language/motion state is not duplicated. |
| `assets/js/store.js?v=20` | Shared language and motion state; guarded storage helpers | Preserve the import version used by the existing app. |
| `assets/js/app.js?v=39`, `form.js?v=21` | Existing menu, language setup, sticky CTA and beauty application/deck flow | Keep existing `data-apply="beauty"`, `data-deck` and form markup. These modules were not rewritten. |

### Detailed behavior to retain

- Scrolling selects the matching journal card and screenshot, and updates the progress dots and chapter count. Desktop uses narrative on the left and image on the right; RTL reverses the placement.
- `Start the journey`, contents links and `Next chapter` links center the target chapter using the same geometry as the existing journey controller. Chapter 06 explicitly invites the visitor to the partner’s side.
- Each progress dot jumps to its chapter and exposes an EN/AR accessible label. `?walk=1` through `?walk=12` are supported by the existing controller.
- The first card’s **Make the story yours** disclosure contains the name/salon input. The shared controller stores the value in session storage under `po-brand`, inserts it safely as text into `{brand}` narrative slots and can carry it into the existing application. It does **not** edit names inside PNG artwork.
- Stage screen 0 has a normal source. Other stage images start with `data-src`; the inline module loads the current and next screens. Fallback images in chapter markup remain ordinary lazy-loaded images for non-JS reading.
- The active image’s original full screenshot opens in `#screen-viewer`. Extra buttons map `kit`, `reviews` and `client-review` to their catalog entries. Closing restores focus. The viewer does not accept or publish bookings/reviews.
- Page-local text uses `data-j-en` / `data-j-ar`; runtime narrative uses `data-walk-data`; shared header/form/footer text uses the existing shared translation system. Original screenshot pixels remain English in Arabic mode, as noted in the viewer.
- Motion preference affects scrolling and transitions. With `?motion=off`, the stage screen transition is explicitly disabled; reduced-motion CSS is also present. The journal remains navigable.
- On phones, the chapter dots sit below the header, the screenshot stays above the card, and **View screen** sits beside the screenshot. Do not let the card or bottom application bar cover that button or the card’s next-step action.
- The no-JS fallback is an illustrated chapter list. Keep fallback text and images available; do not make the story depend entirely on scripts.

## Known limitations and follow-up work

These are recorded gaps, not changes implemented or authorization to expand the task.

1. **Build overwrite risk:** `tools/build_pages.py` regenerates `beauty.html` from older `src/partials` and `src/journey.json`. Those sources do not include the journal implementation. Do not run that generator for this page without first migrating the current work. The user had specifically scoped the redesign to `beauty.html`.
2. **Shared application schema is still home-only:** `assets/js/form.js` constructs beauty payloads with `where: 'app-home'`. The user-approved page now supports home and venue. When shared form/backend work is in scope, decide the intended location field/schema and align validation, payload, review display, translations and backend together. Do not claim this was already fixed.
3. **Shared service choices lag the artwork:** the existing beauty form includes makeup, hair, nails, lashes/brows, henna and skincare. The supplied Book screen also depicts hair removal, massage/spa, photography and consultations, and does not show a separate lashes/brows tile. Do not silently infer that the product taxonomy and intake schema are reconciled.
4. **No live booking operations:** the screenshots illustrate a planned app. Clicking image areas does not browse artists, take payments, reserve time, accept requests, edit services or publish reviews.
5. **Application/deck preview:** at handoff, `assets/js/config.js` has `applicationEndpoint: null` and all deck URLs null. Application controls open the existing preview flow; deck requests do not download or send an actual deck.
6. **Artwork language:** Arabic narrative and controls are implemented. The supplied English raster artwork has not been translated.
7. **Heavy source images:** all 18 PNGs total roughly 24 MB. Stage loading is deferred, but image optimization has not been performed. If asset edits become authorized, preserve originals and visual readability while producing appropriately sized derivatives.
8. **Repository state:** the supplied beauty image directory was untracked at implementation time. Confirm those source assets are included in any eventual commit/deployment; do not assume the HTML alone is sufficient. The unrelated `assets/.DS_Store` file was not modified or cleaned up by this work.

## Step-by-step procedure for future changes

1. **Read this document and the JSON companion.** Use the latest home/venue decision and journal requirement rather than the older home-only brief.
2. **Check the actual working tree.** Inspect `git status --short` and the current page diff; preserve user edits. Treat this handoff as a dated description, not proof that files are unchanged.
3. **Identify the affected step.** Map its public number to `chapter-N`, the zero-based screen index and the asset ID. Use the catalog before reopening an image. Compare the stored hash if there is reason to believe the artwork changed.
4. **Keep scope explicit.** For page-only work, edit `beauty.html`. For a requested build migration, first move the current page-local styles, module, chapter data and markup into maintainable sources; only then regenerate and verify other pages.
5. **Update content consistently.** Edit both EN and AR in the chapter JSON or page-local attributes, plus the static fallback copy. Keep placeholders such as `{brand}` intact. Do not invent confirmed dates, prices, review scores, partners or venue addresses.
6. **Update artwork mappings consistently.** If adding/reordering a chapter, synchronize JSON chapters, stage figures, fallback figures, chapter IDs, progress dots, caption/title arrays, contents ranges, links and `--chapters`. Update the documentation and JSON companion at the same time.
7. **Preserve controls.** Keep centered chapter navigation, name personalisation, the screen viewer, extra views, focus return, language/motion toggles and beauty/deck application hooks. Screenshots must remain clearly illustrative.
8. **Start a local static server from the project root:** `python3 -m http.server 5173 --bind 127.0.0.1`. Use a free port if that one is occupied. Do not run `tools/build_pages.py` as a preview step.
9. **Exercise the journey:** open `/beauty.html?lang=en&motion=off`; use Start, all chapter dots, Next, the partner shortcut and `?walk=7`. Verify the correct image is actually decoded and visible, not merely present in the DOM.
10. **Exercise supporting interactions:** personalise the narrative; open the active-screen viewer and all three supplementary screens; close by button and Escape; verify focus returns. Open the beauty application and deck-request flow without sending anything.
11. **Check layout and language:** desktop, tablet and small phones in English and Arabic; specifically 1440×1000, 820×900, 390×844 and 320×640. Check image/card/control overlap, horizontal overflow, header and sticky CTA, and a normal-motion plus reduced-motion visit. Allow fonts and image decoding to settle before taking screenshots.
12. **Validate and record:** run `git diff --check`, check duplicate IDs, fragment targets and image paths, inspect runtime errors, then update these docs with the actual scope and results. Clearly label anything not tested or not implemented.

## Verification recorded for the implemented journal

Completed during implementation: journey navigation to chapters on both sides; active-screen enlargement; supplementary client-review screen; personalisation; English/Arabic switching; beauty application preset; deck-request checkbox; horizontal-overflow and image/card geometry checks at the four sizes above in EN/AR; inspection of desktop and mobile rendering; zero page JavaScript errors in the final automated run; valid local image paths, fragment targets and unique IDs; `git diff --check`.

QA scripts and screenshots were temporary local files under `/tmp`; they are **not** a committed test suite. No production deployment, real booking, real application submission, payment, live provider onboarding or backend integration was performed. The documentation follow-up does not change the page’s product behavior.
