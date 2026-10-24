# PINK OUT — Build Plan

A cinematic campaign site for Breast Cancer Awareness Month (Pink October).
One message: **Wear it. Check it. Share it.**
Stack: plain HTML/CSS/JS · **Three.js** (3D awareness ribbon) · **GSAP 3.13** (ScrollTrigger + SplitText) · **Lenis** smooth scroll.

---

## Step 1 — Concept & art direction
- **Hero object:** a real-time 3D pink awareness ribbon (Three.js), lacquered and glossy, that draws itself on load
  and then *travels with you* through the page (fixed canvas, a different pose per section).
- **Mood:** dark wine night (`#14070e`) with hot-pink light, plus one blush "daylight" panel for the facts.
- **Type:** Bricolage Grotesque (huge, heavy display) + Instrument Serif italic (emotional accents).
- **Assets:** no images were supplied, so every visual is generated in code (3D ribbon, particles, CSS glow).

## Step 2 — Page structure (sections)
| # | Section | What it says | Signature motion |
|---|---------|--------------|------------------|
| 0 | Loader | 0 → 100 counter | Curtain lifts (clip-path) as the ribbon starts drawing |
| 1 | Hero | **PINK OUT**, the October call | Letters converge from both sides, ribbon draws itself; on scroll PINK slides left, OUT right |
| 2 | Manifesto | Why early detection matters | Pinned, word-by-word scroll lighting; ribbon moves to the right |
| 3 | Numbers | 1 in 8 · 99% · 2.3M (WHO / ACS) | Circle-iris reveal into a blush panel, counters count up |
| 4 | Know the signs | 6 changes to watch | Pinned horizontal scroll track with progress bar |
| 5 | Three checks | Know your normal · Get screened · Speak up | Sticky stacked cards that push back as the next arrives |
| 6 | How to Pink Out | Wear pink · Host · Share · Give | Staggered 3D cards with mouse tilt |
| 7 | Marquee | "Wear it ✦ Check it ✦ Share it" | Scroll-velocity reactive marquee |
| 8 | Pledge | Take the pledge | Ribbon returns center stage, button triggers confetti + ribbon spin |
| 9 | Footer | Sources + not-medical-advice note | Fade up |

## Step 3 — Depth layers (every section)
- `depth-0` background gradient / glow · `depth-1` atmosphere blobs · `depth-2` giant bleed type
- `depth-3` the 3D ribbon canvas (fixed, between type and UI) · `depth-4` text + UI · `depth-5` particles / confetti

## Step 4 — Three.js scene (`js/main.js`)
1. Custom ribbon geometry: a CatmullRom curve shaped like the awareness loop, swept with a thin rectangular
   cross-section (real thickness, hard edges). Indices ordered per segment so `drawRange` can "draw" it.
2. `MeshPhysicalMaterial` (clearcoat + sheen + light iridescence) lit by a `RoomEnvironment` + pink rim lights.
3. ~1,200 soft pink dust particles (fewer on mobile).
4. A shared `ribbon` state object (x, y, scale, rotations) that GSAP tweens per section; the render loop adds
   idle float + mouse parallax on top. Positions are relative to the visible viewport, so mobile works too.
5. WebGL failure → CSS fallback ribbon glow; tab hidden → rAF pauses itself.

## Step 5 — GSAP choreography
- Lenis drives smooth scroll and feeds `ScrollTrigger.update`.
- One `fromTo` scrubbed tween per section moves the ribbon to that section's pose.
- SplitText for hero chars, manifesto words, and section headings (masked line reveals).
- `gsap.matchMedia()` separates desktop / mobile / reduced-motion behaviour.

## Step 6 — Interactions
- Magnetic buttons, custom cursor (fine pointers only), tilt cards.
- Pledge button: confetti burst, ribbon double-spin, state remembered on this device (localStorage, guarded).
- Share button: Web Share API, falls back to copying the link.

## Step 7 — Quality gates
- `prefers-reduced-motion`: no smooth scroll, no scrub; everything visible, ribbon static.
- Animate only transform / opacity / clip-path. Decorative layers get `aria-hidden`.
- Test desktop (1440) and mobile (375) in the browser; check the console for errors.
- Run the epic-design `validate-layers.js` check.

## Run it
```bash
python3 -m http.server 5173
```
Then open http://localhost:5173 (ES modules need a server; opening the file directly won't work).
