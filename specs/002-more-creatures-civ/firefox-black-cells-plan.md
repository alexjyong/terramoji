# Firefox Mobile Black Cells — Diagnosis & Fix Plan

**Date**: 2026-05-08
**Status**: Diagnosis only — not yet implemented

## Symptom
Grid cells render black on Firefox Mobile (Android). Works correctly on Chrome and Edge (both desktop and mobile).

## Root Cause Analysis

Cells have **no default `background`** on the `.cell` base class. Color comes entirely from `[data-biome="X"]` attribute selectors using `linear-gradient`.

Three Firefox Mobile-specific factors compound:

### Issue A: `.cell::before { z-index: -1 }` base rule (line 156 of game.css)
The base `::before` rule sets `z-index: -1` without `content`. Every cell gets a `::before` pseudo-element with `z-index: -1` and `content: normal`. In Firefox Mobile, `z-index` on a pseudo-element without explicit `position` creates a stacking context differently than Blink — it can send the element's own background below this stacking context, revealing the parent `#grid`'s `#0f0f23` dark background (appears black).

### Issue B: `overflow: hidden` on `.cell` + positioned `::before` with `inset: 0`
Each biome `::before` is `position: absolute; inset: 0;`. Firefox Mobile (Gecko) has known rendering bugs where `overflow: hidden` on a flexbox child inside a CSS grid causes the background to not paint when a positioned `::before` exists. Chrome/Edge don't exhibit this.

### Issue C: `linear-gradient` on empty cells
Cells with no emoji content rely entirely on CSS `background: linear-gradient(...)` for color. Firefox Mobile on Android occasionally fails to composite `linear-gradient` backgrounds inside grid items that are also `display: flex` containers, falling through to transparent.

## Diagnosis Steps (non-invasive, test on device)

1. Remove `.cell::before { z-index: -1; }` — if cells appear, Issue A is primary
2. Remove `overflow: hidden` from `.cell` — if cells appear, Issue B is primary
3. Add `background-color: #333` to `.cell` base — if cells get solid color, Issue C confirmed

## Proposed Fix (pick based on diagnosis)

**Fix 1 (Issue A — most likely, one line):**
```css
.cell::before {
  content: none;  /* No pseudo-element unless a biome rule overrides it */
}
```

**Fix 2 (Issue B — if #1 alone doesn't work):**
Remove `overflow: hidden` from `.cell` base class.

**Fix 3 (Issue C — safety net):**
Add solid color fallback:
```css
.cell {
  background-color: #1a1a2e;  /* fallback before gradient overrides */
}
```

**Combined safe fix** (if skipping diagnosis):
```css
.cell::before { content: none; }
```

## Files Involved
- `css/game.css` lines 109-122 (`.cell`), 156 (`.cell::before`), 160+ (biome selectors)
- `js/renderer.js` (textContent logic — no change needed)
