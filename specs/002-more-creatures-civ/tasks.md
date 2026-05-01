# Tasks: More Creatures & Civilization Mode

**Branch**: `002-more-creatures-civ` | **Date**: 2026-04-30

## Phase 1: Expanded Creature Roster (finishing)

- [ ] **T1** Update renderer to recognize new creature emojis in inspect tooltip
  - Verify all 25 creature types display correctly when inspected
  - _Depends on: none (creatures already added to simulation.js)_

## Phase 2: Civilization Core

- [ ] **T2** Add `TECH_STAGES` array with 7 stages (Stone → Nanotech), each with name + emoji
  - Define in `simulation.js` alongside `CREATURE_TYPES`
  - _Depends on: none_

- [ ] **T3** Extend cell data model — `civilization` field from `null` to `{ stage: number }`
  - Update `createCell()` to initialize `civilization: null`
  - _Depends on: T2_

- [ ] **T4** Implement `createCivilization(row, col)` function
  - Requires a creature present on the cell
  - Sets `cell.civilization = { stage: 0 }`
  - _Depends on: T3_

- [ ] **T5** Implement `advanceCivilization(civ, cell)` with ~2% chance per tick
  - Clamps at max stage (index 6)
  - Called from existing tick loop
  - _Depends on: T2, T4_

- [ ] **T6** Update `smoothGrid()` to preserve civilization data during biome smoothing
  - Civilizations persist even if biome changes underneath
  - _Depends on: T3_

- [ ] **T7** Update `generatePlanet()` to reset all civilizations on new planet generation
  - _Depends on: T3_
