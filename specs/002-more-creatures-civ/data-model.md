# Data Model: More Creatures & Civilization Mode

## Cell (updated)

Each cell in the 30×30 grid. Existing structure extended with civilization.

| Field | Type | Description |
|-------|------|-------------|
| `biome` | `string` | One of: water, grassland, desert, mountain, forest, jungle, ice |
| `creatures` | `Creature[]` | Array of creatures on this cell (max 5) |
| `civilization` | `Civilization \| null` | Civilization on this cell, or null |
| `cactus` | `boolean \| undefined` | Desert-only flag for 🌵 rendering |

### Validation
- `biome` must be a key in `BIOMES`
- `creatures.length ≤ 5`
- Total creatures across all cells ≤ 200
- `civilization.stage` must be 0–6 if present

## Creature (updated)

Expanded from 7 to ~25 types. Structure unchanged.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (`c_N`) |
| `emoji` | `string` | Visual representation |
| `compatibleBiomes` | `string[]` | Biomes this creature can inhabit (1-3 biomes) |
| `row` | `number` | Current row position |
| `col` | `number` | Current column position |

### New Creature Types
| Name | Emoji | Compatible Biomes |
|------|-------|-------------------|
| octopus | 🐙 | water |
| shark | 🦈 | water |
| turtle | 🐢 | water, desert |
| dolphin | 🐬 | water |
| horse | 🐴 | grassland |
| sheep | 🐑 | grassland |
| lion | 🦁 | grassland |
| elephant | 🐘 | grassland, forest |
| scorpion | 🦂 | desert |
| lizard | 🦎 | desert |
| eagle | 🦅 | mountain, grassland |
| fox | 🦊 | forest |
| squirrel | 🐿️ | forest |
| boar | 🐗 | forest |
| bear | 🐻 | forest, mountain |
| monkey | 🐒 | jungle |
| butterfly | 🦋 | jungle, forest, grassland |
| snake | 🐍 | jungle, desert |
| polarbear | 🐻‍❄️ | ice |
| seal | 🦭 | ice, water |

## Civilization (new)

Attached to a cell. Represents a sentient settlement advancing through tech stages.

| Field | Type | Description |
|-------|------|-------------|
| `stage` | `number` | Current tech level: 0=Stone, 1=Bronze, 2=Iron, 3=Industrial, 4=Atomic, 5=Information, 6=Nanotech |

### State Transitions

```
Stage 0 (🪨 Stone) --tick+chance--> Stage 1 (🔶 Bronze) --tick+chance--> Stage 2 (⚙️ Iron)
     --> Stage 3 (🏭 Industrial) --> Stage 4 (☢️ Atomic) --> Stage 5 (💻 Information) --> Stage 6 (🔮 Nanotech) [terminal]
```

- Advancement probability: ~2% per tick (configurable via `TECH_ADVANCE_CHANCE`)
- Stage 6 is terminal — no further advancement
- No regression (stages only increase)
- Each cell's civilization advances independently

### Creation Methods
1. **Monolith**: Player clicks tile with creatures → `{ stage: 0 }` created
2. **Manual placement**: Player clicks any tile → `{ stage: 0 }` created
3. Cannot create if `civilization` is already non-null

## Tech Stages (new)

Ordered enum of 7 stages. Same for all biomes.

| Stage | Name | Emoji |
|-------|------|-------|
| 0 | Stone | 🪨 |
| 1 | Bronze | 🔶 |
| 2 | Iron | ⚙️ |
| 3 | Industrial | 🏭 |
| 4 | Atomic | ☢️ |
| 5 | Information | 💻 |
| 6 | Nanotech | 🔮 |

## State Object (updated)

The global `state` object gains two new fields:

| Field | Type | Description |
|-------|------|-------------|
| `selectedTool` | `string \| null` | Replaces `selectedBiome`; values: biome name, `"monolith"`, `"civ"`, or `null` |

### Backward Compatibility
- `state.selectedBiome` is replaced by deriving from `state.selectedTool` (if tool is a biome name, that's the selected biome; otherwise null)
- Alternatively, keep `selectedBiome` and add `monolithMode` + `civMode` boolean flags
