# PinkOut Partners — Design system (Direction B · Sorbet Showroom)

**Chosen:** 23 Oct 2026. Source of truth for code: `assets/css/tokens.css`. The build uses tokens only, never raw hex.

## Direction

The consumer site's joyful colour-block world, **edited for business readers**:
- Each of the seven zones owns one pastel block.
- Cherry is used only for actions.
- Berry carries all text.
- Stickers are rare accents (at most one per zone, never decoration for its own sake).
- Facts and offers are set bigger and calmer than on the consumer site.

References: Museum of Ice Cream (colour blocks, white invitation panel) and SWSH (scroll storytelling), both already used for the consumer site, so partners recognise the brand they'd be joining.

## Palette (all text pairs checked for WCAG AA)

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--c-canvas` | `#fff5f8` Sorbet | page background | — |
| `--c-surface` | `#ffffff` White | panels, cards, inputs | — |
| `--c-text` | `#7d163f` Berry | all text, icons | 9.6:1 on sorbet · 10.2:1 on white |
| `--c-text-2` | `#924060` Berry 2 | secondary text | 6.3:1 on sorbet |
| `--c-action` | `#df004c` Cherry | primary buttons, links, selected | white label 4.95:1 · as text on sorbet 4.6:1 |
| `--c-action-hover` | `#b90040` | hover / pressed | — |
| `--c-line` | berry at 14% | hairlines, input borders (inputs use berry at 45% for 3:1) | — |
| `--c-error` | `#b00020` | errors | 6.9:1 on sorbet |
| `--c-ok` | `#0f6b4f` | success | 6.1:1 on sorbet |
| `--c-focus` | `#7d163f` | 3px focus ring (white ring on cherry and berry fills) | — |

**Colour blocks:** berry text passes AA on every one (≥ 6.3:1).

| Token | Hex | Zone |
|---|---|---|
| `--c-pink` | `#ffc9de` | Pink Passage |
| `--c-butter` | `#fff0aa` | Rose Hub |
| `--c-lavender` | `#ddcffb` | Beauty Lab |
| `--c-mint` | `#c7efdf` | Craft Studio |
| `--c-peach` | `#ffd9c2` | Pink Market |
| `--c-sky` | `#d8ecff` | Move Studio |
| `--c-rose` | `#ffb8d2` | PinkOut Live |

Rule: a block's text is always berry; buttons on blocks are cherry. No white text on pastels.

## Type

**IBM Plex Sans Arabic**, one family for both scripts, self-hosted (`assets/fonts/`, OFL). Weights 400 / 500 / 600. Headlines use **600** (there is no 700 file, which avoids an extra download).

| Token | Size | Line height | Use |
|---|---|---|---|
| `--fs-display` | clamp(36px, 5.6vw, 76px) | 1.04 (AR 1.25) | hero headline |
| `--fs-h2` | clamp(30px, 4.2vw, 56px) | 1.06 (AR 1.3) | section headlines |
| `--fs-h3` | clamp(20px, 2.2vw, 28px) | 1.2 | card / panel titles |
| `--fs-lead` | clamp(17px, 1.5vw, 20px) | 1.6 | intro lines |
| `--fs-body` | 16px EN / 17px AR | 1.65 / 1.85 | body |
| `--fs-small` | 14px | 1.5 | tags, notes, captions |
| `--fs-stat` | clamp(44px, 6vw, 84px) | 1 | audience figures |

Letter-spacing −0.02em on display and h2 in **English only**; Arabic is always 0. Arabic gets taller line heights. No all-caps eyebrows: eyebrows are sentence-case **butter pills**.

## Layout

| Token | Value |
|---|---|
| `--container` | 1280px content max |
| `--gutter` | 16px (12px ≤ 800px): page edge to block |
| `--block-gap` | 16px (12px ≤ 800px): between blocks |
| `--block-pad` | clamp(24px, 5vw, 72px): inside blocks |
| `--radius-block` | 32px (24px ≤ 800px) |
| `--radius-card` | 24px |
| `--radius-input` | 14px |
| `--radius-pill` | 999px |
| Space scale | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 |
| Breakpoints | 560 · 800 · 1100 (content-led) |

**Sections are rounded colour blocks** inset from the page edge by the gutter and separated by the block gap, as on the consumer site. Inside a block, content uses a 12-column grid. Logical properties everywhere (`margin-inline-start`, `inset-inline-end`) so RTL comes for free.

## Elevation

Almost flat. Only two shadows:
- `--shadow-pop`: dialogs, the bottom sheet and the sticky header.
- `--shadow-sticker`: drop shadow on stickers.

Cards separate by colour, not shadow.

## Imagery

- **Concept renders** sit in 32px-rounded frames with a small "Concept" pill.
- **Hero film:** muted, with a pause control.
- **Stickers:** 280px WebP, rotated −8° to +12°, overlapping a frame corner.
- **Beauty Lab render:** shows third-party brand names, so it is **cropped or captioned "brands shown are illustrative"** (decide in the build; default is caption + crop).

## Icons

Simple 2px-stroke line icons in berry, 24px, drawn inline as SVG. Reused from the consumer site's doodle set where they fit.

## Accessibility

- Text: AA everywhere.
- Focus: a 3px ring with a 3px offset, never removed.
- Targets: ≥ 44px.
- The film has a pause button.
- Motion respects `prefers-reduced-motion` and the footer toggle.
- Language: `lang` and `dir` on `<html>`. Phone and email inputs stay LTR inside Arabic.
