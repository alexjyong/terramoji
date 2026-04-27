# Implementation Plan: Planet MVP

**Branch**: `001-planet-mvp` | **Date**: 2026-04-24 | **Last Updated**: 2026-04-27
**Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-planet-mvp/spec.md`

**Amendment**: 2026-04-25 — Constitution v1.1.0: base terrain rendered via CSS gradients/textures, emoji reserved for entities. Added ice biome with pole enforcement.
**Amendment**: 2026-04-26 — Added forest and jungle biomes (7 total). Mountain/forest/jungle tiles display landmark emoji (🏔️/🌲/🌴) as permanent entities.
**Amendment**: 2026-04-27 — Clarification session: creature-biome mapping is many-to-many (not 1:1), mountains have own creature (🐐), pause/resume toggle added, seed internal-only, live editing during simulation.

## Summary

Build a browser-based SimEarth-inspired prototype: a 30×30 grid of terrain tiles (rendered via CSS gradients/textures) that can be procedurally generated, manually edited via a toolbar (live during simulation), and populated with emoji creatures that move on a tick-based simulation. Mountain/forest/jungle tiles display landmark emoji (🏔️/🌲/🌴). Creatures have many-to-many biome compatibility (can inhabit multiple biome types). Vanilla JavaScript, CSS Grid rendering, zero external dependencies. Ice biome enforced at polar rows. 7 biome types total. Pause/resume toggle for simulation control.

## Technical Context

**Language/Version**: JavaScript ES2022+ (no transpiler)
**Primary Dependencies**: None — vanilla JS + CSS only
**Storage**: N/A — no persistence for MVP, all state in memory
**Testing**: Node.js + native `assert` module (no test framework for MVP)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari) — desktop/tablet
**Project Type**: Web application (single-page, no backend)
**Performance Goals**: 60fps rendering on 30×30 grid with 50+ creatures
**Constraints**: No external assets, no frameworks, DOM-based rendering, single simulation state object, tick-based updates
**Scale/Scope**: 1 HTML file, 1 CSS file, 1 JS file (minimal structure for PoC)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Status |
|-----------|-----------|--------|
| I. Simplicity First | 3 user stories, no save/load, no networking, no complex AI | ✅ Pass |
| II. Emoji-First Graphics (Entities) + CSS Terrain | Entities (creatures) use emoji; base terrain uses CSS gradients/textures; no external assets | ✅ Pass (v1.1.0) |
| III. Simulation Integrity | Tick-based, deterministic seed, synchronous updates | ✅ Pass |
| IV. Interactive by Default | Toolbar placement + click-to-change, one-level UI | ✅ Pass |
| V. Incremental Scope | Vertical slices: generate → place → creatures | ✅ Pass |

**Verdict**: All gates pass. No violations to justify. Constitution v1.1.0.

## Project Structure

### Documentation (this feature)

```text
specs/001-planet-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
index.html          # Entry point — toolbar + grid container
css/
└── game.css        # Grid layout, toolbar styling, cell/creature styling
js/
├── simulation.js   # Core simulation state, tick loop, biome/creature logic
├── renderer.js     # DOM rendering — grid cells, creatures, toolbar
└── input.js        # Event handling — toolbar selection, grid clicks
tests/
├── test_simulation.js  # Unit tests for tick, spawn, movement logic
└── test_renderer.js    # Integration tests for state → DOM cycle
```

**Structure Decision**: Flat web app structure — no backend, no build tool, no framework. Three JS modules (simulation, renderer, input) separated by concern but loaded via `<script>` tags. Minimal directory nesting for PoC simplicity.

## Complexity Tracking

> No constitution violations — this section is N/A.
