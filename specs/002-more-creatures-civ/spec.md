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

**Independent Test**: Generate planet → wait for creatures to spawn → select Monolith tool → click a tile with creatures → verify civilization emoji (🪨) appears on that tile.

**Acceptance Scenarios**:

1. **Given** a tile has creatures, **When** the player selects Monolith tool and clicks that tile, **Then** a stone-age civilization (🪨) appears on that tile
2. **Given** a tile has no creatures, **When** the player clicks it with Monolith tool, **Then** nothing happens (no civ created)
3. **Given** a civilization exists, **When** the simulation continues, **Then** the civilization coexists with creatures on the same tile
4. **Given** the Monolith tool is selected, **When** the player selects a different tool, **Then** Monolith mode is deselected

---

### User Story 3 - Manual Civilization Placement (Priority: P2)

The player can directly place a new civilization seed on any tile using a placement button in the toolbar, without needing creatures present.

**Why this priority**: Provides an alternative path to civilization for deliberate world-building, complementing the monolith's "discovery" approach.

**Independent Test**: Generate planet → select civ placement from toolbar → click any non-pole tile → verify 🪨 appears.

**Acceptance Scenarios**:

1. **Given** a planet is displayed, **When** the player selects civ placement and clicks a tile, **Then** a stone-age civilization (🪨) appears on that tile
2. **Given** civ placement is selected, **When** the player clicks multiple tiles, **Then** each clicked tile gets its own civilization
3. **Given** the toolbar is visible, **When** the player selects a different tool, **Then** civ placement is deselected

---

### User Story 4 - Tech Progression Over Time (Priority: P3)

As the simulation runs, civilizations automatically advance through tech stages — from stone age to nanotech — with the emoji updating to reflect current advancement.

**Why this priority**: Watching civilizations evolve is the long-term engagement loop. It gives players a reason to keep the simulation running and observe changes over time.

**Independent Test**: Place civilization → let simulation run for 30+ ticks → verify civilization emoji has advanced beyond stone age.

**Acceptance Scenarios**:

1. **Given** a stone-age civilization exists, **When** sufficient ticks pass, **Then** the civilization advances to bronze age (🔶)
2. **Given** a civilization is at any tech stage, **When** enough ticks pass, **Then** it continues advancing through: 🪨→🔶→⚙️→🏭→☢️→💻→🔮
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

### Edge Cases

- What happens when the monolith is used on a tile that already has a civilization? (No effect, civ already exists)
- What happens when a biome under a civilization is changed by the player? (Civilization persists, biome change only affects creatures)
- What happens when all civilizations reach max tech? (They stay at nanotech, no regression)
- What happens during planet regeneration? (All civilizations are reset along with creatures)
- What happens when a civilization cell is smoothed to a different biome? (Civilization data preserved through smoothing)

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
- **FR-010**: Civilization emoji MUST update to reflect current tech stage: 🪨 Stone → 🔶 Bronze → ⚙️ Iron → 🏭 Industrial → ☢️ Atomic → 💻 Information → 🔮 Nanotech
- **FR-011**: Inspect tooltip MUST display civilization tech stage name and emoji when present
- **FR-012**: Civilizations MUST persist through biome changes (player editing terrain does not remove civs)
- **FR-013**: Planet regeneration MUST reset all civilizations to null
- **FR-014**: Unlimited civilizations may be placed (no hard cap on total civ count)

### Key Entities

- **CreatureType**: Expanded set of ~25 creatures, each with emoji and compatible biome list (many-to-many)
- **Civilization**: Entity attached to a cell with `stage` (0-6) representing tech level; advances independently per tick
- **TechStage**: Ordered progression: Stone(0) → Bronze(1) → Iron(2) → Industrial(3) → Atomic(4) → Information(5) → Nanotech(6)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Each biome displays at least 3 different creature types after initial spawning
- **SC-002**: Player can create a civilization within 2 clicks (select tool + click tile)
- **SC-003**: A civilization advances from stone age to at least bronze age within 60 ticks
- **SC-004**: Creature movement remains smooth (no stuttering) with 25 creature types and active civilizations
- **SC-005**: Inspect tooltip correctly shows civilization tech stage for all 7 stages

## Assumptions

- Same population caps apply (5 creatures per cell, 200 total) — distributed across the larger creature pool
- Civilizations do not consume resources or affect biome health (out of scope for this iteration)
- Civilizations do not spread to adjacent tiles or interact with other civilizations (no war, trade, etc.)
- Tech advancement rate is uniform across all biomes (no biome-specific bonuses yet — architecture prepared for future)
- Emoji rendering for new creatures (🐙🦈🐢🐬🐴🐑🦁🐘🦂🦎🦅🦊🐿️🐗🐻🐒🦋🐍🐻‍❄️🦭) is consistent across target browsers
- The monolith and manual placement tools are mutually exclusive with biome painting and inspect mode
