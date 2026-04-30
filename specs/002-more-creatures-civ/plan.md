# Implementation Plan: More Creatures & Civilization Mode

**Branch**: `002-more-creatures-civ` | **Date**: 2026-04-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-more-creatures-civ/spec.md`

## Summary

Expand creature roster from 7 to ~25 types across all biomes with multi-biome compatibility. Add civilization mode: player creates civilizations via Monolith tool (requires creatures) or manual placement, civilizations auto-advance through 7 tech stages (Stone→Nanotech) with ~2% chance per tick. Civilizations coexist with creatures, persist through biome changes, and display in inspect tooltip.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2022+
**Primary Dependencies**: None (zero external dependencies — constitution constraint)
**Storage**: None (in-memory state only, no persistence)
**Testing**: Node.js `assert` module (existing test infrastructure)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari) via DOM + CSS Grid
**Project Type**: Single-page web application
**Performance Goals**: 60fps rendering on 30×30 grid with 25 creature types and active civilizations
**Constraints**: No external assets (emoji + CSS only), no frameworks, single state object, DOM-based rendering
**Scale/Scope**: ~25 creatures, 7 tech stages, unlimited civilization cells, same 30×30 grid

## Constitution Check

*GATE: Pre-research evaluation*

| Principle | Compliance | Notes |
|-----------|-----------|-------|
| I. Simplicity First | ✅ | No networking, no save/load, no AI. Civs don't spread or interact — just advance independently |
| II. Emoji-First Graphics | ✅ | All new creatures and tech stages are emoji. CSS terrain unchanged |
| III. Simulation Integrity | ✅ | Deterministic tick loop extended with civ advancement. Same seed → same outcome |
| IV. Interactive by Default | ✅ | Monolith and civ placement are toolbar buttons — one click to select, one click to place |
| V. Incremental Scope | ✅ | Creatures ship independently of civs. Each user story is independently testable |

**Post-design re-check**: No violations introduced. All new functionality serves the core loop: place terrain → watch life emerge → spark civilization → watch it evolve → inspect results.

## Project Structure

### Documentation

```text
specs/002-more-creatures-civ/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Verification guide
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code Changes

```text
js/
├── simulation.js        # Modified: expanded CREATURE_TYPES, civilization logic, tech advancement
├── renderer.js          # Modified: render civ emoji, update inspect tooltip for civ stage
├── input.js             # Modified: monolith tool handler, civ placement handler
└── (no new files)       # Constitution: simplicity first, no unnecessary file proliferation

css/
└── styles.css           # Modified: civilization overlay styling

tests/
├── test_simulation.js   # Modified: tests for expanded creatures, civ creation, tech advancement
└── test_renderer.js     # Modified: tests for civ rendering in DOM and tooltip

index.html               # Modified: add Monolith button + Civ placement button to toolbar
```

**Structure Decision**: All changes go into existing files. No new source files needed — the feature extends existing systems (creature table, cell data model, tick loop, renderer, toolbar) without introducing new modules. This aligns with Simplicity First.

## Implementation Phases

### Phase 1: Expanded Creature Roster (already partially done)
- [x] Add 18 new creatures to `CREATURE_TYPES`
- [x] Add `getCreaturesForBiome()` helper
- [x] Update spawning to randomly pick from expanded pool
- [ ] Update renderer to recognize new creature emojis in tooltip

### Phase 2: Civilization Core
- Add `TECH_STAGES` array with emoji + names
- Extend cell `civilization` field from `null` to `{ stage: number }`
- Implement `createCivilization(row, col)` function
- Implement `advanceCivilization(civ, cell)` with configurable probability
- Update `smoothGrid()` to preserve civilization data
- Update `generatePlanet()` to reset civilizations

### Phase 3: UI — Monolith & Placement Tools
- Add 🗿 Monolith button to toolbar in `index.html`
- Add 🏠 Civ placement button to toolbar
- Extend `state` with `monolithMode` and `civMode` flags
- Add click handlers in `input.js` for both tools
- Mutually exclusive tool selection (biome paint / monolith / civ / inspect)

### Phase 4: Renderer — Civilization Display
- Render civilization emoji on cell (alongside creature overlay)
- Update render priority: landmark > civilization > cactus > creature
- Style civilization overlay in CSS
- Update inspect tooltip to show tech stage name + emoji

### Phase 5: Integration & Tests
- Add tests for expanded creature spawning
- Add tests for civilization creation (monolith + manual)
- Add tests for tech advancement over multiple ticks
- Add tests for civ persistence through biome changes
- Add renderer integration tests for civ display
- Run full test suite, verify quickstart scenarios
