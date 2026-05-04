# Tasks: More Creatures & Civilization Mode

**Branch**: `002-more-creatures-civ` | **Date**: 2026-04-30
**Total**: 35 tasks across 6 phases

## Phase 1: Expanded Creature Roster (done)

- [x] **T1** Add 18 new creatures to `CREATURE_TYPES` in `simulation.js`
  - All 25 creature types with `compatibleBiomes` arrays
  - _File: `js/simulation.js`_

- [x] **T2** Add `getCreaturesForBiome()` helper and update spawning to pick from expanded pool
  - _File: `js/simulation.js`_

- [x] **T3** Update renderer to recognize new creature emojis in inspect tooltip
  - Verify all 27 creature types display correctly when inspected
  - _File: `js/renderer.js` (already correct — uses `cr.emoji` and `cr.name` from expanded roster)_
  - _Test: `tests/test_renderer.js` — added T3 IIFE test, creates 1×27 grid with one creature per cell_

## Phase 2: Civilization Core

- [x] **T4** Add `TECH_STAGES` array with 7 stages (Stone → Nanotech), each with `name` + `emoji`
  - Define in `simulation.js` alongside `CREATURE_TYPES`
  - Stages: 🛖 Stone, 🛕 Bronze, 🏰 Iron, 🏭 Industrial, ☢️ Atomic, 💻 Information, 🔮 Nanotech
  - Add `TECH_ADVANCE_CHANCE` constant (default 0.02)
  - _File: `js/simulation.js`_

- [x] **T5** Extend cell data model — `civilization` field from `null` to `{ stage: number }`
  - Verify `createCell()` and grid init initialize `civilization: null` (already done in current code)
  - _File: `js/simulation.js`_
  - _Test: `tests/test_simulation.js` — verify cell has civilization: null_

- [x] **T6** Implement `createCivilization(row, col)` function
  - Checks cell has creatures present (monolith mode) OR allows placement regardless (manual mode)
  - Sets `cell.civilization = { stage: 0 }`
  - Returns false if civilization already exists
  - _File: `js/simulation.js`_
  - _Depends on: T4, T5_
  - _Test: `tests/test_simulation.js` — create civ, verify stage 0_

- [x] **T7** Implement `advanceCivilization(cell)` with ~2% chance per tick
  - Increments `cell.civilization.stage` by 1, clamped at max stage (index 6)
  - Called from existing tick loop for every cell with a civilization
  - _File: `js/simulation.js`_
  - _Depends on: T4_
  - _Test: `tests/test_simulation.js` — advance over multiple ticks, verify progression_

- [x] **T8** Integrate civilization advancement into `tick()` function
  - Loop all cells, call `advanceCivilization()` for each civ cell
  - _File: `js/simulation.js`_
  - _Depends on: T7_

- [x] **T9** Update `smoothGrid()` to preserve civilization data during biome smoothing
  - Copy `civilization` from old cell to new cell in smoothing pass
  - _File: `js/simulation.js`_
  - _Depends on: T5_
  - _Test: `tests/test_simulation.js` — smooth grid, verify civ persists_

- [x] **T10** Update `generatePlanet()` to reset all civilizations and clear units on new planet
  - _File: `js/simulation.js`_
  - _Depends on: T5_
  - _Test: `tests/test_simulation.js` — generate planet, verify all civs null_

## Phase 3: UI — Monolith & Placement Tools

- [x] **T11** Add 🗿 Monolith button and 🏠 Civ placement button to toolbar in `index.html`
  - Group in a new `<div class="civ-buttons">` section
  - _File: `index.html`_

- [x] **T12** Extend `state` object with `monolithMode` and `civMode` boolean flags
  - Mutually exclusive with `selectedBiome` and `inspectMode`
  - _File: `js/simulation.js`_
  - _Depends on: T11_

- [x] **T13** Add click handlers in `input.js` for Monolith and Civ placement tools
  - Monolith: call `createCivilization(row, col)` only if cell has creatures
  - Manual: call `createCivilization(row, col)` on any tile
  - Deselect other tools when either is selected
  - _File: `js/input.js`_
  - _Depends on: T6, T12_

- [x] **T14** Style new toolbar buttons in CSS (active state, hover)
  - _File: `css/game.css`_

## Phase 4: Renderer — Civilization Display

- [x] **T15** Render civilization emoji on cell based on `TECH_STAGES[cell.civilization.stage].emoji`
  - Update render priority: landmark > civilization > unit > cactus > creature
  - Civilization emoji renders as main cell content; creature overlays as span
  - _File: `js/renderer.js`_
  - _Depends on: T4, T10_
  - _Test: `tests/test_renderer.js` — verify civ emoji appears_

- [x] **T16** Update inspect tooltip to show tech stage name + emoji from `TECH_STAGES`
  - Replace hardcoded `🏛️` with dynamic stage lookup
  - _File: `js/renderer.js`_
  - _Depends on: T4, T15_
  - _Test: `tests/test_renderer.js` — verify tooltip shows correct stage_

## Phase 5: Mobile Units — Spreading & Settlement

- [x] **T17** Define `UNIT_TYPES` mapping in `simulation.js`
  - Object mapping stage index (0-5) → `{ emoji, movementType }` for land and sea variants
  - Stone: 🚶 land, Bronze: 🏇 land + 🛶 sea, Iron: 🐪 land + ⛵ sea, Industrial: 🚂 land + 🚢 sea, Atomic/Information: ✈️ air
  - Add `UNIT_SPAWN_CHANCE` (default 0.01) and `MAX_UNITS` (default 20)
  - _File: `js/simulation.js`_
  - _Depends on: T4_

- [x] **T18** Add `unit` field to cell data model (`MobileUnit | null`)
  - Initialize as `null` in `createCell()`, `smoothGrid()`, `generatePlanet()`
  - _File: `js/simulation.js`_
  - _Depends on: T17_

- [x] **T19** Implement `countActiveUnits()` helper
  - Returns total units across all cells (for cap enforcement)
  - _File: `js/simulation.js`_
  - _Depends on: T18_

- [x] **T20** Implement `spawnUnit(row, col)` function
  - ~1% chance per tick per civilization cell (stages 0-5 only, not nanotech)
  - Checks unit cap before spawning
  - Picks land or sea unit based on current cell biome (water → sea unit if available, else land unit)
  - Creates `unit: { emoji, stage, movementType }` on the cell
  - _File: `js/simulation.js`_
  - _Depends on: T17, T18, T19_
  - _Test: `tests/test_simulation.js` — spawn unit, verify properties_

- [x] **T21** Implement `moveUnits()` function
  - Iterate all cells, for each unit: pick random adjacent cell (8-directional including diagonals)
  - Wrap around map edges (toroidal topology)
  - Check terrain restriction: land can't enter water, sea can't enter land, air crosses anything
  - If move invalid, unit stays in place
  - _File: `js/simulation.js`_
  - _Depends on: T18_
  - _Test: `tests/test_simulation.js` — move unit, verify terrain restrictions_

- [x] **T22** Implement `settleUnit(row, col)` function
  - If target cell has no civilization: create civ at unit's stage, clear unit from cell
  - If target cell has civilization: unit disappears, no effect
  - Called after each successful move (inlined in `moveUnits()`)
  - _File: `js/simulation.js`_
  - _Depends on: T6, T21_
  - _Test: `tests/test_simulation.js` — unit settles, verify new civ created_

- [x] **T23** Integrate unit spawning and movement into `tick()` function
  - Order: spawn units → move units → settle units → (after existing creature/civ logic)
  - _File: `js/simulation.js`_
  - _Depends on: T20, T21, T22_

- [x] **T24** Clear all units on planet regeneration in `generatePlanet()`
  - _File: `js/simulation.js`_
  - _Depends on: T18_
  - _Test: `tests/test_simulation.js` — generate planet, verify no units_

- [x] **T25** Render mobile unit emoji overlay in renderer
  - Unit renders as CSS overlay span on the cell (below civilization emoji, above cactus/creature)
  - _File: `js/renderer.js`_
  - _Depends on: T18_
  - _Test: `tests/test_renderer.js` — verify unit emoji renders_

- [x] **T26** Update inspect tooltip to show mobile unit info when present
  - Display unit emoji + originating civ stage name
  - _File: `js/renderer.js`_
  - _Depends on: T4, T18, T25_
  - _Test: `tests/test_renderer.js` — verify tooltip shows unit_

- [x] **T27** Style unit overlay in CSS (position, size, z-index)
  - _File: `css/game.css`_

## Phase 6: Bug fixes & polish

- [x] **T28** Fix duplicate `createCivilization` calls on touch devices (touchstart + mousedown co-firing)
  - Replace mousedown/touchstart/touchmove/touchend with pointerdown/pointermove/pointerup
  - _File: `js/input.js`_

- [x] **T29** Fix monolith/civ button behavior split
  - Monolith: only founds first civ (one-per-planet guard, requires creatures)
  - Civ button: places new city at max existing tech stage (requires existing civ, any empty cell)
  - No manual advancing — advancing only via tick loop
  - _File: `js/simulation.js`_

- [x] **T30** Fix mobile units vanishing after one move
  - Units now persist and wander for `UNIT_WANDER_TICKS` (8 ticks) before settling
  - _File: `js/simulation.js`_

- [x] **T30b** Fix invisible cities on landmark/cactus tiles
  - Render priority changed to: civilization > landmark > cactus, with landmark/cactus as overlay when civ exists
  - _File: `js/renderer.js`_

- [x] **T30c** Increase unit spawn rate — raised UNIT_SPAWN_CHANCE from 1% to 5%
  - With 1-2 civ cells, units now spawn every ~10-20 seconds instead of 50-100
  - _File: `js/simulation.js` (UNIT_SPAWN_CHANCE constant)_

- [x] **T30d** Units rest 1 tick on spawn cell before moving — visible on origin cell
  - Added `restTicks: 1` to spawned units, `moveUnits()` skips movement while `restTicks > 0`
  - _File: `js/simulation.js` (spawnUnit + moveUnits)_

## Phase 7: Integration & Tests

- [ ] **T31** Add tests for civilization creation (monolith + manual)
  - _File: `tests/test_simulation.js`_
  - _Depends on: T6_

- [ ] **T32** Add tests for tech advancement over multiple ticks
  - Verify progression Stone → Bronze → ... → Nanotech, terminal at stage 6
  - _File: `tests/test_simulation.js`_
  - _Depends on: T7_

- [ ] **T33** Add tests for civ persistence through biome changes
  - Change biome under civ, verify civ data preserved
  - _File: `tests/test_simulation.js`_
  - _Depends on: T9_

- [ ] **T34** Add tests for unit spawning, movement, terrain restrictions, and settling
  - _File: `tests/test_simulation.js`_
  - _Depends on: T20, T21, T22_

- [ ] **T35** Add tests for unit cap enforcement and planet reset clearing units
  - _File: `tests/test_simulation.js`_
  - _Depends on: T23, T24_

- [ ] **T36** Add renderer integration tests for civ display and unit overlay
  - _File: `tests/test_renderer.js`_
  - _Depends on: T15, T25_

- [ ] **T37** Run full test suite, fix any failures
  - _Files: `tests/test_simulation.js`, `tests/test_renderer.js`_

- [ ] **T38** Verify quickstart scenarios from `quickstart.md`
  - Launch game, create civ, watch it advance, watch units spread
  - _Depends on: T37_
