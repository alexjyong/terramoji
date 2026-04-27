# Feature Specification: Planet MVP

**Feature Branch**: `001-planet-mvp`
**Created**: 2026-04-24
**Last Updated**: 2026-04-25
**Status**: In Progress
**Input**: User description: "SimEarth-inspired emoji game MVP — generate planet grid, place biomes via toolbar, creatures appear and move"

**Amendment Log**:
- 2026-04-25: Added ice biome (constitution v1.1.0), switched base terrain to CSS gradients/textures (emoji reserved for entities only), added pole enforcement
- 2026-04-26: Added forest and jungle biomes; mountain tiles display 🏔️ landmark emoji; forest/jungle tiles display tree emoji (🌲/🌴) as permanent landmark; toolbar expanded to 7 biomes

## Clarifications

### Session 2026-04-27

- Q: Creature population limits? → A: Per-cell cap (5) + global cap (200 total)
- Q: Simulation behavior during terrain editing? → A: Live — simulation continues while player edits
- Q: Mountain biome creature compatibility? → A: Mountains have own creature (🐐); creatures can inhabit multiple biomes (many-to-many, not 1:1)
- Q: Simulation pause/resume controls? → A: Pause/Resume toggle button (expand to speed control later)
- Q: Planet seed reproducibility? → A: Internal only — seed is random and not user-exposed

## User Scenarios & Testing

### User Story 1 - Generate & Display a Planet (Priority: P1)

On page load or clicking "New Planet," the player sees a grid of CSS-styled terrain tiles representing a procedurally generated planet. Mountain tiles display 🏔️ landmark emoji, forest tiles display 🌲, and jungle tiles display 🌴.

**Why this priority**: Without a visible planet, there is nothing to interact with. This is the foundation of the entire experience.

**Independent Test**: Load the page → click "New Planet" → verify a grid of styled terrain tiles appears with landmark emoji on mountain/forest/jungle tiles.

**Acceptance Scenarios**:

1. **Given** the page loads, **When** the player clicks "New Planet", **Then** a grid of CSS-styled terrain tiles is displayed
2. **Given** a planet is displayed, **When** the player clicks "New Planet" again, **Then** a different random planet is generated
3. **Given** a planet is displayed, **When** the player inspects the grid, **Then** multiple biome types are visible (water, grassland, desert, mountain with 🏔️, forest with 🌲, jungle with 🌴, ice at poles)

---

### User Story 2 - Place Biomes via Toolbar (Priority: P2)

The player selects a biome from a toolbar and clicks on any grid square to change its terrain type.

**Why this priority**: Terrain manipulation is the primary player action. Without it, the game is a passive viewer, not an interactive simulation.

**Independent Test**: Load planet → select grassland from toolbar → click a water tile → verify tile changes to grassland emoji.

**Acceptance Scenarios**:

1. **Given** a planet is displayed, **When** the player selects a biome from the toolbar and clicks a grid square, **Then** that square's terrain changes to the selected biome
2. **Given** a biome is selected, **When** the player clicks multiple squares, **Then** each clicked square changes independently
3. **Given** the toolbar is visible, **When** the player selects a different biome, **Then** the previously selected biome is deselected

---

### User Story 3 - Creatures Appear & Move (Priority: P3)

After terrain is placed, matching creatures spawn on compatible biomes and move randomly within those biomes over time.

**Why this priority**: Creature movement is what transforms a terrain editor into a living simulation. It completes the core loop: place terrain → watch life emerge.

**Independent Test**: Place grassland biome → wait one tick → verify at least one herbivore emoji (🐄) appears and moves to an adjacent grassland tile.

**Acceptance Scenarios**:

1. **Given** a grassland biome exists, **When** the simulation runs, **Then** herbivore creatures (🐄) spawn on grassland tiles
2. **Given** creatures are present, **When** a simulation tick passes, **Then** creatures move to adjacent compatible biome tiles
3. **Given** a water biome exists, **When** the simulation runs, **Then** aquatic creatures (🐟) spawn on water tiles
4. **Given** a desert biome exists, **When** the simulation runs, **Then** desert creatures (🐪) spawn on desert tiles
5. **Given** ice biomes exist at poles, **When** the simulation runs, **Then** ice creatures (🐧) spawn on ice tiles
6. **Given** a forest biome exists, **When** the simulation runs, **Then** forest creatures (🦌) spawn on forest tiles
7. **Given** a jungle biome exists, **When** the simulation runs, **Then** jungle creatures (🦜) spawn on jungle tiles
8. **Given** a mountain biome exists, **When** the simulation runs, **Then** mountain creatures (🐐) spawn on mountain tiles

---

### Edge Cases

- What happens when all adjacent tiles are incompatible biomes? (Creature stays in place)
- What happens when the grid is full of one biome type? (Creatures still spawn and move within that biome)
- What happens if the player changes a biome that has creatures on it? (Creatures removed only if the new biome is not among their compatible biomes — creatures with multi-biome compatibility may survive)
- What happens when the player edits terrain while simulation is running? (Simulation continues live; biome changes take effect immediately, creatures on changed tiles are removed/spawned per new biome)

## Requirements

### Functional Requirements

- **FR-001**: System MUST generate a procedurally seeded grid of terrain tiles on demand
- **FR-002**: System MUST display terrain using CSS gradients and textures for base biomes (water, grassland, desert, mountain, forest, jungle, ice). Mountain tiles display 🏔️ landmark emoji, forest tiles display 🌲, jungle tiles display 🌴. Ice biome is enforced at top and bottom pole rows.
- **FR-003**: System MUST provide a toolbar with 7 biome types for player selection
- **FR-004**: System MUST allow the player to change any grid square's biome by clicking after toolbar selection
- **FR-005**: System MUST spawn creatures matching the biome type when terrain is placed or on initial generation
- **FR-006**: System MUST advance creature positions on a periodic tick (default: 1 second)
- **FR-007**: Creatures MUST only move to adjacent tiles of a compatible biome type (creatures can have multiple compatible biomes — many-to-many mapping)
- **FR-008**: System MUST remove creatures whose biome was changed to an incompatible type (all compatible biomes for that creature are absent)
- **FR-009**: System MUST display creatures as emoji characters overlaid on terrain tiles
- **FR-010**: System MUST enforce creature population limits: maximum 5 creatures per cell and 200 creatures total across the entire grid
- **FR-011**: Mountain biomes MUST support their own creature type (🐐 goat) in addition to landmark emoji (🏔️)
- **FR-012**: System MUST provide a Pause/Resume toggle button in the toolbar to control simulation tick execution (future expansion: speed control)

### Key Entities

- **Grid**: 30×30 array of cells; each cell has a biome type and optional creature list
- **Biome**: Terrain type with associated emoji, compatible creature types (many-to-many), and color
- **Creature**: Entity with emoji representation, set of compatible biome types (not limited to one), and current grid position
- **Simulation Tick**: Time step that advances creature movement and spawning logic

## Success Criteria

### Measurable Outcomes

- **SC-001**: Player can see a fully generated planet within 2 seconds of clicking "New Planet"
- **SC-002**: Player can change a tile's biome within 1 click after toolbar selection
- **SC-003**: Creatures become visible on biomes within 3 seconds of terrain generation
- **SC-004**: Creature movement is visible at a steady pace (1 move per second) without stuttering
- **SC-005**: The game runs smoothly at 60fps on a 30×30 grid with at least 50 creatures present

## Assumptions

- Players use a desktop or tablet browser with a mouse or touch input
- The default grid size is 30×30, sufficient for a proof of concept
- Emoji rendering is consistent across target browsers (Chrome, Firefox, Safari)
- No authentication, persistence, or multiplayer is needed for the first pass
- The simulation runs automatically after planet generation — no manual "start" button required
- Creatures spawn at a fixed rate per biome, not based on resource levels or population dynamics
