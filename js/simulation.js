// Emoji Earth — Simulation Logic

// --- BIOMES Configuration ---
const BIOMES = {
  water:     { emoji: '🌊', color: '#4A90D9', creature: '🐟', creatureName: 'fish' },
  grassland: { emoji: '🌿', color: '#7CB342', creature: '🐄', creatureName: 'cow' },
  desert:    { emoji: '🏜️', color: '#E8B84D', creature: '🐪', creatureName: 'camel' },
  mountain:  { emoji: '🏔️', color: '#8D6E63', creature: '🐐', creatureName: 'goat' },
};

const BIOME_KEYS = Object.keys(BIOMES);

// --- SimulationState ---
const state = {
  grid: { width: 30, height: 30, cells: [] },
  tick: 0,
  selectedBiome: null,
  isRunning: false,
};

// --- mulberry32 PRNG ---
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Terrain Generation ---
function generatePlanet() {
  const seed = Date.now() ^ (Math.random() * 0xFFFFFFFF);
  const rng = mulberry32(seed);
  const { width, height } = state.grid;

  // Reset state
  state.tick = 0;
  state.grid.cells = [];

  // Step 1: Fill grid with random biomes
  for (let r = 0; r < height; r++) {
    state.grid.cells[r] = [];
    for (let c = 0; c < width; c++) {
      const biome = BIOME_KEYS[Math.floor(rng() * BIOME_KEYS.length)];
      state.grid.cells[r][c] = { biome, creatures: [] };
    }
  }

  // Step 2: Cellular automata smoothing — 3 passes
  for (let pass = 0; pass < 3; pass++) {
    smoothGrid();
  }
}

function smoothGrid() {
  const { cells, width, height } = state.grid;
  const next = [];

  for (let r = 0; r < height; r++) {
    next[r] = [];
    for (let c = 0; c < width; c++) {
      const counts = {};
      // Count neighboring biomes (including self)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
            const b = cells[nr][nc].biome;
            counts[b] = (counts[b] || 0) + 1;
          }
        }
      }
      // Adopt most common neighbor biome
      let maxCount = 0;
      let dominant = cells[r][c].biome;
      for (const b of BIOME_KEYS) {
        if (counts[b] > maxCount) {
          maxCount = counts[b];
          dominant = b;
        }
      }
      next[r][c] = { biome: dominant, creatures: [] };
    }
  }

  state.grid.cells = next;
}
