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
  monolithMode: false,
  civMode: false,
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
        state.grid.cells[r][c] = { biome: 'ice', creatures: [], civilization: null, unit: null };
      } else {
        const nonPoleBiomes = BIOME_KEYS.filter(b => b !== 'ice');
        const biome = nonPoleBiomes[Math.floor(rng() * nonPoleBiomes.length)];
        state.grid.cells[r][c] = { biome, creatures: [], civilization: null, unit: null };
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
  // Cellular automata smoothing: each cell adopts the most common biome
  // from its 3×3 neighborhood (including itself). Running multiple passes
  // creates clustered biomes rather than a salt-and-pepper grid.
  // Note: enforcePoles() must run before this (see ice-spread-bug memory).
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
      next[r][c] = {
        biome: dominant,
        creatures: [],
        civilization: cells[r][c].civilization, // preserve civ through smoothing
        unit: cells[r][c].unit,                 // preserve unit through smoothing
        cactus: cells[r][c].cactus,             // preserve cactus flag
      };
    }
  }

  state.grid.cells = next;
}

// --- Creature Configuration (many-to-many biome compatibility) ---
// Expanded roster: ~25 creatures across all biomes.
// Multi-biome creatures (eagle, bear, snake, etc.) naturally migrate between habitats.
const CREATURE_TYPES = {
  // Water
  fish:     { emoji: '🐟', compatibleBiomes: ['water'] },
  octopus:  { emoji: '🐙', compatibleBiomes: ['water'] },
  shark:    { emoji: '🦈', compatibleBiomes: ['water'] },
  turtle:   { emoji: '🐢', compatibleBiomes: ['water', 'desert'] },
  dolphin:  { emoji: '🐬', compatibleBiomes: ['water'] },

  // Grassland
  cow:      { emoji: '🐄', compatibleBiomes: ['grassland', 'forest'] },
  horse:    { emoji: '🐴', compatibleBiomes: ['grassland'] },
  sheep:    { emoji: '🐑', compatibleBiomes: ['grassland'] },
  lion:     { emoji: '🦁', compatibleBiomes: ['grassland'] },
  elephant: { emoji: '🐘', compatibleBiomes: ['grassland', 'forest'] },

  // Desert
  camel:    { emoji: '🐪', compatibleBiomes: ['desert'] },
  scorpion: { emoji: '🦂', compatibleBiomes: ['desert'] },
  lizard:   { emoji: '🦎', compatibleBiomes: ['desert'] },

  // Mountain (+ shared with grassland/forest)
  goat:     { emoji: '🐐', compatibleBiomes: ['mountain', 'grassland'] },
  eagle:    { emoji: '🦅', compatibleBiomes: ['mountain', 'grassland'] },

  // Forest (+ shared with grassland/jungle)
  deer:     { emoji: '🦌', compatibleBiomes: ['forest', 'grassland'] },
  fox:      { emoji: '🦊', compatibleBiomes: ['forest'] },
  squirrel: { emoji: '🐿️', compatibleBiomes: ['forest'] },
  boar:     { emoji: '🐗', compatibleBiomes: ['forest'] },
  bear:     { emoji: '🐻', compatibleBiomes: ['forest', 'mountain'] },

  // Jungle (+ shared with forest/desert)
  parrot:   { emoji: '🦜', compatibleBiomes: ['jungle', 'forest'] },
  monkey:   { emoji: '🐒', compatibleBiomes: ['jungle'] },
  butterfly:{ emoji: '🦋', compatibleBiomes: ['jungle', 'forest', 'grassland'] },
  snake:    { emoji: '🐍', compatibleBiomes: ['jungle', 'desert'] },

  // Ice
  penguin:  { emoji: '🐧', compatibleBiomes: ['ice'] },
  polarbear:{ emoji: '🐻‍❄️', compatibleBiomes: ['ice'] },
  seal:     { emoji: '🦭', compatibleBiomes: ['ice', 'water'] },
};

// Build a reverse index: biome → list of creature names that can live there
// (used by spawning to pick a random creature for a given biome)
function getCreaturesForBiome(biome) {
  return Object.keys(CREATURE_TYPES).filter(
    name => CREATURE_TYPES[name].compatibleBiomes.includes(biome)
  );
}

let creatureIdCounter = 0;

function createCreature(name, row, col) {
  const ct = CREATURE_TYPES[name];
  if (!ct) throw new Error(`Unknown creature type: ${name}`);
  creatureIdCounter++;
  return { id: `c_${creatureIdCounter}`, name, emoji: ct.emoji, compatibleBiomes: [...ct.compatibleBiomes], row, col };
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
  // Spawn creatures on eligible cells using round-robin interleaving across
  // biomes so that no single biome dominates the total creature count.
  // Caps: 5 per cell, 200 total, 35 per biome.
  const { cells, width, height } = state.grid;
  const MAX_PER_CELL = 5;
  const MAX_TOTAL = 200;
  const MAX_PER_BIOME = 35; // distribute creatures across biomes evenly
  let total = totalCreatures(cells, width, height);

  // Count per-biome to cap each biome's share
  const biomeCounts = {};
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const b = cells[r][c].biome;
      biomeCounts[b] = (biomeCounts[b] || 0) + (cells[r][c].creatures || []).length;
    }
  }

  // Collect all eligible cells, grouped by biome
  const biomeCells = {};
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = cells[r][c];
      if ((cell.creatures || []).length >= MAX_PER_CELL) continue;
      const b = cell.biome;
      if (!biomeCells[b]) biomeCells[b] = [];
      biomeCells[b].push({ r, c });
    }
  }

  // Interleave: pick one cell from each biome in round-robin order so that
  // creatures are distributed evenly across all biomes rather than filling
  // one biome completely before moving to the next.
  const ordered = [];
  const biomeList = Object.keys(biomeCells);
  let biomesLeft = biomeList.length;
  while (biomesLeft > 0) {
    for (let i = biomeList.length - 1; i >= 0; i--) {
      const b = biomeList[i];
      const bucket = biomeCells[b];
      if (bucket.length > 0) {
        // Pick random cell from this biome's bucket
        const idx = Math.floor(Math.random() * bucket.length);
        ordered.push({ ...bucket.splice(idx, 1)[0], biome: b });
      } else {
        biomeList.splice(i, 1);
        biomesLeft--;
      }
    }
  }

  // Spawn creatures in interleaved order
  for (const { r, c, biome } of ordered) {
    if (total >= MAX_TOTAL) break;
    if ((biomeCounts[biome] || 0) >= MAX_PER_BIOME) continue;

    const cell = cells[r][c];
    // Pick a random creature type that is compatible with this cell's biome
    const candidates = getCreaturesForBiome(cell.biome);
    if (candidates.length === 0) continue;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    cell.creatures.push(createCreature(chosen, r, c));
    total++;
    biomeCounts[biome] = (biomeCounts[biome] || 0) + 1;
  }
}

// --- T025: moveCreatures ---
function moveCreatures() {
  // Each creature attempts to move to a random adjacent cell (4-directional,
  // no diagonals). The move only succeeds if the destination biome is in the
  // creature's compatibleBiomes list. Creatures that can't move stay in place.
  // Implementation: collect all creatures, clear grids, then reassign.
  const { cells, width, height } = state.grid;

  // Collect all creatures with their current positions
  const allCreatures = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      allCreatures.push(...cells[r][c].creatures.map(cr => ({ cr, fromR: r, fromC: c })));
    }
  }

  // Clear creature arrays (will reassign below)
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      cells[r][c].creatures = [];
    }
  }

  // 4-directional adjacency (no diagonals)
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const { cr, fromR, fromC } of allCreatures) {
    // Pick random adjacent cell
    const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
    const nr = fromR + dr;
    const nc = fromC + dc;

    if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
      // Only move if destination biome is compatible
      if (cr.compatibleBiomes.includes(cells[nr][nc].biome)) {
        cr.row = nr;
        cr.col = nc;
        cells[nr][nc].creatures.push(cr);
      } else {
        // Stay in place
        cr.row = fromR;
        cr.col = fromC;
        cells[fromR][fromC].creatures.push(cr);
      }
    } else {
      // Out of bounds — stay
      cells[fromR][fromC].creatures.push(cr);
    }
  }
}

// --- T026: tick function ---
let tickInterval = null;

function tick() {
  // The simulation tick runs every 1000ms via setInterval.
  // Order matters: move creatures → spawn creatures → remove incompatible → advance civs → spawn/move units → re-render.
  if (state.isPaused) return;

  moveCreatures();
  spawnCreatures();
  removeIncompatibleCreatures();

  // Civilization advancement + unit lifecycle
  const { cells, width, height } = state.grid;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = cells[r][c];
      advanceCivilization(cell);

      // Spawn units from civilizations (stages 0-5)
      if (cell.civilization && cell.civilization.stage <= 5 && Math.random() < UNIT_SPAWN_CHANCE) {
        spawnUnit(r, c);
      }
    }
  }

  // Move all active units (settle happens inside moveUnits)
  moveUnits();

  state.tick++;

  renderGrid();
}

// --- T027: startSimulation ---
function startSimulation() {
  // Clear any existing interval to prevent multiple tick loops running
  // when the user generates a new planet without stopping the old one.
  if (tickInterval) {
    clearInterval(tickInterval);
  }
  state.isRunning = true;
  tickInterval = setInterval(tick, 1000);
}

// --- T023: removeIncompatibleCreatures ---
function removeIncompatibleCreatures() {
  const { cells, width, height } = state.grid;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = cells[r][c];
      cell.creatures = cell.creatures.filter(cr => cr.compatibleBiomes.includes(cell.biome));
    }
  }
}

// --- Tick Loop (T026/T027) ---

// --- Tech Stages (7 stages: Stone → Nanotech) ---
const TECH_STAGES = [
  { name: 'Stone',       emoji: '🛖' },   // 0
  { name: 'Bronze',      emoji: '🛕' },   // 1
  { name: 'Iron',        emoji: '🏰' },   // 2
  { name: 'Industrial',  emoji: '🏭' },   // 3
  { name: 'Atomic',      emoji: '☢️' },   // 4
  { name: 'Information', emoji: '💻' },   // 5
  { name: 'Nanotech',    emoji: '🔮' },   // 6 (terminal)
];

const TECH_ADVANCE_CHANCE = 0.02;  // ~2% per tick, ~50 ticks per stage

// --- Unit Types (spawned from civilizations, stages 0–5 only) ---
const UNIT_TYPES = {
  // stage → { land: { emoji, movementType }, sea: { emoji, movementType } | null }
  0: { land: { emoji: '🚶', movementType: 'land' } },                          // Stone
  1: { land: { emoji: '🏇', movementType: 'land' }, sea: { emoji: '🛶', movementType: 'sea' } },  // Bronze
  2: { land: { emoji: '🐪', movementType: 'land' }, sea: { emoji: '⛵', movementType: 'sea' } },  // Iron
  3: { land: { emoji: '🚂', movementType: 'land' }, sea: { emoji: '🚢', movementType: 'sea' } },  // Industrial
  4: { land: { emoji: '✈️', movementType: 'air' }, sea: { emoji: '✈️', movementType: 'air' } },   // Atomic
  5: { land: { emoji: '✈️', movementType: 'air' }, sea: { emoji: '✈️', movementType: 'air' } },   // Information
};

const UNIT_SPAWN_CHANCE = 0.01;  // ~1% per tick per civilization
const MAX_UNITS = 20;            // global cap on active mobile units
const UNIT_WANDER_TICKS = 8;     // ticks a unit wanders before it can settle

// --- Civilization Logic ---

let statusTimeout = null;

function showStatus(message, type) {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.innerHTML = `<div class="status-bar-inner">${message}</div>`;
  bar.className = 'status-bar' + (type ? ` ${type}` : '');
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    bar.className = 'status-bar hidden';
  }, 2500);
}

function hasAnyCivilization() {
  const { cells, width, height } = state.grid;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].civilization) return true;
    }
  }
  return false;
}

function hasAnyCreatures() {
  const { cells, width, height } = state.grid;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].creatures && cells[r][c].creatures.length > 0) return true;
    }
  }
  return false;
}

// --- T023: createCivilization ---
function createCivilization(row, col) {
  const cell = state.grid.cells[row][col];
  if (!cell) return false;

  // Monolith mode: found the very first civilization (requires creatures, one-per-planet)
  if (state.monolithMode) {
    if (hasAnyCivilization()) {
      showStatus('⚠️ A civilization already exists on this planet!', 'error');
      return false;
    }
    if (!cell.creatures || cell.creatures.length === 0) {
      showStatus('⚠️ No sentient beings here to civilize!', 'error');
      return false;
    }
    const species = cell.creatures[0].name;
    cell.civilization = { stage: 0, species };
    showStatus(`🗿 ${species} civilization founded!`, 'success');
    return true;
  }

  // Civ placement mode: place a new city at the highest existing tech stage
  if (!hasAnyCivilization()) {
    showStatus('⚠️ No civilization exists yet — use a Monolith first!', 'error');
    return false;
  }
  if (cell.civilization) {
    showStatus('⚠️ Cell already has a civilization!', 'error');
    return false;
  }

  // Find max stage across the planet
  let maxStage = 0;
  const { cells, width, height } = state.grid;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].civilization && cells[r][c].civilization.stage > maxStage) {
        maxStage = cells[r][c].civilization.stage;
      }
    }
  }
  cell.civilization = { stage: maxStage };
  const tech = TECH_STAGES[maxStage];
  showStatus(`${tech.emoji} New ${tech.name} city founded!`, 'success');
  return true;
}

function advanceCivilization(cell) {
  if (!cell.civilization) return;
  if (cell.civilization.stage >= TECH_STAGES.length - 1) return; // terminal
  if (Math.random() < TECH_ADVANCE_CHANCE) {
    cell.civilization.stage += 1;
  }
}

// --- Mobile Unit Logic ---

function countActiveUnits() {
  const { cells, width, height } = state.grid;
  let count = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].unit) count++;
    }
  }
  return count;
}

function spawnUnit(row, col) {
  const cell = state.grid.cells[row][col];
  if (!cell.civilization || cell.civilization.stage > 5) return false; // nanotech doesn't spawn
  if (countActiveUnits() >= MAX_UNITS) return false;

  const stage = cell.civilization.stage;
  const unitDef = UNIT_TYPES[stage];
  if (!unitDef) return false;

  // Pick land or sea unit based on current cell biome
  const isWater = cell.biome === 'water';
  let chosen;
  if (isWater && unitDef.sea) {
    chosen = unitDef.sea;
  } else {
    chosen = unitDef.land;
  }

  cell.unit = {
    emoji: chosen.emoji,
    stage: stage,
    movementType: chosen.movementType,
    row: row,
    col: col,
    wanderLeft: UNIT_WANDER_TICKS,
  };
  return true;
}

function moveUnits() {
  const { cells, width, height } = state.grid;

  // Collect all units
  const allUnits = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].unit) {
        allUnits.push({ unit: cells[r][c].unit, fromR: r, fromC: c });
        cells[r][c].unit = null; // clear — reassign below
      }
    }
  }

  // 8-directional adjacency (including diagonals)
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (const { unit, fromR, fromC } of allUnits) {
    // Pick random adjacent cell (8-directional, toroidal wrap)
    const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
    let nr = (fromR + dr + height) % height;
    let nc = (fromC + dc + width) % width;

    const targetCell = cells[nr][nc];
    const targetBiome = targetCell.biome;
    const isWaterTarget = targetBiome === 'water';

    // Terrain restriction check
    let canEnter = true;
    if (unit.movementType === 'land' && isWaterTarget) canEnter = false;
    if (unit.movementType === 'sea' && !isWaterTarget) canEnter = false;
    // air crosses anything

    if (canEnter) {
      unit.row = nr;
      unit.col = nc;
      unit.wanderLeft -= 1;

      // Settle only after wandering long enough and target has no civilization
      if (unit.wanderLeft <= 0 && !targetCell.civilization) {
        targetCell.civilization = { stage: unit.stage };
        cells[nr][nc].unit = null; // unit disappears — settled
      } else {
        cells[nr][nc].unit = unit;
      }
    } else {
      // Can't move — stay in place (don't decrement wanderLeft on blocked moves)
      unit.row = fromR;
      unit.col = fromC;
      cells[fromR][fromC].unit = unit;
    }
  }
}

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
