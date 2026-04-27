<!--
Sync Impact Report:
- Version change: 1.1.0 → 1.2.0 (minor: landmark entities added, biome count expanded to 7)
- Modified principles: II. Emoji-First Graphics (Entities) + CSS Terrain — landmark concept added
- Added sections: None
- Removed sections: None
- Templates requiring updates: N/A
- Follow-up TODOs: None
-->

# Terramoji Constitution

## Core Principles

### I. Simplicity First

The first pass is a basic proof of concept. Features are scoped to the minimum viable simulation: terrain generation, biome placement, creature movement, and player inspection. No networking, no save/load, no multiplayer, no complex AI. If it does not directly serve the core loop of "place terrain → watch life emerge → inspect results," it is deferred.

**Why**: A focused MVP prevents scope creep and delivers a playable prototype quickly. Complexity can be layered in subsequent iterations.

### II. Emoji-First Graphics (Entities) + CSS Terrain

Visual rendering is split into two tiers:

- **Entities** (creatures, cities, vehicles, discrete objects) are rendered using emoji characters. Emoji provide identity and readability for all interactive or movable game objects.
- **Landmarks** are permanent emoji displayed on specific biome tiles regardless of creature presence. Mountain tiles show 🏔️, forest tiles show 🌲, jungle tiles show 🌴. Landmarks are treated as entities — they are emoji, not terrain.
- **Base terrain/biome tiles** are rendered using CSS gradients, patterns, and textures. No external image assets, no sprite sheets, no canvas drawing for terrain. CSS provides color, subtle texture, and visual distinction between biomes (e.g., ocean waves, ice frost, desert sand).

No external assets of any kind — all visuals are emoji + CSS. This constraint keeps the project self-contained and eliminates asset pipeline complexity. Emoji match the playful aesthetic for entities; CSS provides richer, less repetitive terrain visuals.

**Why**: Repeated emoji on every terrain tile (e.g., 🌊 on every ocean cell) creates visual noise. CSS gradients and patterns provide depth and texture without external dependencies. Landmarks (mountain, forest, jungle) are the exception — their emoji identity is load-bearing for biome recognition.

### III. Simulation Integrity

The game world MUST maintain consistent simulation rules. Creatures follow predictable behaviors based on biome type and available resources. Terrain changes propagate effects to inhabitants. Time advances in discrete ticks, and all entities update synchronously per tick. The simulation must be deterministic given the same initial seed.

**Why**: A simulation game's credibility depends on consistent, observable cause-and-effect. Players must be able to form mental models of the world's rules.

### IV. Interactive by Default

Players MUST be able to place biomes via a toolbar and inspect any square on the game map. The interface is immediate — no menus deeper than one level, no confirmation dialogs for placement. Inspection reveals creature counts, biome health, and resource levels at a glance.

**Why**: The core loop is "interact → observe → iterate." Friction between intention and action breaks the simulation experience.

### V. Incremental Scope

Features are delivered in vertical slices: terrain generation ships with biome placement, which ships with creature spawning, which ships with inspection. Each slice must be independently playable and demonstrable. No feature is "complete" until it can be exercised through the UI.

**Why**: Vertical slices provide early validation, prevent hidden integration debt, and ensure each commit delivers observable value.

## Technical Constraints

**Platform**: Web-based, targeting modern browsers (Chrome, Firefox, Safari). No native desktop or mobile app for the first pass.

**Technology Stack**: HTML5, CSS3, and vanilla JavaScript (ES2022+). No framework dependency for the first pass — React, Vue, or similar may be introduced only if complexity justifies it.

**Rendering**: DOM-based rendering with CSS Grid for the map layout. Canvas is reserved for particle effects or overlay rendering if needed later.

**State Management**: A single simulation state object, updated per tick. No reactive framework — state changes are explicit, batched per tick, and applied to the DOM in a single render pass.

**Performance**: The simulation MUST maintain 60fps rendering on a 30×30 grid. Grid size is configurable but defaults to 30×30 for the MVP.

**No External Assets**: The game MUST run with zero external image, audio, or font dependencies. All visuals are emoji + CSS. All audio (if any) is deferred past MVP.

## Development Workflow

**Commit Discipline**: Each commit represents a single, verifiable change. Feature work is branched using sequential feature branch naming (e.g., `001-terrain-generation`).

**Code Review**: All changes MUST be reviewed before merge. Reviewers verify compliance with constitution principles — particularly Simplicity First and Emoji-First Graphics.

**Testing**: Unit tests cover simulation logic (tick advancement, creature behavior, biome effects). Integration tests verify the full render cycle: state change → DOM update. Tests are written before simulation logic changes.

**Documentation**: `README.md` is kept current with setup instructions, feature status, and known limitations. Each feature branch includes a brief description in the branch name and commit messages.

**Quickstart Validation**: After each feature merge, the game MUST be launchable via a single command and reachable within 10 seconds. If quickstart breaks, it is treated as a blocker.

## Governance

This constitution supersedes all other development practices for the Terramoji project. No feature, tool, or pattern is adopted that violates the core principles without an explicit amendment.

**Amendments**: Constitution changes require:
1. A proposed change describing the modification and rationale
2. Review against existing principles for conflicts
3. Version increment per semantic versioning rules below
4. Updated date and sync impact report

**Versioning Policy**:
- **MAJOR**: Principle removal, redefinition, or backward-incompatible governance change
- **MINOR**: New principle added, section expanded, or material guidance change
- **PATCH**: Wording clarification, typo fix, or non-semantic refinement

**Compliance**: Every PR and feature plan MUST reference applicable constitution principles. The plan template's Constitution Check gate enforces this.

**Version**: 1.2.0 | **Ratified**: 2026-04-24 | **Last Amended**: 2026-04-26
