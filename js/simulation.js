// TerraMoji — Simulation Logic

// --- BIOMES Configuration ---
const BIOMES = {
  water:     { emoji: '🌊', color: '#4A90D9', creature: '🐟', creatureName: 'fish', landmark: null },
  grassland: { emoji: '🌿', color: '#7CB342', creature: '🐄', creatureName: 'cow', landmark: null },
  desert:    { emoji: '🏜️', color: '#E8B84D', creature: '🐪', creatureName: 'camel', landmark: null },
  mountain:  { emoji: '🏔️', color: '#8D6E63', creature: '🐐', creatureName: 'goat', landmark: '🏔️' },
  forest:    { emoji: '🌲', color: '#2E7D32', creature: '🦌', creatureName: 'deer', landmark: '🌲' },
  jungle:    { emoji: '🌴', color: '#1B5E20', creature: '🦜', creatureName: 'parrot', landmark: '🌴' },
  ice:       { emoji: '❄️', color: '#E0F7FA', creature: '🐧', creatureName: 'penguin', landmark: null },
};

const BIOME_KEYS = Object.keys(BIOMES);

// Pole rows (top and bottom) — ice biome is forced here
const POLE_ROWS = { top: 3, bottom: 3 }; // Number of rows at each pole

// --- SimulationState ---
const state = {
  grid: { width: 30, height: 30, cells: [] },
  tick: 0,
  selectedBiome: null,
  inspectMode: false,
  isRunning: false,
  isPaused: false,
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
  state.isPaused = false;
  state.grid.cells = [];

  // Step 1: Fill grid with random biomes
  for (let r = 0; r < height; r++) {
    state.grid.cells[r] = [];
    for (let c = 0; c < width; c++) {
      // Force ice at poles
      if (r < POLE_ROWS.top || r >= height - POLE_ROWS.bottom) {
        state.grid.cells[r][c] = { biome: 'ice', creatures: [], civilization: null };
      } else {
        const nonPoleBiomes = BIOME_KEYS.filter(b => b !== 'ice');
        const biome = nonPoleBiomes[Math.floor(rng() * nonPoleBiomes.length)];
        state.grid.cells[r][c] = { biome, creatures: [], civilization: null };
      }
    }
  }

  // Step 2: Enforce ice at poles BEFORE smoothing (locks pole boundaries)
  enforcePoles();

  // Step 3: Cellular automata smoothing — 3 passes
  for (let pass = 0; pass < 3; pass++) {
    smoothGrid();
  }

  // Step 3.5: Re-enforce ice at poles after smoothing (per spec task T011)
  enforcePoles();

  // Step 3.5: Place cacti on ~20% of desert tiles (after smoothing)
  const cells = state.grid.cells;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].biome === 'desert' && rng() < 0.2) {
        cells[r][c].cactus = true;
      }
    }
  }
}

function enforcePoles() {
  const { cells, width, height } = state.grid;
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < POLE_ROWS.top; r++) {
      cells[r][c].biome = 'ice';
    }
    for (let r = height - POLE_ROWS.bottom; r < height; r++) {
      cells[r][c].biome = 'ice';
    }
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
      next[r][c] = { biome: dominant, creatures: [], civilization: null };
    }
  }

  state.grid.cells = next;
}

// --- Creature Configuration (many-to-many biome compatibility) ---
const CREATURE_TYPES = {
  fish:    { emoji: '🐟', compatibleBiomes: ['water'] },
  cow:     { emoji: '🐄', compatibleBiomes: ['grassland', 'forest'] },
  camel:   { emoji: '🐪', compatibleBiomes: ['desert'] },
  goat:    { emoji: '🐐', compatibleBiomes: ['mountain', 'grassland'] },
  deer:    { emoji: '🦌', compatibleBiomes: ['forest', 'grassland'] },
  parrot:  { emoji: '🦜', compatibleBiomes: ['jungle', 'forest'] },
  penguin: { emoji: '🐧', compatibleBiomes: ['ice'] },
};

let creatureIdCounter = 0;

function createCreature(name, row, col) {
  const ct = CREATURE_TYPES[name];
  if (!ct) throw new Error(`Unknown creature type: ${name}`);
  creatureIdCounter++;
  return { id: `c_${creatureIdCounter}`, emoji: ct.emoji, compatibleBiomes: [...ct.compatibleBiomes], row, col };
}

function totalCreatures(cells, width, height) {
  let count = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      count += (cells[r][c].creatures || []).length;
    }
  }
  return count;
}

// --- T024: spawnCreatures ---
function spawnCreatures() {
  const { cells, width, height } = state.grid;
  const MAX_PER_CELL = 5;
  const MAX_TOTAL = 200;
  let total = totalCreatures(cells, width, height);

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = cells[r][c];
      if ((cell.creatures || []).length >= MAX_PER_CELL) continue;
      if (total >= MAX_TOTAL) return;

      // Find a creature type compatible with this biome
      for (const [name, ct] of Object.entries(CREATURE_TYPES)) {
        if (ct.compatibleBiomes.includes(cell.biome)) {
          cell.creatures.push(createCreature(name, r, c));
          total++;
          break; // one spawn per cell per pass
        }
      }
    }
  }
}

// --- Tick Loop (T026/T027) ---
// TODO: Implement tick() function that:
//   1. Returns early if state.isPaused is true (per data-model.md: "skipped when isPaused is true")
//   2. Calls moveCreatures(), spawnCreatures(), removes incompatible creatures
//   3. Increments state.tick
// TODO: Implement startSimulation() with setInterval(tick, 1000)

// --- Manual Biome Editing (T019a) ---

function changeCellBiome(row, col, newBiome) {
  const cell = state.grid.cells[row][col];
  if (!cell) return;

  cell.biome = newBiome;

  // Clear incompatible creatures when biome changes
  if (cell.creatures && cell.creatures.length > 0) {
    cell.creatures = [];
  }

  // Clear cactus flag when leaving desert
  if (newBiome !== 'desert') {
    cell.cactus = false;
  }
}
