# Tasks: Planet MVP

**Input**: Design documents from `/specs/001-planet-mvp/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete)
**Last Updated**: 2026-04-27

**Amendment**: 2026-04-25 — Constitution v1.1.0: base terrain via CSS gradients/textures, emoji for entities only. Added ice biome (T006 updated to 5 types), pole enforcement (T011 updated), renderer no longer places emoji on base terrain (T012 updated).
**Amendment**: 2026-04-26 — Added forest and jungle biomes (7 total, T006 updated). Mountain/forest/jungle tiles display landmark emoji (🏔️/🌲/🌴) as permanent entities. Toolbar buttons expanded to 7 biomes (T016 updated).
**Amendment**: 2026-04-27 — Added User Story 2.5 (Inspect Tile Details, Phase 4.5) with floating tooltip showing biome/creature/civilization info. Added `civilization` field placeholder to cell data model (T038). Clarification session: many-to-many creature-biome mapping, pause/resume toggle (T039-T041), live editing during simulation.

**Tests**: Included — constitution mandates test-first for simulation logic.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directory structure (css/, js/, tests/) per implementation plan
- [x] T002 [P] Create index.html with basic HTML5 skeleton, toolbar container, grid container, script tags in index.html
- [x] T003 [P] Create css/game.css with base reset and page layout styles
- [x] T004 [P] Create js/simulation.js, js/renderer.js, js/input.js as empty modules

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement mulberry32 PRNG function in js/simulation.js
- [x] T006 Define BIOMES configuration object (7 types: water, grassland, desert, mountain, forest, jungle, ice — each with emoji, color, creature, and landmark mappings) in js/simulation.js
- [x] T007 Initialize SimulationState object structure (grid, tick, selectedBiome, isRunning, isPaused) in js/simulation.js
- [x] T008 Create render() stub function that reads SimulationState and updates DOM in js/renderer.js

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Generate & Display a Planet (Priority: P1) 🎯 MVP

**Goal**: Player clicks "New Planet" and sees a 30×30 grid of terrain tiles (CSS-styled) with clustered biomes and ice at poles

**Independent Test**: Load page → click "New Planet" → verify grid of styled tiles appears with multiple biome types and ice at top/bottom rows

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Test mulberry32 PRNG produces deterministic sequences in tests/test_simulation.js
- [x] T010 [P] [US1] Test terrain generation creates 30×30 grid with all 7 biome types, ice enforced at poles, and smoothing preserves grid in tests/test_simulation.js

### Implementation for User Story 1

- [x] T011 [US1] Implement generatePlanet() function: seed PRNG, fill grid with random biomes (ice forced at pole rows), apply 2-3 cellular automata smoothing passes, re-enforce poles in js/simulation.js
- [x] T012 [US1] Implement renderGrid() function: create 30×30 CSS Grid of div cells with `data-biome` attribute for CSS styling; landmark emoji displayed on mountain/forest/jungle tiles; creature emoji only displayed when creatures present (no emoji on base terrain for other biomes) in js/renderer.js
- [x] T013 [US1] Add "🌍 New Planet" button to toolbar container in index.html
- [x] T014 [US1] Wire "New Planet" button click handler: call generatePlanet() then renderGrid() in js/input.js
- [x] T015 [US1] Add CSS Grid layout styles for 30×30 grid with biome-specific CSS gradient backgrounds and pseudo-element textures in css/game.css

**Checkpoint**: At this point, User Story 1 should be fully functional — player can generate and see a planet

---

## Phase 4: User Story 2 - Place Biomes via Toolbar (Priority: P2)

**Goal**: Player selects a biome from toolbar and clicks grid tiles to change terrain

**Independent Test**: Generate planet → select grassland from toolbar → click water tile → tile changes to grassland emoji

### Implementation for User Story 2

- [x] T016 [P] [US2] Add biome selection buttons (🌊🌿🏜️🏔️🌲🌴❄️) to toolbar in index.html
- [ ] T017 [P] [US2] Add toolbar button styles and active selection highlight in css/game.css
- [ ] T018 [US2] Implement toolbar click handler: set SimulationState.selectedBiome, update visual selection in js/input.js
- [ ] T019a [US2] Implement grid cell click handler: update cell biome in SimulationState.grid in js/simulation.js
- [ ] T019b [US2] Call existing creature cleanup/spawn functions after biome change (or defer to US3's tick-based logic if creatures aren't live yet) in js/input.js
- [ ] T020 [US2] Wire biome change to call renderGrid() for updated display in js/input.js

**Checkpoint**: At this point, player can generate a planet AND manually edit terrain

---

## Phase 4.5: User Story 2.5 — Inspect Tile Details (Priority: P2.5) 🔍

**Goal:** Player selects the magnifying glass tool and clicks any tile to see its biome name, creature type, and civilization type in a floating popup near the tile

**Independent Test:** Generate planet → select 🔍 Inspect → click tile → floating popup appears showing biome name + emoji, creature info (if any), civilization info (if any)

### Implementation for User Story 2.5

- [ ] T034 [P] [US2.5] Add "🔍 Inspect" button to toolbar in `index.html`
- [ ] T035 [P] [US2.5] Add floating tooltip popup container and styles (positioned near clicked tile, dismisses on next click or Escape) in `css/game.css`
- [ ] T036 [US2.5] Implement inspect tool mode: toggle on/off, deselect edit tool when active, update toolbar visual state in `js/input.js`
- [ ] T037 [US2.5] Wire grid cell click handler for inspect mode: read cell biome/creature/civilization data, populate and position floating tooltip in `js/renderer.js` + `js/input.js`
- [ ] T038 [US2.5] Add `civilization` field to cell data model (nullable placeholder for future expansion — currently null for all tiles) in `js/simulation.js`

> **Note:** "Civilization" is a forward-looking field. It is `null` today but will support villages, cities, ruins, etc. in later milestones. The tooltip shows it only when present.

**Checkpoint**: Player can now generate, edit, AND inspect tiles — full read-write-understand loop

---

## Phase 5: User Story 3 - Creatures Appear & Move (Priority: P3)

**Goal**: Creatures spawn on matching biomes and move randomly each tick

**Independent Test**: Generate planet → wait 1 second → verify creatures are visible on biomes and have moved positions

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T021 [P] [US3] Test creature spawning places correct creature type on matching biome in tests/test_simulation.js
- [ ] T022 [P] [US3] Test creature movement only moves to adjacent compatible biome cells in tests/test_simulation.js
- [ ] T023 [US3] Test creature removal when biome changes to incompatible type in tests/test_simulation.js

### Implementation for User Story 3

- [ ] T024 [US3] Implement spawnCreatures() function: iterate grid, add creatures to cells based on biome type, respect max 5 per cell and 200 total in js/simulation.js
- [ ] T025 [US3] Implement moveCreatures() function: for each creature, pick random adjacent cell, move only if cell biome is in creature's compatibleBiomes set in js/simulation.js
- [ ] T026 [US3] Implement tick() function: call moveCreatures(), spawnCreatures(), remove incompatible creatures, increment tick counter in js/simulation.js
- [ ] T027 [US3] Implement startSimulation() function: setInterval(tick, 1000), set isRunning flag in js/simulation.js
- [ ] T028 [US3] Call spawnCreatures() and startSimulation() after generatePlanet() completes in js/input.js
- [ ] T029 [US3] Update renderGrid() to display creature emoji(s) within each cell div on top of CSS terrain; landmark emoji on mountain/forest/jungle tiles; no base terrain emoji for other biomes, only creature entities in js/renderer.js

### Pause/Resume Control (FR-012)

- [x] T039 [P] [US3] Add "⏸️ Pause" / "▶️ Resume" toggle button to toolbar in index.html
- [x] T040 [US3] Implement pause/resume handler: toggle `isPaused` flag, skip tick loop when paused, update button visual state in js/input.js
- [x] T041 [US3] Reset `isPaused: false` on new planet generation in js/simulation.js

**Checkpoint**: All user stories should now be independently functional — full core loop works, player can pause simulation

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T030 [P] Create README.md with setup instructions, feature status, project structure
- [ ] T031 Code cleanup: remove console.debug statements, add inline comments for complex logic (cellular automata, tick loop)
- [ ] T032 [P] Integration test: verify state change → DOM update cycle in tests/test_renderer.js
- [ ] T033 Run quickstart.md validation: open index.html, verify all 3 user stories work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Depends on US1 renderGrid() function
- **User Story 2.5 (P2.5)**: Can start after US2 toolbar wiring — Depends on US1 generatePlanet() and US2 tool mode logic
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Depends on US1 generatePlanet() and US2 biome change logic

### Parallel Opportunities

- All Setup tasks T002-T004 marked [P] can run in parallel
- All US1 test tasks T009-T010 marked [P] can run in parallel
- All US3 test tasks T021-T022 marked [P] can run in parallel
- Toolbar HTML (T016) and toolbar CSS (T017) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Generate planet → see grid → done (MVP!)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Generate planet works → **MVP!**
3. Add User Story 2 → Edit terrain works → Interactive
4. Add User Story 2.5 → Inspect tiles works → Read-write-understand loop
5. Add User Story 3 → Creatures move → Living simulation
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests written FIRST for simulation logic (constitution requirement)
- Commit after each task or logical group
- Verify at each checkpoint before proceeding
