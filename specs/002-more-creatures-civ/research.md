# Research: More Creatures & Civilization Mode

## Decision: Expanded creature roster uses same CREATURE_TYPES table

**Rationale**: The existing `CREATURE_TYPES` object already supports many-to-many biome compatibility. Adding 18 new entries is a data-only change — no structural refactor needed. The `getCreaturesForBiome()` helper (already added) provides O(n) lookup per spawn.

**Alternatives considered**:
- Separate biome→creature mapping table: Redundant with existing `compatibleBiomes` arrays
- Lazy-loaded creature packs: Overkill for 25 creatures in a single-page app

## Decision: Civilization stored inline as `{ stage: number }` on cell object

**Rationale**: The cell already has a `civilization` field (currently always `null`). Extending to `{ stage: 0 }` is minimal and keeps all per-cell data co-located. No separate civ registry needed since civs are 1:1 with cells.

**Alternatives considered**:
- Separate civilization array indexed by position: Adds indirection, no benefit for single-civ-per-cell model
- Civilization as creature subtype: Would conflate two different entity types (creatures move, civs don't)

## Decision: Tech advancement uses configurable `advanceCivilization()` hook pattern

**Rationale**: FR-009 requires architecture for future hooks (biome bonuses, trade routes). A central `advanceCivilization(civ, cell)` function with a simple base implementation (fixed probability per tick) can be extended with conditional bonuses without changing the tick loop.

**Alternatives considered**:
- Hard-coded probability in tick(): No extension point for future features
- Strategy pattern with named strategies: Over-engineered for what is currently a single advancement rule

## Decision: Tech advance probability ~2% per tick (50 ticks average per stage)

**Rationale**: SC-003 requires stone→bronze within 60 ticks. At 2%, expected advancement is 50 ticks, giving ~98% probability of advancing within 60 ticks. Full progression (7 stages) takes ~350 ticks (~6 minutes at 1 tick/second), providing meaningful long-term observation.

**Alternatives considered**:
- 1% per tick: Too slow — many civs won't advance in a reasonable session
- 5% per tick: Too fast — full progression in ~70 seconds, no long-term engagement

## Decision: Monolith requires creatures present; manual placement does not

**Rationale**: Monolith represents "awakening" existing life (narrative coherence). Manual placement is deliberate world-building (player authority). Both paths create the same `{ stage: 0 }` civilization.

**Alternatives considered**:
- Monolith works anywhere: Removes the "spark of sentience" narrative
- Manual placement requires creatures: Redundant with monolith, no differentiation

## Decision: smoothGrid() preserves civilization data during smoothing

**Rationale**: FR-012 requires civs persist through biome changes. The existing `smoothGrid()` already creates fresh cells — updating it to copy `civilization` from the source cell is a one-line change.

**Alternatives considered**:
- Skip smoothing for civ cells: Would create visual artifacts around civilization tiles
- Reset civs on smoothing: Breaks FR-012, loses player progress
