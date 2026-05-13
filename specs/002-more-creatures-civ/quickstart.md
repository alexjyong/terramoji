# Quickstart: More Creatures & Civilization Mode

## Setup

No new dependencies. The feature uses only HTML/CSS/vanilla JS (existing stack).

```bash
git checkout 002-more-creatures-civ
npx serve .          # or open index.html directly in browser
```

## Verify Feature

### 1. More Creatures
1. Open `index.html` in browser
2. Click **🌍 New Planet**
3. Observe the grid — each biome should display multiple different creature emojis (not just one type per biome)
4. Toggle **🔍 Inspect** → click various tiles → verify creature names include new types (octopus, eagle, bear, etc.)

### 2. Monolith Tool
1. Wait for creatures to spawn on the grid
2. Click **🗿 Monolith** in the toolbar
3. Click a tile that has creatures
4. Verify 🪨 (stone) appears on that tile alongside the creatures
5. Click a tile with no creatures → verify nothing happens

### 3. Manual Civ Placement
1. Click **🏠 Civ** in the toolbar
2. Click any tile (creatures not required)
3. Verify 🪨 appears on that tile

### 4. Tech Progression
1. Place at least one civilization (via Monolith or manual)
2. Let the simulation run (paused? click ▶️ Resume)
3. After ~50 ticks (~50 seconds), inspect the civilization tile
4. Verify the emoji has advanced beyond 🪨 Stone (likely 🔶 Bronze or ⚙️ Iron)
5. Continue observing — civ should progress through: 🪨→🔶→⚙️→🏭→☢️→💻→🔮

### 5. Inspect Civilization
1. Toggle **🔍 Inspect** mode
2. Click a tile with a civilization
3. Verify the tooltip shows:
   - Biome panel (as before)
   - Creature panel (as before)
   - Civilization panel showing tech stage emoji + name (e.g., "🔶 Bronze")

## Run Tests

```bash
node tests/test_simulation.js    # simulation logic
node tests/test_renderer.js     # state → DOM integration
```
