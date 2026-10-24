# PinkOut Partners — Motion notes (Direction B: snappy and springy, but business-calm)

**Budget:** one signature sequence (the 3D map intro), springy "pops" for entrances, quiet everywhere else. Every scroll-linked effect is reversible and uses native `position: sticky` (no ScrollTrigger pin spacers).

**Easing tokens:**
- `--ease-pop: cubic-bezier(.34,1.56,.64,1)` (GSAP `back.out(1.6)`): entrances, chips
- `--ease-out: cubic-bezier(.22,1,.36,1)` (GSAP `expo.out`): panels, camera
- `--ease-io: power2.inOut`: scrubbed moves

**Durations:** micro 160 ms · UI 240 ms · entrance 600–800 ms · camera 900 ms.

| # | Section | Trigger | Motion | Mobile | Reduced motion |
|---|---|---|---|---|---|
| 1 | Header | scroll > 24px | compacts: padding 16→10, soft shadow appears (240 ms) | same | instant |
| 1 | Header nav | section enters | active pill slides under the current link (300 ms, expo.out) | menu sheet slides up 320 ms | no slide |
| 2 | Hero panel | load (once) | panel pops up 24px + scale .97→1 (800 ms pop), then lines stagger 60 ms | same | static |
| 2 | Hero film | scrub, hero → next block | film scales 1→1.06, panel lifts −40px, opacity 1→0 | panel lift only | film paused on poster |
| 3 | Why cards | enters 80% | cards pop in, 90 ms stagger, once | same | static |
| 4 | **3D map intro** ★ | first time 50% visible | camera dolly 900 ms; zones rise one by one (7 × 80 ms, pop); then idle drift (render on demand) | shorter dolly; no drift | camera at rest, no rise |
| 4 | Zone select | user | camera tween to zone 900 ms expo.out; zone lifts 0.2 units; panel content cross-fades 240 ms; sticker pops | bottom sheet slides up 320 ms | instant |
| 4 | Zone chips | enters | chips pop in (60 ms stagger) | same | static |
| 5 | Audience figures | enters 75% | count up 1.2 s power3.out, once (real figures only) | same | final numbers |
| 5 | Journey line | scrub within section | line draws start→end (flips in RTL) | vertical line | full line |
| 6 | Opportunity cards | enters 80% | pop in, 70 ms stagger; hover lifts card 4px and tints its zone tag | no hover | static |
| 7 | Themed days | native sticky + scrub | track slides horizontally across 1.5 viewports (× −1 in RTL); progress line fills | native swipe + snap, no scrub | native swipe |
| 8 | Process steps | scrub | connector line draws; step dots pop as reached | vertical | full line |
| 9 | Status render | enters | clip-path inset reveal from bottom, 700 ms | same | static |
| 10 | FAQ | user | height auto via native `<details>` + 240 ms content fade | same | instant |
| 11 | Closing arch | enters | arch opens: clip-path `inset(100% 0 0 0 round 999px 999px 0 0)` → 0, 900 ms | same | static |
| — | Dialog | open/close | backdrop fade 200 ms; dialog pops 320 ms; steps slide 240 ms (× dir) | full-height sheet | fade only |
| — | Buttons | hover/press | bg colour 160 ms; press scale .97 | press only | colour only |

**Lifecycle rules:**
- Refresh ScrollTrigger after fonts load, on `pageshow`, and on language change.
- Pause video and the 3D render on `visibilitychange`.
- Never animate Arabic text letter by letter: split by word or line only.
