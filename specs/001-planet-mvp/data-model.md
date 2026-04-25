# Data Model: Planet MVP

**Date**: 2026-04-24
**Branch**: `001-planet-mvp`

## Entities

### Grid

The planet's terrain represented as a 2D array of cells.

```javascript
{
  width: 30,
  height: 30,
  cells: Cell[][]  // cells[row][col]
}
```

### Cell

A single tile on the grid.

| Field | Type | Description |
|-------|------|-------------|
| `biome` | `BiomeType` | Current terrain type |
| `creatures` | `Creature[]` | Creatures currently on this cell (0-N) |

```javascript
{
  biome: 'grassland',
  creatures: []
}
```

### BiomeType

Enum of terrain types.

| Value | Emoji | Color | Compatible Creatures |
|-------|-------|-------|---------------------|
| `water` | 🌊 | `#4A90D9` | 🐟 (fish) |
| `grassland` | 🌿 | `#7CB342` | 🐄 (cow) |
| `desert` | 🏜️ | `#E8B84D` | 🐪 (camel) |
| `mountain` | 🏔️ | `#8D6E63` | 🐐 (goat) |

### Creature

A living entity that moves on the grid.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (e.g., `"c_001"`) |
| `emoji` | `string` | Visual representation (e.g., `"🐄"`) |
| `homeBiome` | `BiomeType` | Biome this creature belongs to |
| `row` | `number` | Current row position (0-29) |
| `col` | `number` | Current column position (0-29) |

```javascript
{
  id: 'c_001',
  emoji: '🐄',
  homeBiome: 'grassland',
  row: 15,
  col: 22
}
```

### SimulationState

The single source of truth for the game.

| Field | Type | Description |
|-------|------|-------------|
| `grid` | `Grid` | The terrain grid |
| `tick` | `number` | Current tick count (starts at 0) |
| `selectedBiome` | `BiomeType \| null` | Currently selected biome in toolbar |
| `isRunning` | `boolean` | Whether simulation tick loop is active |

```javascript
{
  grid: { width: 30, height: 30, cells: [][] },
  tick: 0,
  selectedBiome: null,
  isRunning: true
}
```

## Relationships

```
SimulationState
  └── Grid
        └── Cell[][]
              ├── biome (BiomeType)
              └── creatures[] (references Creature by position, not by ID)
```

**Note**: Creatures are stored inline within each Cell's `creatures` array (not in a separate global registry). This simplifies lookup — to find creatures on a cell, read `cells[r][c].creatures`. When a creature moves, it's removed from source cell and added to destination cell.

## Validation Rules

- Grid dimensions MUST be between 10×10 and 50×50 (default 30×30)
- Creature count per cell MUST NOT exceed 5 (visual clarity limit)
- Total creature count MUST NOT exceed 200 (performance guardrail)
- Creatures MUST only exist on cells matching their `homeBiome`
- `selectedBiome` MUST be one of the 4 defined biome types or `null`

## State Transitions

### Per Tick (automatic)
1. For each creature on grid: attempt move to random adjacent compatible cell
2. For each biome with fewer creatures than target: spawn new creature on random compatible cell
3. For each creature on incompatible cell (biome was changed): remove creature
4. Increment `tick` counter

### On Player Action (biome placement)
1. Set `selectedBiome` from toolbar click
2. Change `cells[row][col].biome` on grid click
3. Remove creatures on changed cell that are incompatible with new biome
4. Spawn creatures for new biome if below target count

### On New Planet
1. Reset entire `SimulationState`
2. Generate new grid with seeded PRNG
3. Run cellular automata smoothing passes
4. Spawn initial creatures per biome
5. Start tick loop
