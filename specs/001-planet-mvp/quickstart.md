# Quickstart: Terramoji

## Prerequisites

- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- No build tools, no package manager, no server required

## Run the Game

Open `index.html` in your browser:

```bash
# Option 1: Double-click the file
open index.html

# Option 2: Use a simple HTTP server (recommended for consistency)
python3 -m http.server 8000
# Then visit http://localhost:8000
```

The game loads immediately — no build step.

## Play the Game

1. **Generate a planet**: Click the "🌍 New Planet" button
2. **Place biomes**: Click a biome emoji in the toolbar, then click any grid tile
3. **Watch life**: Creatures spawn and move automatically

## Run Tests

```bash
# Simulation logic tests
node tests/test_simulation.js

# Renderer tests
node tests/test_renderer.js
```

## Project Structure

```
index.html          # Entry point
css/game.css        # All styling
js/
  simulation.js     # Game logic (terrain, creatures, ticks)
  renderer.js       # DOM rendering
  input.js          # Click handlers
tests/
  test_simulation.js
  test_renderer.js
```

## Development

Edit files directly — no build watcher needed. Refresh the browser to see changes.
