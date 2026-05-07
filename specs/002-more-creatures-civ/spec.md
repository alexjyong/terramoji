# Feature Specification: More Creatures & Civilization Mode

**Feature Branch**: `002-more-creatures-civ`
**Created**: 2026-04-29
**Status**: Draft
**Input**: User description: "Add more creatures/animals across all biomes and introduce civilization mode with monolith tool, manual placement, and tech stage progression (stone → bronze → iron → industrial → atomic → information → nanotech)"

## Clarifications

### Session 2026-04-29

- Q: Creature population limits? → A: Same caps as MVP (5 per cell, 200 total), but distributed across ~25 creature types
- Q: Civilization coexistence with creatures? → A: Coexist — civs and creatures share tiles
- Q: Tech advancement mechanism? → A: Automatic over time (small chance per tick), architecture set up for future hooks
- Q: Civilization placement limits? → A: Unlimited
- Q: Biome-specific civ flavors? → A: Same emoji progression for all biomes

## User Scenarios & Testing

### User Story 1 - Richer Ecosystems with More Animals (Priority: P1)

On planet generation, the player sees a diverse range of animals across all biomes — not just one creature per biome, but multiple species including creatures that span habitats (eagle in mountain + grassland, bear in forest + mountain, etc.).

**Why this priority**: Without creature diversity, the world feels flat and the simulation lacks the richness needed to make civilization mode meaningful. This is the foundation for everything else.

**Independent Test**: Generate planet → inspect various biomes → verify multiple different creature emojis appear on each biome type.

**Acceptance Scenarios**:

1. **Given** a water biome exists, **When** the simulation runs, **Then** multiple water creatures (🐟🐙🦈🐢🐬) can spawn on water tiles
2. **Given** a grassland biome exists, **When** the simulation runs, **Then** multiple grassland creatures (🐄🐴🐑🦁🐘) can spawn on grassland tiles
3. **Given** a forest biome exists, **When** the simulation runs, **Then** multiple forest creatures (🦌🦊🐿️🐗🐻) can spawn on forest tiles
4. **Given** multi-biome creatures exist, **When** a creature moves to an adjacent compatible biome, **Then** it survives (eagle moves from mountain to grassland)
5. **Given** the grid is generated, **When** the player inspects any biome, **Then** at least 3 different creature types are visible across that biome's tiles

---

### User Story 2 - Spark Civilization with Monolith (Priority: P2)

The player selects the 🗿 Monolith tool from the toolbar and clicks on a tile that has creatures, causing those creatures to become sentient and begin building a civilization.

**Why this priority**: The monolith is the primary "magic moment" of the feature — it transforms the simulation from passive observation to active world-building. This is the core new interaction.

**Independent Test**: Generate planet → wait for creatures to spawn → select Monolith tool → click a tile with creatures → verify civilization emoji (🛖) appears on that tile.

**Acceptance Scenarios**:

1. **Given** a tile has creatures, **When** the player selects Monolith tool and clicks that tile, **Then** a stone-age civilization (🛖) appears on that tile
2. **Given** a tile has no creatures, **When** the player clicks it with Monolith tool, **Then** nothing happens (no civ created)
3. **Given** a civilization exists, **When** the simulation continues, **Then** the civilization coexists with creatures on the same tile
4. **Given** the Monolith tool is selected, **When** the player selects a different tool, **Then** Monolith mode is deselected

---

### User Story 3 - Manual Civilization Placement (Priority: P2)

The player can directly place a new civilization seed on any tile using a placement button in the toolbar, without needing creatures present.

**Why this priority**: Provides an alternative path to civilization for deliberate world-building, complementing the monolith's "discovery" approach.

**Independent Test**: Generate planet → select civ placement from toolbar → click any non-pole tile → verify 🛖 appears.

**Acceptance Scenarios**:

1. **Given** a planet is displayed, **When** the player selects civ placement and clicks a tile, **Then** a stone-age civilization (🛖) appears on that tile
2. **Given** civ placement is selected, **When** the player clicks multiple tiles, **Then** each clicked tile gets its own civilization
3. **Given** the toolbar is visible, **When** the player selects a different tool, **Then** civ placement is deselected

---

### User Story 4 - Tech Progression Over Time (Priority: P3)

As the simulation runs, civilizations automatically advance through tech stages — from stone age to nanotech — with the emoji updating to reflect current advancement.

**Why this priority**: Watching civilizations evolve is the long-term engagement loop. It gives players a reason to keep the simulation running and observe changes over time.

**Independent Test**: Place civilization → let simulation run for 30+ ticks → verify civilization emoji has advanced beyond stone age.

**Acceptance Scenarios**:

1. **Given** a stone-age civilization exists, **When** sufficient ticks pass, **Then** the civilization advances to bronze age (🛕)
2. **Given** a civilization is at any tech stage, **When** enough ticks pass, **Then** it continues advancing through: 🛖→🛕→🏰→🏭→☢️→💻→🔮
3. **Given** a civilization reaches nanotech (🔮), **When** more ticks pass, **Then** it stays at nanotech (max stage)
4. **Given** multiple civilizations exist, **When** the simulation runs, **Then** each advances independently at its own pace

---

### User Story 5 - Inspect Civilization Tech Level (Priority: P3)

When the player inspects a tile with a civilization, the tooltip shows the current tech stage name and emoji.

**Why this priority**: Inspection is how players understand the state of civilizations — without it, tech progression is invisible.

**Independent Test**: Place civilization → advance simulation → toggle Inspect mode → click civ tile → verify tooltip shows tech stage.

**Acceptance Scenarios**:

1. **Given** a tile has a civilization, **When** the player inspects it, **Then** the tooltip shows the civilization's current tech stage emoji and name
2. **Given** a civilization advances during simulation, **When** the player re-inspects the tile, **Then** the tooltip reflects the new tech stage

---

### User Story 6 - Mobile Units Spread Civilizations (Priority: P3)

As civilizations grow, they launch mobile units that wander the map and establish new settlements, visually expanding the civilization's reach.

**Why this priority**: Spreading gives civilizations agency and makes the map feel alive — players watch their settlements expand organically. SimEarth-style simplicity: units move randomly and settle on empty tiles.

**Independent Test**: Place civilization at Bronze stage → let simulation run → observe 🏇 units appearing and moving → verify new 🏘️ settlements appear on previously empty tiles.

**Acceptance Scenarios**:

1. **Given** a civilization exists at Bronze stage, **When** ticks pass, **Then** 🏇 units can spawn from that civilization
2. **Given** a mobile unit exists on the map, **When** a tick passes, **Then** the unit moves to an adjacent cell
3. **Given** a unit moves onto a cell with no civilization, **When** the move completes, **Then** a new civilization at the same tech stage is established and the unit disappears
4. **Given** a unit moves onto a cell that already has a civilization, **Then** the unit disappears (no replacement)
5. **Given** a civilization is at Stone age, **When** ticks pass, **Then** 🚶 units can spawn
6. **Given** a civilization is at Nanotech, **When** ticks pass, **Then** no units spawn (nanotech transcends physical transport)
7. **Given** a unit is on a water biome, **When** it's a land-only unit, **Then** it cannot move onto that cell (except ✈️ which crosses all terrain)

### User Story 7 - Inspect Mobile Units (Priority: P4)

When the player inspects a tile containing a mobile unit, the tooltip identifies the unit type and which civilization it belongs to.

**Independent Test**: Spawn civilization → wait for unit to appear → inspect tile with unit → verify tooltip shows unit info.

**Acceptance Scenarios**:

1. **Given** a mobile unit is on a tile, **When** the player inspects it, **Then** the tooltip shows the unit emoji and its civilization's tech stage

---

### Edge Cases

- What happens when the monolith is used on a tile that already has a civilization? (No effect, civ already exists)
- What happens when a biome under a civilization is changed by the player? (Civilization persists, biome change only affects creatures)
- What happens when all civilizations reach max tech? (They stay at nanotech, no regression)
- What happens during planet regeneration? (All civilizations and mobile units are reset along with creatures)
- What happens when a civilization cell is smoothed to a different biome? (Civilization data preserved through smoothing)
- What happens when a mobile unit reaches map edge? (Wraps to opposite side, toroidal world)
- What happens when a unit lands on a cell that already has a civilization? (Unit disappears, no effect)
- What happens when a unit's civilization reaches nanotech? (No more units spawned — nanotech doesn't need physical transport)

## Requirements

### Functional Requirements

- **FR-001**: System MUST expand creature roster from 7 to ~25 creature types across all 7 biomes
- **FR-002**: Creatures MUST support multi-biome compatibility (eagle: mountain+grassland, bear: forest+mountain, snake: jungle+desert, butterfly: jungle+forest+grassland, turtle: water+desert, seal: ice+water)
- **FR-003**: Creature spawning MUST randomly select from all compatible creature types for a given biome (not just one fixed type)
- **FR-004**: System MUST provide a 🗿 Monolith tool in the toolbar that creates a civilization on tiles with creatures
- **FR-005**: System MUST provide a manual civilization placement mode that creates civilizations on any tile
- **FR-006**: Civilizations MUST coexist with creatures on the same tile (not replace them)
- **FR-007**: Each civilization MUST track its current tech stage (0-6, representing stone through nanotech)
- **FR-008**: Civilizations MUST auto-advance to the next tech stage with a small probability each tick
- **FR-009**: Tech advancement architecture MUST support future hooks (biome bonuses, trade routes, etc.) via a configurable advance function
- **FR-010**: Civilization emoji MUST update to reflect current tech stage: 🛖 Stone → 🛕 Bronze → 🏰 Iron → 🏭 Industrial → ☢️ Atomic → 💻 Information → 🔮 Nanotech
- **FR-011**: Inspect tooltip MUST display civilization tech stage name and emoji when present
- **FR-012**: Civilizations MUST persist through biome changes (player editing terrain does not remove civs)
- **FR-013**: Planet regeneration MUST reset all civilizations to null
- **FR-014**: Unlimited civilizations may be placed (no hard cap on total civ count)
- **FR-015**: Each civilization at Stone–Digital stage MUST be able to spawn mobile units matching its tech era
- **FR-016**: Mobile units MUST move to an adjacent cell each tick using random walk
- **FR-017**: When a mobile unit lands on a cell with no civilization, it MUST establish a new civilization at its tech stage and then disappear
- **FR-018**: When a mobile unit lands on a cell with an existing civilization, it MUST disappear without effect
- **FR-019**: Land units (🚶🏇🐪🚂) CANNOT move onto water biomes; sea units (🛶⛵🚢) CANNOT move onto land biomes
- **FR-020**: Digital units (✈️) CAN move across any biome type (land and water)
- **FR-021**: Nanotech civilizations MUST NOT spawn mobile units
- **FR-022**: System MUST enforce a maximum active unit count (20 units) to prevent performance degradation
- **FR-023**: Mobile units MUST wrap around map edges (toroidal world topology)
- **FR-024**: Planet regeneration MUST clear all mobile units
- **FR-025**: Mobile units MUST render as emoji overlay on the cell they occupy
- **FR-026**: Inspect tooltip MUST display mobile unit info when present

### Key Entities

- **CreatureType**: Expanded set of ~25 creatures, each with emoji and compatible biome list (many-to-many)
- **Civilization**: Entity attached to a cell with `stage` (0-6) representing tech level; advances independently per tick
- **TechStage**: Ordered progression: Stone(0) → Bronze(1) → Iron(2) → Industrial(3) → Atomic(4) → Information(5) → Nanotech(6)
- **MobileUnit**: Lightweight entity with `emoji`, `stage`, `row`, `col`, and `type` (land/sea/air); spawns from civilizations, moves randomly, settles to create new civs
- **UnitType**: Mapping of tech stage → unit emoji. Stone: 🚶, Bronze: 🏇/🛶, Iron: 🐪/⛵, Industrial: 🚂/🚢, Digital: ✈️ (amphibious), Nanotech: none

## Success Criteria

### Measurable Outcomes

- **SC-001**: Each biome displays at least 3 different creature types after initial spawning
- **SC-002**: Player can create a civilization within 2 clicks (select tool + click tile)
- **SC-003**: A civilization advances from stone age to at least bronze age within 60 ticks
- **SC-004**: Creature movement remains smooth (no stuttering) with 25 creature types and active civilizations
- **SC-005**: Inspect tooltip correctly shows civilization tech stage for all 7 stages
- **SC-006**: Mobile units spawn from civilizations at Bronze–Digital stage and are visible on the grid
- **SC-007**: A Bronze civilization spawns at least one mobile unit within 50 ticks
- **SC-008**: Mobile unit establishes a new settlement within 30 ticks of spawning (assuming open map)

## Assumptions

- Same population caps apply (5 creatures per cell, 200 total) — distributed across the larger creature pool
- Civilizations do not consume resources or affect biome health (out of scope for this iteration)
- Mobile units use simple random walk — no pathfinding, no attraction/repulsion logic
- Units do not interact with creatures (they pass through or coexist)
- Unit spawning rate is ~1% per tick per civilization (configurable via `UNIT_SPAWN_CHANCE`)
- Land/sea distinction follows existing biome classification: water = water biome; land = everything else
- Tech advancement rate is uniform across all biomes (no biome-specific bonuses yet — architecture prepared for future)
- Emoji rendering for new creatures and mobile units is consistent across target browsers
- Nanotech civilizations don't spawn units (they're terminal and transcend physical transport)
- The monolith and manual placement tools are mutually exclusive with biome painting and inspect mode
