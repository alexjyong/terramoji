# Research: Planet MVP

**Date**: 2026-04-24
**Branch**: `001-planet-mvp`

## Decisions

### 1. Terrain Generation Algorithm

**Decision**: Use a simple cellular automata approach with initial random seed, then 2-3 smoothing passes to create clustered biomes (not pure noise, not pure random).

**Rationale**: Pure random placement creates a checkerboard that looks unnatural. Full Perlin/Simplex noise adds ~200 lines of code for a PoC. Cellular automata with smoothing is ~30 lines, produces visually coherent clusters, and is deterministic given a seed.

**Alternatives considered**:
- Perlin noise: Too much code for PoC, overkill for 4 biome types
- Pure random: Visually unappealing, no clustering
- Voronoi cells: Good clustering but requires more math setup

### 2. Tick Loop: `setInterval` vs `requestAnimationFrame`

**Decision**: Use `setInterval` at 1000ms for simulation ticks, `requestAnimationFrame` only for visual rendering.

**Rationale**: Simulation logic (creature movement, spawning) is logically separate from rendering. `setInterval` provides a predictable, fixed cadence for simulation state. `requestAnimationFrame` ensures smooth 60fps rendering when state changes. This separation keeps simulation deterministic and rendering smooth.

**Alternatives considered**:
- Single `requestAnimationFrame` loop: Couples simulation speed to display refresh rate
- `setTimeout` chain: Unnecessary complexity for fixed cadence

### 3. Grid Rendering: CSS Grid with individual cells

**Decision**: CSS Grid with 900 individual `<div>` cells, each styled with `display: grid` and biome-specific background colors + emoji content.

**Rationale**: Constitution mandates DOM-based rendering. CSS Grid provides exact cell alignment. Individual cells allow click handlers per tile. 900 divs is well within browser performance limits (modern browsers handle 10k+ DOM nodes comfortably).

**Alternatives considered**:
- Canvas: Violates constitution (DOM-based rendering required)
- Table: Semantically incorrect, less flexible styling
- Flexbox: Doesn't provide true grid alignment for 2D layout

### 4. Creature Rendering: Overlay emoji within cell divs

**Decision**: Each cell div contains terrain emoji as background + creature emoji(s) as inline text/children. Multiple creatures per cell shown as a group.

**Rationale**: Simplest DOM approach. No absolute positioning needed. Creatures naturally move with the cell layout. CSS can handle stacking/spacing.

**Alternatives considered**:
- Separate creature layer with absolute positioning: Adds coordinate mapping complexity
- SVG overlay: Unnecessary for emoji characters

### 5. State Management: Single plain object

**Decision**: Plain JavaScript object with `grid` (2D array), `tick`, `selectedBiome`, `creatures` array. Mutated in-place per tick, rendered after mutation.

**Rationale**: No framework means no Redux/MobX. Plain object is minimal, debuggable (`console.log(state)`), and sufficient for 900 cells + 50 creatures. Immutable updates add allocation overhead unnecessary for PoC.

**Alternatives considered**:
- Immutable state: Adds spread/clone overhead, no framework to enforce it
- Class-based state: Unnecessary abstraction for PoC

### 6. Seeded Random Number Generator

**Decision**: Implement a simple mulberry32 PRNG (3 lines) for deterministic terrain generation.

**Rationale**: `Math.random()` is not seedable. mulberry32 is a well-known, minimal PRNG that produces good-enough randomness for terrain. Same seed → same planet, enabling reproducibility.

**Alternatives considered**:
- `Math.random()`: Not seedable, breaks determinism requirement
- Full Mersenne Twister: ~100 lines, overkill for PoC

### 7. Testing Approach

**Decision**: Node.js native `assert` module + direct file execution for tests. No test runner framework.

**Rationale**: Constitution mandates simplicity. Native `assert` requires zero dependencies. Tests run via `node tests/test_simulation.js`. For a PoC with ~300 lines of simulation logic, a test framework adds ceremony without value.

**Alternatives considered**:
- Jest/Vitest: Requires build config, node_modules, overkill for PoC
- Browser-based tests: Adds HTML test harness, unnecessary complexity

### 8. Creature-Biome Compatibility: Many-to-Many Mapping

**Decision**: Creatures can inhabit multiple biome types via a `compatibleBiomes` array (replaces single `homeBiome`). E.g., deer (🦌) can live on both `forest` and `grassland`.

**Rationale**: Ecological realism — creatures in nature migrate between adjacent habitat types. A 1:1 mapping forces unrealistic hard boundaries where a cow on grassland adjacent to forest would be removed if the grassland tile changed, even though cows could reasonably survive in forest edges. Many-to-many reduces unnecessary creature deaths during biome editing and creates more resilient simulation dynamics.

**Alternatives considered**:
- Strict 1:1 homeBiome: Simpler but creates brittle creature populations that die from single-tile edits
- All creatures on all biomes: Removes biome identity, defeats purpose of terrain types

### 9. Simulation Pause/Resume Toggle

**Decision**: Add a pause/resume toggle button to toolbar. When paused, tick loop is skipped but rendering continues (player can still inspect/edit terrain).

**Rationale**: Player control over simulation pace enables deliberate observation and editing without creatures moving during terrain manipulation. Future expansion path includes speed control (slow/normal/fast) without changing the pause/resume API.

**Alternatives considered**:
- No controls (simulation always runs): Removes player agency, makes deliberate editing frustrating
- Speed control only (no pause): More complex UI, pause is higher-value for MVP

## Summary

All technical unknowns from the plan are resolved. The constitution's constraints (vanilla JS, DOM rendering, emoji-only, no external deps) significantly narrowed the decision space. No NEEDS CLARIFICATION items remain.
