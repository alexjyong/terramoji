// Terramoji — Simulation Tests
// Calls REAL functions from js/simulation.js via eval-IIFE with DOM shims.
// No replica logic — tests exercise actual simulation code paths.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ */
/* Minimal DOM shim so simulation.js can run in Node.js                 */
/* ------------------------------------------------------------------ */

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.dataset = {};
    this.children = [];
    this._attributes = {};
    this._classes = new Set();
  }
  set class(v) { this.className = v; this._classes = new Set(v.split(' ').filter(Boolean)); }
  get class() { return this.className; }
  classList = {
    add: (c) => { this._classes.add(c); this.className = Array.from(this._classes).join(' '); },
    remove: (c) => { this._classes.delete(c); this.className = Array.from(this._classes).join(' '); },
    toggle: (c) => { this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c); this.className = Array.from(this._classes).join(' '); },
    contains: (c) => this._classes.has(c),
  };
  set innerHTML(v) { this._innerHTML = v; if (v === '') this.children = []; }
  get innerHTML() { return this._innerHTML || ''; }
  setAttribute(key, val) { this._attributes[key] = val; }
  getAttribute(key) { return this._attributes[key]; }
  appendChild(child) { this.children.push(child); }
  removeChild(child) { this.children = this.children.filter(c => c !== child); }
}

class MockDocument {
  constructor() { this._elements = {}; }
  getElementById(id) { return this._elements[id] || null; }
  createElement(tag) { return new MockElement(tag); }
  querySelectorAll() { return []; }
  addEventListener() {}
}

global.document = new MockDocument();
global.window = { innerWidth: 800, innerHeight: 600 };
global.setInterval = () => null;
global.clearInterval = () => {};
global.setTimeout = (fn, ms) => { if (fn) fn(); return null; };
global.clearTimeout = () => {};

// Mock status bar element (used by showStatus in simulation.js)
const statusBarEl = new MockElement('div');
statusBarEl.id = 'status-bar';
global.document._elements['status-bar'] = statusBarEl;

// Mock grid element (used by renderGrid, which tick() calls)
const gridEl = new MockElement('div');
gridEl.id = 'grid';
global.document._elements['grid'] = gridEl;

// Mock tooltip element
const tooltipEl = new MockElement('div');
tooltipEl.id = 'inspect-tooltip';
tooltipEl.className = 'inspect-tooltip hidden';
global.document._elements['inspect-tooltip'] = tooltipEl;

// Shim renderGrid so tick() doesn't crash (renderGrid is in renderer.js, not simulation.js)
global.renderGrid = () => {};

// Shim showInspectTooltip and hideTooltip (called by UI event handlers)
global.showInspectTooltip = () => {};
global.hideTooltip = () => {};

/* ------------------------------------------------------------------ */
/* Load simulation.js via eval-IIFE so we get real functions             */
/* ------------------------------------------------------------------ */

function loadSimulation() {
  const simCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'simulation.js'), 'utf8');

  const wrapped = `
    (function() {
      ${simCode}
      return {
        state, BIOMES, BIOME_KEYS, POLE_ROWS, CREATURE_TYPES,
        TECH_STAGES, UNIT_TYPES, TECH_ADVANCE_CHANCE, UNIT_SPAWN_CHANCE,
        MAX_UNITS, UNIT_WANDER_TICKS,
        mulberry32, generatePlanet, enforcePoles, smoothGrid,
        spawnCreatures, moveCreatures, tick, startSimulation,
        removeIncompatibleCreatures, changeCellBiome, createCreature,
        totalCreatures, getCreaturesForBiome,
        createCivilization, advanceCivilization,
        clearAllUnits, countActiveUnits, spawnUnit, moveUnits,
        hasAnyCivilization, hasAnyCreatures,
      };
    })()
  `;
  return eval(wrapped);
}

const {
  state, BIOMES, BIOME_KEYS, POLE_ROWS, CREATURE_TYPES,
  TECH_STAGES, UNIT_TYPES, TECH_ADVANCE_CHANCE, UNIT_SPAWN_CHANCE,
  MAX_UNITS, UNIT_WANDER_TICKS,
  mulberry32, generatePlanet, enforcePoles, smoothGrid,
  spawnCreatures, moveCreatures, tick, startSimulation,
  removeIncompatibleCreatures, changeCellBiome, createCreature,
  totalCreatures, getCreaturesForBiome,
  createCivilization, advanceCivilization,
  clearAllUnits, countActiveUnits, spawnUnit, moveUnits,
  hasAnyCivilization, hasAnyCreatures,
} = loadSimulation();

/* ------------------------------------------------------------------ */
/* Helpers (non-replica — just convenience, no game logic)               */
/* ------------------------------------------------------------------ */

// Build a fresh grid of given dimensions with uniform biome
function buildGrid(width, height, biome) {
  const cells = [];
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      cells[r][c] = { biome: biome || 'grassland', creatures: [], civilization: null, unit: null };
    }
  }
  return cells;
}

// Seed-controlled Math.random: sets Math.random to mulberry32(seed) and returns restore fn
function withDeterministicRng(seed, fn) {
  const origRandom = Math.random;
  Math.random = mulberry32(seed);
  try { fn(); } finally { Math.random = origRandom; }
}

// Force Math.random to a fixed value (e.g. 0 for "always true", 1.0 for "always false")
function withFixedRng(value, fn) {
  const origRandom = Math.random;
  Math.random = () => value;
  try { fn(); } finally { Math.random = origRandom; }
}

// Force Math.random to produce a specific direction index (0-7) for moveUnits
// dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
function directionRng(index) {
  return () => index / 8;
}

/* ------------------------------------------------------------------ */
/* Tests                                                                */
/* ------------------------------------------------------------------ */

// --- T009: mulberry32 produces deterministic sequences ---
(function testMulberry32Deterministic() {
  const rng1 = mulberry32(42);
  const seq1 = [rng1(), rng1(), rng1(), rng1()];
  const rng2 = mulberry32(42);
  const seq2 = [rng2(), rng2(), rng2(), rng2()];
  assert.deepStrictEqual(seq1, seq2, 'Same seed must produce same sequence');
  console.log('  T009  mulberry32 deterministic: PASS');
})();

// --- T009b: different seeds produce different sequences ---
(function testMulberry32DifferentSeeds() {
  const rng1 = mulberry32(42);
  const rng2 = mulberry32(99);
  const seq1 = [rng1(), rng1()];
  const seq2 = [rng2(), rng2()];
  assert.notDeepStrictEqual(seq1, seq2, 'Different seeds must produce different sequences');
  console.log('  T009b mulberry32 different seeds: PASS');
})();

// --- T010: terrain generation creates 30x30 grid with all 7 biomes ---
(function testGeneratePlanet() {
  withDeterministicRng(12345, () => {
    generatePlanet();
  });

  const { cells, width, height } = state.grid;
  assert.strictEqual(width, 30, 'Grid width should be 30');
  assert.strictEqual(height, 30, 'Grid height should be 30');
  assert.strictEqual(cells.length, 30, 'Should have 30 rows');

  const foundBiomes = new Set();
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      foundBiomes.add(cells[r][c].biome);
    }
  }

  for (const key of BIOME_KEYS) {
    assert.ok(foundBiomes.has(key), `Biome "${key}" should be present`);
  }
  console.log('  T010  terrain generation creates 30x30 grid with 7 biomes: PASS');
})();

// --- T010c: poles are ice biome, enforcePoles locks them ---
(function testPolesAreIce() {
  withDeterministicRng(54321, () => {
    generatePlanet();
  });

  const { cells, width, height } = state.grid;

  // Top 3 rows must be ice
  for (let r = 0; r < POLE_ROWS.top; r++) {
    for (let c = 0; c < width; c++) {
      assert.strictEqual(cells[r][c].biome, 'ice',
        `Top pole cell [${r}][${c}] should be ice`);
    }
  }

  // Bottom 3 rows must be ice
  for (let r = height - POLE_ROWS.bottom; r < height; r++) {
    for (let c = 0; c < width; c++) {
      assert.strictEqual(cells[r][c].biome, 'ice',
        `Bottom pole cell [${r}][${c}] should be ice`);
    }
  }

  // Verify enforcePoles corrects non-pole rows if ice spread in
  // First corrupt the top rows to non-ice, then re-enforce
  for (let c = 0; c < width; c++) {
    cells[0][c].biome = 'grassland';
    cells[1][c].biome = 'desert';
  }
  enforcePoles();
  for (let c = 0; c < width; c++) {
    assert.strictEqual(cells[0][c].biome, 'ice', 'enforcePoles should restore top pole ice');
    assert.strictEqual(cells[1][c].biome, 'ice', 'enforcePoles should restore top pole ice');
  }
  console.log('  T010c poles are ice, enforcePoles locks them: PASS');
})();

// --- T010b: cellular automata smoothing preserves grid dimensions ---
(function testSmoothing() {
  withDeterministicRng(99999, () => {
    generatePlanet();
  });

  const { cells, width, height } = state.grid;
  assert.strictEqual(cells.length, height, 'Rows should match height');
  assert.strictEqual(cells[0].length, width, 'Cols should match width');

  // Run smoothing 3 more times (generatePlanet already did 3)
  for (let pass = 0; pass < 3; pass++) {
    smoothGrid();
    assert.strictEqual(state.grid.cells.length, height, `Pass ${pass}: rows preserved`);
    assert.strictEqual(state.grid.cells[0].length, width, `Pass ${pass}: cols preserved`);
  }

  // Verify biomes are more clustered after smoothing
  // Count biome changes (adjacent same-biome pairs should increase)
  let sameNeighborPairs = 0;
  let totalPairs = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (c + 1 < width && state.grid.cells[r][c].biome === state.grid.cells[r][c + 1].biome) sameNeighborPairs++;
      totalPairs++;
      if (r + 1 < height && state.grid.cells[r][c].biome === state.grid.cells[r + 1][c].biome) sameNeighborPairs++;
      totalPairs++;
    }
  }
  const clusterRatio = sameNeighborPairs / totalPairs;
  assert.ok(clusterRatio > 0.3,
    `Smoothing should produce clusters (ratio ${clusterRatio.toFixed(2)} > 0.3)`);

  console.log('  T010b smoothing preserves dimensions and clusters biomes: PASS');
})();

// --- T011: ice biome is enforced at poles ---
(function testPoleEnforcement() {
  // Set up a grid where poles are NOT ice (smoothing would have spread ice)
  state.grid.width = 5;
  state.grid.height = 7;
  state.grid.cells = buildGrid(5, 7, 'grassland');

  enforcePoles();

  // Top 3 rows should be ice
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      assert.strictEqual(state.grid.cells[r][c].biome, 'ice',
        `Row ${r} col ${c} should be ice after enforcePoles`);
    }
  }

  // Bottom 3 rows should be ice
  for (let r = 4; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      assert.strictEqual(state.grid.cells[r][c].biome, 'ice',
        `Row ${r} col ${c} should be ice after enforcePoles`);
    }
  }

  // Middle row should NOT be ice
  for (let c = 0; c < 5; c++) {
    assert.strictEqual(state.grid.cells[3][c].biome, 'grassland',
      `Middle row should remain grassland`);
  }

  console.log('  T011  enforcePoles locks ice at top/bottom: PASS');
})();

// --- T021: spawnCreatures places correct creature type on matching biome ---
(function testSpawnCreatures() {
  // Set up a 5x5 grid with each cell a different biome
  state.grid.width = 7;
  state.grid.height = 7;
  state.grid.cells = buildGrid(7, 7, 'grassland');
  // Force some specific biomes
  const biomeMap = {
    'water': 0, 'grassland': 0, 'desert': 0, 'mountain': 0,
    'forest': 0, 'jungle': 0, 'ice': 0
  };

  withDeterministicRng(42, () => {
    spawnCreatures();
  });

  const total = totalCreatures(state.grid.cells, 7, 7);
  assert.ok(total > 0, 'Should have spawned creatures');
  assert.ok(total <= 200, `Total creatures (${total}) should not exceed cap`);

  // Verify creatures are biome-compatible
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = state.grid.cells[r][c];
      const biome = cell.biome;
      for (const cr of cell.creatures) {
        assert.ok(cr.compatibleBiomes.includes(biome),
          `Creature ${cr.name} at [${r}][${c}] should be compatible with ${biome}`);
      }
      // Per-cell cap
      assert.ok(cell.creatures.length <= 5,
        `Cell [${r}][${c}] should not exceed 5 creatures`);
    }
  }

  console.log('  T021  spawnCreatures places compatible creatures: PASS');
})();

// --- T022: moveCreatures only moves to adjacent compatible biome cells ---
(function testMoveCreatures() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  // Place a cow (compatible: grassland, forest) on [2][2]
  state.grid.cells[2][2].creatures.push(createCreature('cow', 2, 2));

  // Change neighbor [2][1] to desert (cow can't live on desert)
  state.grid.cells[2][1].biome = 'desert';

  // Change neighbor [2][3] to forest (cow CAN live on forest)
  state.grid.cells[2][3].biome = 'forest';

  withDeterministicRng(12345, () => {
    moveCreatures();
  });

  // Verify cow ended up on a compatible biome
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      for (const cr of state.grid.cells[r][c].creatures) {
        assert.ok(cr.compatibleBiomes.includes(state.grid.cells[r][c].biome),
          `Creature ${cr.name} at [${r}][${c}] should be on compatible biome`);
      }
    }
  }

  console.log('  T022  moveCreatures respects biome compatibility: PASS');
})();

// --- T023: creature removal when biome changes to incompatible type ---
(function testCreatureRemoval() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');

  // Place a cow on [1][1]
  state.grid.cells[1][1].creatures.push(createCreature('cow', 1, 1));
  assert.strictEqual(state.grid.cells[1][1].creatures.length, 1, 'Cow should be present');

  // Change biome to water (cow can't survive)
  changeCellBiome(1, 1, 'water');

  // The changeCellBiome function clears creatures immediately
  assert.strictEqual(state.grid.cells[1][1].creatures.length, 0,
    'Cow should be removed when biome changes to incompatible type');

  // Also test removeIncompatibleCreatures directly
  state.grid.cells[1][1].biome = 'grassland';
  state.grid.cells[1][1].creatures.push(createCreature('fish', 1, 1));
  // fish is only compatible with water
  assert.strictEqual(state.grid.cells[1][1].creatures.length, 1, 'Fish should be present');

  removeIncompatibleCreatures();
  assert.strictEqual(state.grid.cells[1][1].creatures.length, 0,
    'Fish should be removed from grassland by removeIncompatibleCreatures');

  console.log('  T023  creatures removed when biome incompatible: PASS');
})();

/* ============================================================
   T31: Civilization Creation Tests (Monolith + Manual)
   Uses real createCivilization() with state.monolithMode
   ============================================================ */

// --- T31a: Monolith creates civilization on tile with creatures ---
(function testMonolithCreatesCiv() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.monolithMode = true;

  state.grid.cells[2][2].creatures.push(createCreature('cow', 2, 2));
  const res = createCivilization(2, 2);

  assert.strictEqual(res, true, 'Monolith should succeed on tile with creatures');
  assert.ok(state.grid.cells[2][2].civilization, 'Cell should have civilization object');
  assert.strictEqual(state.grid.cells[2][2].civilization.stage, 0, 'New civ should be Stone age (stage 0)');
  assert.strictEqual(state.grid.cells[2][2].civilization.species, 'cow', 'Species should match first creature');

  state.monolithMode = false;
  console.log('  T31a monolith creates civ on tile with creatures: PASS');
})();

// --- T31b: Monolith rejects tile without creatures ---
(function testMonolithRejectsNoCreatures() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.monolithMode = true;

  // (2,2) has no creatures
  const res = createCivilization(2, 2);
  assert.strictEqual(res, false, 'Monolith should fail on empty tile');
  assert.strictEqual(state.grid.cells[2][2].civilization, null, 'Cell should remain without civilization');

  state.monolithMode = false;
  console.log('  T31b monolith rejects tile without creatures: PASS');
})();

// --- T31c: Monolith enforces one-per-planet guard ---
(function testMonolithOnePerPlanet() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.monolithMode = true;

  state.grid.cells[2][2].creatures.push(createCreature('cow', 2, 2));
  state.grid.cells[1][1].creatures.push(createCreature('horse', 1, 1));

  // First monolith succeeds
  let res = createCivilization(2, 2);
  assert.strictEqual(res, true, 'First monolith should succeed');

  // Second monolith on a different tile with creatures must fail
  res = createCivilization(1, 1);
  assert.strictEqual(res, false, 'Second monolith should fail (one-per-planet)');
  assert.strictEqual(state.grid.cells[1][1].civilization, null, 'Second cell should remain without civ');

  state.monolithMode = false;
  console.log('  T31c monolith one-per-planet guard: PASS');
})();

// --- T31d: Manual civ placement requires existing civilization ---
(function testManualCivRequiresExisting() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.civMode = true;
  state.monolithMode = false;

  // No civilization exists anywhere
  const res = createCivilization(2, 2);
  assert.strictEqual(res, false, 'Manual placement should fail without existing civ');

  state.civMode = false;
  console.log('  T31d manual civ requires existing civilization: PASS');
})();

// --- T31e: Manual civ placement creates new city at max existing stage ---
(function testManualCivPlacesAtMaxStage() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.monolithMode = false;
  state.civMode = true;

  // Seed a Stone civ at (2,2)
  state.grid.cells[2][2].civilization = { stage: 0 };

  // Place a new city at (3,3)
  let res = createCivilization(3, 3);
  assert.strictEqual(res, true, 'Manual placement should succeed');
  assert.strictEqual(state.grid.cells[3][3].civilization.stage, 0, 'New city should match max stage (0)');

  // Advance the original civ to Bronze (stage 1)
  state.grid.cells[2][2].civilization.stage = 1;

  // Place another city — should be at stage 1
  res = createCivilization(4, 4);
  assert.strictEqual(res, true, 'Second manual placement should succeed');
  assert.strictEqual(state.grid.cells[4][4].civilization.stage, 1, 'New city should match max stage (1)');

  state.civMode = false;
  console.log('  T31e manual civ places at max existing stage: PASS');
})();

// --- T31f: Manual civ rejects cell that already has a civilization ---
(function testManualCivRejectsOccupiedCell() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.monolithMode = false;
  state.civMode = true;

  state.grid.cells[2][2].civilization = { stage: 0 };

  // Try to place on the same cell
  const res = createCivilization(2, 2);
  assert.strictEqual(res, false, 'Should reject placing civ on occupied cell');

  state.civMode = false;
  console.log('  T31f manual civ rejects occupied cell: PASS');
})();

// --- T31g: Civilization coexists with creatures on same tile ---
(function testCivCoexistsWithCreatures() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.monolithMode = true;

  state.grid.cells[2][2].creatures.push(createCreature('cow', 2, 2));
  state.grid.cells[2][2].creatures.push(createCreature('horse', 2, 2));

  createCivilization(2, 2);

  assert.ok(state.grid.cells[2][2].civilization, 'Civ should exist');
  assert.strictEqual(state.grid.cells[2][2].creatures.length, 2, 'Creatures should still be present');
  assert.strictEqual(state.grid.cells[2][2].creatures[0].emoji, '🐄', 'Cow should remain');
  assert.strictEqual(state.grid.cells[2][2].creatures[1].emoji, '🐴', 'Horse should remain');

  state.monolithMode = false;
  console.log('  T31g civilization coexists with creatures: PASS');
})();

// --- T31h: Multiple manual placements create independent civilizations ---
(function testMultipleManualPlacements() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.monolithMode = false;
  state.civMode = true;

  // Seed first civ
  state.grid.cells[2][2].civilization = { stage: 0 };

  // Place cities on multiple tiles
  createCivilization(1, 1);
  createCivilization(3, 3);
  createCivilization(0, 0);

  // Count civilizations
  let civCount = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (state.grid.cells[r][c].civilization) civCount++;
    }
  }
  assert.strictEqual(civCount, 4, 'Should have 4 civilizations total');

  state.civMode = false;
  console.log('  T31h multiple manual placements create independent civs: PASS');
})();

/* ============================================================
   T32: Tech Advancement Tests
   Uses real advanceCivilization() with Math.random control
   ============================================================ */

// --- T32a: advanceCivilization increments stage with probability ---
(function testCivAdvancesWithProbability() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');
  state.grid.cells[1][1].civilization = { stage: 0 };

  // Force advancement: Math.random() always returns 0 (< TECH_ADVANCE_CHANCE)
  withFixedRng(0, () => {
    advanceCivilization(state.grid.cells[1][1]);
    assert.strictEqual(state.grid.cells[1][1].civilization.stage, 1, 'Stage should advance from 0→1');

    advanceCivilization(state.grid.cells[1][1]);
    assert.strictEqual(state.grid.cells[1][1].civilization.stage, 2, 'Stage should advance from 1→2');
  });

  console.log('  T32a civ advances with probability: PASS');
})();

// --- T32b: advanceCivilization does nothing on null civilization ---
(function testAdvanceNullCiv() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');
  // cells[1][1].civilization is null
  advanceCivilization(state.grid.cells[1][1]);
  assert.strictEqual(state.grid.cells[1][1].civilization, null, 'Null civ should stay null');

  console.log('  T32b advance on null civ is no-op: PASS');
})();

// --- T32c: Nanotech (stage 6) is terminal ---
(function testNanotechIsTerminal() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');
  state.grid.cells[1][1].civilization = { stage: 6 };

  withFixedRng(0, () => {
    advanceCivilization(state.grid.cells[1][1]);
    assert.strictEqual(state.grid.cells[1][1].civilization.stage, 6, 'Nanotech should stay at stage 6');

    advanceCivilization(state.grid.cells[1][1]);
    assert.strictEqual(state.grid.cells[1][1].civilization.stage, 6, 'Still nanotech after second tick');
  });

  console.log('  T32c nanotech is terminal: PASS');
})();

// --- T32d: Full progression Stone → Nanotech over multiple ticks ---
(function testFullProgression() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');
  state.grid.cells[1][1].civilization = { stage: 0 };

  withFixedRng(0, () => {
    for (let stage = 0; stage < TECH_STAGES.length - 1; stage++) {
      advanceCivilization(state.grid.cells[1][1]);
      assert.strictEqual(
        state.grid.cells[1][1].civilization.stage,
        stage + 1,
        `Should advance from ${TECH_STAGES[stage].name} to ${TECH_STAGES[stage + 1].name}`
      );
    }

    assert.strictEqual(state.grid.cells[1][1].civilization.stage, 6, 'Final stage should be Nanotech');
    assert.strictEqual(TECH_STAGES[state.grid.cells[1][1].civilization.stage].name, 'Nanotech');
  });

  console.log('  T32d full progression Stone → Nanotech: PASS');
})();

// --- T32e: Civilization does NOT advance when RNG is below threshold ---
(function testCivDoesNotAdvanceWhenRngFails() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');
  state.grid.cells[1][1].civilization = { stage: 0 };

  withFixedRng(1.0, () => {
    for (let i = 0; i < 100; i++) {
      advanceCivilization(state.grid.cells[1][1]);
    }
    assert.strictEqual(state.grid.cells[1][1].civilization.stage, 0,
      'Stage should remain 0 when RNG never triggers');
  });

  console.log('  T32e civ does not advance when RNG fails: PASS');
})();

// --- T32f: Multiple civilizations advance independently ---
(function testIndependentAdvancement() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[1][1].civilization = { stage: 0 };
  state.grid.cells[3][3].civilization = { stage: 2 };

  withFixedRng(0, () => {
    // Advance both
    advanceCivilization(state.grid.cells[1][1]);
    advanceCivilization(state.grid.cells[3][3]);

    assert.strictEqual(state.grid.cells[1][1].civilization.stage, 1, 'First civ should advance 0→1');
    assert.strictEqual(state.grid.cells[3][3].civilization.stage, 3, 'Second civ should advance 2→3');

    // Advance first, skip second (use RNG=1.0 for second)
    advanceCivilization(state.grid.cells[1][1]);
  });

  // Reset RNG for the second call
  withFixedRng(1.0, () => {
    advanceCivilization(state.grid.cells[3][3]);
  });

  assert.strictEqual(state.grid.cells[1][1].civilization.stage, 2, 'First civ should be at stage 2');
  assert.strictEqual(state.grid.cells[3][3].civilization.stage, 3, 'Second civ should still be at stage 3');

  console.log('  T32f multiple civs advance independently: PASS');
})();

// --- T32g: Advancement probability matches expected rate (~2%) ---
(function testAdvancementRate() {
  const trials = 10000;
  let advances = 0;

  for (let i = 0; i < trials; i++) {
    state.grid.width = 1;
    state.grid.height = 1;
    state.grid.cells = buildGrid(1, 1, 'grassland');
    state.grid.cells[0][0].civilization = { stage: 0 };
    advanceCivilization(state.grid.cells[0][0]); // uses real Math.random
    if (state.grid.cells[0][0].civilization.stage > 0) advances++;
  }

  const rate = advances / trials;
  assert.ok(rate >= 0.01 && rate <= 0.03,
    `Advancement rate ${rate.toFixed(3)} should be near 0.02 (got ${advances}/${trials})`);

  console.log(`  T32g advancement rate ~2% (actual: ${(rate * 100).toFixed(1)}%): PASS`);
})();

// --- T32h: Civilization data preserved through biome change ---
(function testCivPersistsThroughBiomeChange() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');
  state.grid.cells[1][1].civilization = { stage: 2 };

  changeCellBiome(1, 1, 'desert');

  assert.ok(state.grid.cells[1][1].civilization, 'Civ should persist after biome change');
  assert.strictEqual(state.grid.cells[1][1].civilization.stage, 2, 'Stage should remain unchanged');

  console.log('  T32h civ persists through biome change: PASS');
})();

/* ============================================================
   T33: Civilization Persistence Through Biome Changes
   Uses real smoothGrid() which preserves civ through smoothing
   ============================================================ */

// --- T33a: Civilization data preserved after single smoothGrid pass ---
(function testCivPersistsAfterSmoothing() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].civilization = { stage: 2, species: 'cow' };

  smoothGrid();

  assert.ok(state.grid.cells[2][2].civilization, 'Civ should exist after smoothing');
  assert.strictEqual(state.grid.cells[2][2].civilization.stage, 2, 'Stage should remain 2 (Iron)');
  assert.strictEqual(state.grid.cells[2][2].civilization.species, 'cow', 'Species should be preserved');

  console.log('  T33a civ persists after single smoothGrid pass: PASS');
})();

// --- T33b: Civilization data preserved through multiple smoothing passes ---
(function testCivPersistsAfterMultipleSmoothingPasses() {
  state.grid.width = 7;
  state.grid.height = 7;
  state.grid.cells = buildGrid(7, 7, 'grassland');

  state.grid.cells[3][3].biome = 'desert';
  state.grid.cells[3][3].civilization = { stage: 3, species: 'camel' };

  // 3 smoothing passes
  for (let pass = 0; pass < 3; pass++) {
    smoothGrid();
  }

  assert.ok(state.grid.cells[3][3].civilization, 'Civ should exist after 3 smoothing passes');
  assert.strictEqual(state.grid.cells[3][3].civilization.stage, 3, 'Stage should remain 3 (Industrial)');
  assert.strictEqual(state.grid.cells[3][3].civilization.species, 'camel', 'Species should be preserved');

  console.log('  T33b civ persists through multiple smoothing passes: PASS');
})();

// --- T33c: Civilization survives biome change from grassland → water → desert ---
(function testCivSurvivesMultipleBiomeChanges() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');
  state.grid.cells[1][1].civilization = { stage: 1 };

  changeCellBiome(1, 1, 'water');
  assert.ok(state.grid.cells[1][1].civilization, 'Civ should persist after grassland→water');
  assert.strictEqual(state.grid.cells[1][1].civilization.stage, 1, 'Stage unchanged after grassland→water');

  changeCellBiome(1, 1, 'desert');
  assert.ok(state.grid.cells[1][1].civilization, 'Civ should persist after water→desert');
  assert.strictEqual(state.grid.cells[1][1].civilization.stage, 1, 'Stage unchanged after water→desert');

  changeCellBiome(1, 1, 'ice');
  assert.ok(state.grid.cells[1][1].civilization, 'Civ should persist after desert→ice');
  assert.strictEqual(state.grid.cells[1][1].civilization.stage, 1, 'Stage unchanged after desert→ice');

  console.log('  T33c civ survives multiple biome changes: PASS');
})();

// --- T33d: Civilization at max stage (Nanotech) persists through smoothing ---
(function testNanotechCivPersistsThroughSmoothing() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'forest');

  state.grid.cells[2][2].biome = 'desert';
  state.grid.cells[2][2].civilization = { stage: 6, species: 'lizard' };

  smoothGrid();

  assert.ok(state.grid.cells[2][2].civilization, 'Nanotech civ should exist after smoothing');
  assert.strictEqual(state.grid.cells[2][2].civilization.stage, 6, 'Stage must remain 6 (Nanotech)');
  assert.strictEqual(state.grid.cells[2][2].civilization.species, 'lizard', 'Species preserved for Nanotech civ');

  console.log('  T33d nanotech civ persists through smoothing: PASS');
})();

// --- T33e: Multiple civilizations each persist independently through smoothing ---
(function testMultipleCivsPersistThroughSmoothing() {
  state.grid.width = 7;
  state.grid.height = 7;
  state.grid.cells = buildGrid(7, 7, 'grassland');

  state.grid.cells[2][2].civilization = { stage: 0, species: 'cow' };
  state.grid.cells[2][4].civilization = { stage: 1, species: 'horse' };
  state.grid.cells[4][2].civilization = { stage: 3, species: 'lion' };
  state.grid.cells[4][4].civilization = { stage: 5, species: 'sheep' };

  smoothGrid();

  assert.strictEqual(state.grid.cells[2][2].civilization.stage, 0, 'Stone civ preserved');
  assert.strictEqual(state.grid.cells[2][2].civilization.species, 'cow', 'Stone species preserved');
  assert.strictEqual(state.grid.cells[2][4].civilization.stage, 1, 'Bronze civ preserved');
  assert.strictEqual(state.grid.cells[2][4].civilization.species, 'horse', 'Bronze species preserved');
  assert.strictEqual(state.grid.cells[4][2].civilization.stage, 3, 'Industrial civ preserved');
  assert.strictEqual(state.grid.cells[4][2].civilization.species, 'lion', 'Industrial species preserved');
  assert.strictEqual(state.grid.cells[4][4].civilization.stage, 5, 'Information civ preserved');
  assert.strictEqual(state.grid.cells[4][4].civilization.species, 'sheep', 'Information species preserved');

  console.log('  T33e multiple civs persist independently through smoothing: PASS');
})();

// --- T33f: Civilization with no species field (manual placement) persists ---
(function testCivWithoutSpeciesPersists() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'desert');

  state.grid.cells[2][2].civilization = { stage: 2 };

  smoothGrid();

  assert.ok(state.grid.cells[2][2].civilization, 'Civ should exist after smoothing');
  assert.strictEqual(state.grid.cells[2][2].civilization.stage, 2, 'Stage preserved for civ without species');
  assert.strictEqual(state.grid.cells[2][2].civilization.species, undefined, 'Species remains undefined');

  console.log('  T33f civ without species field persists through smoothing: PASS');
})();

// --- T33g: Civilization persists when biome changes during tick cycle ---
(function testCivPersistsDuringTickCycle() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].civilization = { stage: 1, species: 'cow' };

  // Smooth (biome may change via smoothing)
  smoothGrid();

  // Force advance
  withFixedRng(0, () => {
    advanceCivilization(state.grid.cells[2][2]);
  });

  assert.ok(state.grid.cells[2][2].civilization, 'Civ should exist after tick cycle');
  assert.strictEqual(state.grid.cells[2][2].civilization.stage, 2, 'Stage advanced from 1→2 after smoothing');
  assert.strictEqual(state.grid.cells[2][2].civilization.species, 'cow', 'Species preserved through tick cycle');

  console.log('  T33g civ persists and advances during tick cycle: PASS');
})();

/* ============================================================
   T34: Unit Spawning, Movement, Terrain Restrictions, Settling
   Uses real spawnUnit() and moveUnits() with Math.random control
   ============================================================ */

// --- T34a: spawnUnit creates unit with correct emoji/stage/movementType ---
(function testSpawnUnitCreatesUnit() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  // Stone age (stage 0) — only land units
  state.grid.cells[2][2].civilization = { stage: 0 };
  const res = spawnUnit(2, 2);
  assert.strictEqual(res, true, 'spawnUnit should succeed on civ cell');
  assert.ok(state.grid.cells[2][2].unit, 'Cell should have a unit object');
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '🚶', 'Stone age unit should be 🚶');
  assert.strictEqual(state.grid.cells[2][2].unit.stage, 0, 'Unit stage should match civ stage 0');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'land', 'Stone age unit should be land type');
  assert.strictEqual(state.grid.cells[2][2].unit.wanderLeft, UNIT_WANDER_TICKS, 'Unit should have wander ticks set');
  assert.strictEqual(state.grid.cells[2][2].unit.restTicks, 1, 'Unit should rest 1 tick on spawn');

  // Bronze age (stage 1) on grassland — land unit 🏇
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].civilization = { stage: 1 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '🏇', 'Bronze land unit should be 🏇');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'land', 'Bronze on grassland should be land');
  assert.strictEqual(state.grid.cells[2][2].unit.stage, 1, 'Unit stage should be 1');

  // Atomic age (stage 4) — air units
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].civilization = { stage: 4 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '✈️', 'Atomic unit should be ✈️');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'air', 'Atomic unit should be air type');

  console.log('  T34a spawnUnit creates unit with correct emoji/stage/movementType: PASS');
})();

// --- T34b: spawnUnit refuses when unit cap (MAX_UNITS) is reached ---
(function testSpawnUnitRespectsCap() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  // Place civilizations everywhere
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      state.grid.cells[r][c].civilization = { stage: 0 };
    }
  }

  // Fill until MAX_UNITS reached
  let spawnCount = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (countActiveUnits() < MAX_UNITS) {
        if (spawnUnit(r, c)) spawnCount++;
      }
    }
  }

  assert.strictEqual(countActiveUnits(), MAX_UNITS,
    `Should have exactly MAX_UNITS (${MAX_UNITS}) units on grid`);

  // Try to spawn more — all should fail
  let failCount = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (!spawnUnit(r, c)) failCount++;
    }
  }
  assert.ok(failCount > 0, 'Some spawn attempts should fail when cap is reached');
  assert.strictEqual(countActiveUnits(), MAX_UNITS,
    `Unit count should remain at cap (${MAX_UNITS}) after failed spawns`);

  console.log('  T34b spawnUnit refuses when MAX_UNITS cap reached: PASS');
})();

// --- T34c: spawnUnit spawns sea unit on water biome, land unit on land biome ---
(function testSpawnUnitBiomeSelection() {
  // Bronze on water → sea 🛶
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'water');
  state.grid.cells[2][2].civilization = { stage: 1 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '🛶', 'Bronze on water → sea 🛶');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'sea');

  // Bronze on grassland → land 🏇
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].civilization = { stage: 1 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '🏇', 'Bronze on grassland → land 🏇');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'land');

  // Iron on water → sea ⛵
  state.grid.cells = buildGrid(5, 5, 'water');
  state.grid.cells[2][2].civilization = { stage: 2 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '⛵', 'Iron on water → sea ⛵');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'sea');

  // Iron on desert → land 🐪
  state.grid.cells = buildGrid(5, 5, 'desert');
  state.grid.cells[2][2].civilization = { stage: 2 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '🐪', 'Iron on desert → land 🐪');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'land');

  // Stone on water → land 🚶 (no sea def for stage 0)
  state.grid.cells = buildGrid(5, 5, 'water');
  state.grid.cells[2][2].civilization = { stage: 0 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '🚶', 'Stone on water → land 🚶');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'land');

  // Atomic on water → air ✈️
  state.grid.cells = buildGrid(5, 5, 'water');
  state.grid.cells[2][2].civilization = { stage: 4 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '✈️', 'Atomic on water → air ✈️');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'air');

  // Atomic on grassland → air ✈️
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].civilization = { stage: 4 };
  spawnUnit(2, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.emoji, '✈️', 'Atomic on grassland → air ✈️');
  assert.strictEqual(state.grid.cells[2][2].unit.movementType, 'air');

  console.log('  T34c spawnUnit spawns sea unit on water, land unit on land: PASS');
})();

// --- T34d: moveUnits moves unit to adjacent cell ---
(function testMoveUnitsMovesToAdjacentCell() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  state.grid.cells[2][2].civilization = { stage: 1 };
  state.grid.cells[2][2].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  // Force direction index 3 → [0, -1] (left) → target [2][1]
  withFixedRng(3 / 8, () => {
    moveUnits();
  });

  assert.ok(!state.grid.cells[2][2].unit, 'Unit should leave origin [2][2]');
  assert.ok(state.grid.cells[2][1].unit, 'Unit should be at [2][1]');
  assert.strictEqual(state.grid.cells[2][1].unit.row, 2);
  assert.strictEqual(state.grid.cells[2][1].unit.col, 1);
  assert.strictEqual(state.grid.cells[2][1].unit.wanderLeft, UNIT_WANDER_TICKS - 1,
    'wanderLeft should decrement');

  // Test different direction: index 7 → [1, 1] (down-right) → target [3][3]
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].civilization = { stage: 1 };
  state.grid.cells[2][2].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  withFixedRng(7 / 8, () => {
    moveUnits();
  });

  assert.ok(!state.grid.cells[2][2].unit, 'Unit should leave origin');
  assert.ok(state.grid.cells[3][3].unit, 'Unit should be at [3][3]');
  assert.strictEqual(state.grid.cells[3][3].unit.row, 3);
  assert.strictEqual(state.grid.cells[3][3].unit.col, 3);

  console.log('  T34d moveUnits moves unit to adjacent cell: PASS');
})();

// --- T34e: moveUnits prevents land unit from entering water cell ---
(function testMoveUnitsLandCannotEnterWater() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][1].biome = 'water'; // target is water

  state.grid.cells[2][2].civilization = { stage: 1 };
  state.grid.cells[2][2].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  // Force direction index 3 → [0, -1] (left) → water at [2][1]
  withFixedRng(3 / 8, () => {
    moveUnits();
  });

  assert.ok(state.grid.cells[2][2].unit, 'Land unit should remain at origin');
  assert.strictEqual(state.grid.cells[2][2].unit.row, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.col, 2);
  assert.ok(!state.grid.cells[2][1].unit, 'Water cell should have no unit');
  assert.strictEqual(state.grid.cells[2][2].unit.wanderLeft, UNIT_WANDER_TICKS,
    'wanderLeft should not decrement when blocked');

  // Test 2: land unit surrounded by water ring — trapped
  state.grid.cells = buildGrid(5, 5, 'grassland');
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      state.grid.cells[2 + dr][2 + dc].biome = 'water';
    }
  }
  state.grid.cells[2][2].civilization = { stage: 0 };
  state.grid.cells[2][2].unit = {
    emoji: '🚶', stage: 0, movementType: 'land',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  // Direction 0 → [-1,-1] → water at [1][1]
  withFixedRng(0 / 8, () => {
    moveUnits();
  });

  assert.ok(state.grid.cells[2][2].unit, 'Land unit should remain trapped');
  assert.strictEqual(state.grid.cells[2][2].unit.row, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.col, 2);

  console.log('  T34e moveUnits prevents land unit from entering water: PASS');
})();

// --- T34f: moveUnits prevents sea unit from entering land cell ---
(function testMoveUnitsSeaCannotEnterLand() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'water');
  state.grid.cells[2][1].biome = 'grassland'; // target is land

  state.grid.cells[2][2].civilization = { stage: 1 };
  state.grid.cells[2][2].unit = {
    emoji: '🛶', stage: 1, movementType: 'sea',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  // Force direction index 3 → [0, -1] (left) → land at [2][1]
  withFixedRng(3 / 8, () => {
    moveUnits();
  });

  assert.ok(state.grid.cells[2][2].unit, 'Sea unit should remain at origin');
  assert.strictEqual(state.grid.cells[2][2].unit.row, 2);
  assert.strictEqual(state.grid.cells[2][2].unit.col, 2);
  assert.ok(!state.grid.cells[2][1].unit, 'Land cell should have no unit');
  assert.strictEqual(state.grid.cells[2][2].unit.wanderLeft, UNIT_WANDER_TICKS,
    'wanderLeft should not decrement when blocked');

  // Test 2: sea unit surrounded by land ring
  state.grid.cells = buildGrid(5, 5, 'water');
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      state.grid.cells[2 + dr][2 + dc].biome = 'grassland';
    }
  }
  state.grid.cells[2][2].civilization = { stage: 2 };
  state.grid.cells[2][2].unit = {
    emoji: '⛵', stage: 2, movementType: 'sea',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  withFixedRng(0 / 8, () => {
    moveUnits();
  });

  assert.ok(state.grid.cells[2][2].unit, 'Sea unit should remain trapped');

  // Test 3: sea unit CAN move to adjacent water
  state.grid.cells = buildGrid(5, 5, 'water');
  state.grid.cells[2][1].biome = 'desert';
  state.grid.cells[2][2].civilization = { stage: 3 };
  state.grid.cells[2][2].unit = {
    emoji: '🚢', stage: 3, movementType: 'sea',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  // Direction index 4 → [0, 1] (right) → water at [2][3]
  withFixedRng(4 / 8, () => {
    moveUnits();
  });

  assert.ok(!state.grid.cells[2][2].unit, 'Sea unit should leave origin');
  assert.ok(state.grid.cells[2][3].unit, 'Sea unit should be at water [2][3]');
  assert.strictEqual(state.grid.cells[2][3].unit.col, 3);

  console.log('  T34f moveUnits prevents sea unit from entering land: PASS');
})();

// --- T34g: moveUnits allows air unit to cross any terrain ---
(function testMoveUnitsAirCrossesAnyTerrain() {
  state.grid.width = 5;
  state.grid.height = 5;

  // air → grassland
  state.grid.cells = buildGrid(5, 5, 'water');
  state.grid.cells[2][1].biome = 'grassland';
  state.grid.cells[2][2].civilization = { stage: 4 };
  state.grid.cells[2][2].unit = {
    emoji: '✈️', stage: 4, movementType: 'air',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };
  withFixedRng(3 / 8, () => { moveUnits(); });
  assert.ok(state.grid.cells[2][1].unit, 'Air should cross to grassland');

  // air → water
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][3].biome = 'water';
  state.grid.cells[2][2].civilization = { stage: 5 };
  state.grid.cells[2][2].unit = {
    emoji: '✈️', stage: 5, movementType: 'air',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };
  withFixedRng(4 / 8, () => { moveUnits(); });
  assert.ok(state.grid.cells[2][3].unit, 'Air should cross to water');

  // air → desert
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][1].biome = 'desert';
  state.grid.cells[2][2].civilization = { stage: 4 };
  state.grid.cells[2][2].unit = {
    emoji: '✈️', stage: 4, movementType: 'air',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };
  withFixedRng(3 / 8, () => { moveUnits(); });
  assert.ok(state.grid.cells[2][1].unit, 'Air should cross to desert');

  // air → ice
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][3].biome = 'ice';
  state.grid.cells[2][2].civilization = { stage: 5 };
  state.grid.cells[2][2].unit = {
    emoji: '✈️', stage: 5, movementType: 'air',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };
  withFixedRng(4 / 8, () => { moveUnits(); });
  assert.ok(state.grid.cells[2][3].unit, 'Air should cross to ice');

  console.log('  T34g moveUnits allows air unit to cross any terrain: PASS');
})();

// --- T34h: unit settles on civ tile (wanderLeft reaches 0) ---
(function testUnitSettlesOnCivTile() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  // Place two civs
  state.grid.cells[2][2].civilization = { stage: 1 };
  state.grid.cells[2][3].civilization = { stage: 1 };

  // Unit at (2,2) with 1 tick of wander left, moving right → (2,3)
  state.grid.cells[2][2].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 2, col: 2, wanderLeft: 1, restTicks: 0,
  };

  // Force direction index 4 → [0, 1] (right)
  withFixedRng(4 / 8, () => {
    moveUnits();
  });

  // Unit should settle on civ tile (wanderLeft reached 0) and be removed
  assert.ok(!state.grid.cells[2][3].unit, 'Unit should settle on civ tile (removed)');
  assert.ok(!state.grid.cells[2][2].unit, 'Unit should not be at origin either');

  console.log('  T34h unit settles on civ tile: PASS');
})();

// --- T34i: unit settles on home tile when wanderLeft reaches 0 ---
(function testUnitSettlesOnHomeTile() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  // Place civ at (2,2)
  state.grid.cells[2][2].civilization = { stage: 1 };

  // Unit starts at (2,2), moves right to (2,3), then moves left back to (2,2)
  state.grid.cells[2][2].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 2, col: 2, wanderLeft: 2, restTicks: 0,
  };

  // First move: direction 4 → [0,1] (right) → (2,3), wanderLeft = 1
  withFixedRng(4 / 8, () => {
    moveUnits();
  });

  assert.ok(state.grid.cells[2][3].unit, 'Unit should be at (2,3) after first move');
  assert.strictEqual(state.grid.cells[2][3].unit.wanderLeft, 1);

  // Second move: direction 3 → [0,-1] (left) → (2,2), wanderLeft = 0 → settles
  withFixedRng(3 / 8, () => {
    moveUnits();
  });

  assert.ok(!state.grid.cells[2][3].unit, 'Unit should settle on home tile');
  assert.ok(!state.grid.cells[2][2].unit, 'Unit should be removed after settling');

  console.log('  T34i unit settles on home tile: PASS');
})();

// --- T34j: unit rests for 1 tick after spawn, then moves ---
(function testUnitRestsAfterSpawn() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  state.grid.cells[2][2].civilization = { stage: 1 };
  state.grid.cells[2][2].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 2, col: 2, wanderLeft: UNIT_WANDER_TICKS, restTicks: 1,
  };

  // First tick: restTicks = 1, should rest (not move)
  withFixedRng(4 / 8, () => {
    moveUnits();
  });

  assert.ok(state.grid.cells[2][2].unit, 'Unit should remain during rest tick');
  assert.strictEqual(state.grid.cells[2][2].unit.restTicks, 0, 'restTicks should decrement to 0');
  assert.strictEqual(state.grid.cells[2][2].unit.wanderLeft, UNIT_WANDER_TICKS, 'wanderLeft should not change during rest');

  // Second tick: restTicks = 0, should move
  withFixedRng(4 / 8, () => {
    moveUnits();
  });

  assert.ok(!state.grid.cells[2][2].unit, 'Unit should move after rest');
  assert.ok(state.grid.cells[2][3].unit, 'Unit should be at (2,3)');

  console.log('  T34j unit rests after spawn then moves: PASS');
})();

// --- T34k: unit wraps around toroidal grid boundaries ---
(function testUnitWrapsAroundGrid() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  // Unit at (0,0) moving up → (-1, 0) → wraps to (4, 0)
  state.grid.cells[0][0].civilization = { stage: 1 };
  state.grid.cells[0][0].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 0, col: 0, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  // Direction 0 → [-1, -1] (up-left) → (-1, -1) → wraps to (4, 4)
  withFixedRng(0 / 8, () => {
    moveUnits();
  });

  assert.ok(!state.grid.cells[0][0].unit, 'Unit should leave (0,0)');
  assert.ok(state.grid.cells[4][4].unit, 'Unit should wrap to (4,4)');
  assert.strictEqual(state.grid.cells[4][4].unit.row, 4);
  assert.strictEqual(state.grid.cells[4][4].unit.col, 4);

  // Test horizontal wrapping: unit at (0, 4) moving right
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[0][4].civilization = { stage: 1 };
  state.grid.cells[0][4].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 0, col: 4, wanderLeft: UNIT_WANDER_TICKS, restTicks: 0,
  };

  // Direction 4 → [0, 1] (right) → (0, 5) → wraps to (0, 0)
  withFixedRng(4 / 8, () => {
    moveUnits();
  });

  assert.ok(!state.grid.cells[0][4].unit, 'Unit should leave (0,4)');
  assert.ok(state.grid.cells[0][0].unit, 'Unit should wrap to (0,0)');
  assert.strictEqual(state.grid.cells[0][0].unit.row, 0);
  assert.strictEqual(state.grid.cells[0][0].unit.col, 0);

  console.log('  T34k unit wraps around toroidal grid: PASS');
})();

// --- T35a: unit cap prevents spawning when MAX_UNITS reached ---
(function testUnitCap() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  // Place civilizations everywhere
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      state.grid.cells[r][c].civilization = { stage: 0 };
    }
  }

  // Fill units up to MAX_UNITS
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (countActiveUnits() < MAX_UNITS) {
        spawnUnit(r, c);
      }
    }
  }

  assert.strictEqual(countActiveUnits(), MAX_UNITS,
    `Should have exactly MAX_UNITS (${MAX_UNITS})`);

  // Try spawning more — should fail
  const spawnAfterCap = spawnUnit(0, 0);
  assert.strictEqual(spawnAfterCap, false, 'Spawn should fail at cap');
  assert.strictEqual(countActiveUnits(), MAX_UNITS, 'Count should remain at cap');

  // Now move units (some may settle, freeing slots)
  withFixedRng(4 / 8, () => { moveUnits(); });

  const afterMove = countActiveUnits();
  assert.ok(afterMove <= MAX_UNITS, 'After move, count should not exceed cap');

  // Try spawning again — if slots freed by settling, spawn should succeed
  const spawnAfterMove = spawnUnit(0, 0);
  if (afterMove < MAX_UNITS) {
    assert.strictEqual(spawnAfterMove, true, 'Spawn should succeed when cap not reached');
    assert.strictEqual(countActiveUnits(), afterMove + 1, 'Count should increment by 1');
  } else {
    assert.strictEqual(spawnAfterMove, false, 'Spawn should still fail at cap');
  }

  console.log('  T35a MAX_UNITS cap prevents new spawns: PASS');
})();

// --- T35b: countActiveUnits returns correct count across multiple cells ---
(function testCountActiveUnits() {
  state.grid.width = 5;
  state.grid.height = 5;

  // Test 1: empty grid — zero units
  state.grid.cells = buildGrid(5, 5, 'grassland');
  assert.strictEqual(countActiveUnits(), 0, 'Empty grid should have 0 active units');

  // Test 2: single unit
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].unit = {
    emoji: '🏇', stage: 1, movementType: 'land', row: 2, col: 2, wanderLeft: 8, restTicks: 0,
  };
  assert.strictEqual(countActiveUnits(), 1, 'Grid with one unit should count 1');

  // Test 3: multiple units scattered
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[0][0].unit = { emoji: '🏇', stage: 1, movementType: 'land', row: 0, col: 0, wanderLeft: 8, restTicks: 0 };
  state.grid.cells[0][4].unit = { emoji: '🛶', stage: 2, movementType: 'sea', row: 0, col: 4, wanderLeft: 8, restTicks: 0 };
  state.grid.cells[2][2].unit = { emoji: '✈️', stage: 4, movementType: 'air', row: 2, col: 2, wanderLeft: 8, restTicks: 0 };
  state.grid.cells[4][0].unit = { emoji: '🏇', stage: 1, movementType: 'land', row: 4, col: 0, wanderLeft: 8, restTicks: 0 };
  state.grid.cells[4][4].unit = { emoji: '🛶', stage: 2, movementType: 'sea', row: 4, col: 4, wanderLeft: 8, restTicks: 0 };
  assert.strictEqual(countActiveUnits(), 5, 'Grid with 5 units should count 5');

  // Test 4: cells with civ but no unit
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[1][1].civilization = { stage: 3 };
  state.grid.cells[2][2].civilization = { stage: 5 };
  state.grid.cells[3][3].civilization = { stage: 0 };
  state.grid.cells[0][0].unit = { emoji: '🏇', stage: 1, movementType: 'land', row: 0, col: 0, wanderLeft: 8, restTicks: 0 };
  assert.strictEqual(countActiveUnits(), 1, 'Civ cells without units should not be counted');

  // Test 5: full grid
  state.grid.cells = buildGrid(5, 5, 'grassland');
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      state.grid.cells[r][c].unit = {
        emoji: '🏇', stage: 1, movementType: 'land', row: r, col: c, wanderLeft: 8, restTicks: 0,
      };
    }
  }
  assert.strictEqual(countActiveUnits(), 25, 'Full 5x5 grid should count 25 units');

  // Test 6: count decreases after units settle
  state.grid.cells = buildGrid(5, 5, 'grassland');
  state.grid.cells[2][2].civilization = { stage: 1 };
  state.grid.cells[2][2].unit = {
    emoji: '🏇', stage: 1, movementType: 'land', row: 2, col: 2,
    wanderLeft: 1, restTicks: 0,
  };
  assert.strictEqual(countActiveUnits(), 1, 'Should have 1 unit before settle');

  withFixedRng(4 / 8, () => { moveUnits(); });

  assert.strictEqual(countActiveUnits(), 0, 'Should have 0 units after settling');

  console.log('  T35b countActiveUnits returns correct count: PASS');
})();

// --- T35c: clearAllUnits clears all units ---
(function testClearAllUnits() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      state.grid.cells[r][c].civilization = { stage: 1 };
      state.grid.cells[r][c].unit = {
        emoji: '🏇', stage: 1, movementType: 'land', row: r, col: c, wanderLeft: 8, restTicks: 0,
      };
    }
  }

  assert.strictEqual(countActiveUnits(), 25, 'Should have 25 units before clear');
  clearAllUnits();
  assert.strictEqual(countActiveUnits(), 0, 'All units should be cleared');

  // Verify civs still exist
  let civCount = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (state.grid.cells[r][c].civilization) civCount++;
    }
  }
  assert.strictEqual(civCount, 25, 'All civilizations should be preserved');

  console.log('  T35c clearAllUnits clears units, preserves civs: PASS');
})();

// --- T35d: generatePlanet clears all units and civs ---
(function testGeneratePlanetClearsAll() {
  state.grid.width = 10;
  state.grid.height = 10;
  state.grid.cells = buildGrid(10, 10, 'grassland');

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      state.grid.cells[r][c].civilization = { stage: 1 };
      state.grid.cells[r][c].unit = {
        emoji: '🏇', stage: 1, movementType: 'land', row: r, col: c, wanderLeft: 8, restTicks: 0,
      };
    }
  }

  assert.strictEqual(countActiveUnits(), 100, 'Should have 100 units before regen');

  withDeterministicRng(12345, () => {
    generatePlanet();
  });

  assert.strictEqual(countActiveUnits(), 0, 'All units should be cleared after regeneration');

  let civCount = 0;
  for (let r = 0; r < state.grid.height; r++) {
    for (let c = 0; c < state.grid.width; c++) {
      if (state.grid.cells[r][c].civilization) civCount++;
    }
  }
  assert.strictEqual(civCount, 0, 'All civilizations should be cleared after regeneration');

  console.log('  T35d generatePlanet clears all units and civs: PASS');
})();

// --- T36: tick() runs full simulation cycle ---
(function testTickCycle() {
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = buildGrid(5, 5, 'grassland');

  // Place a civ at (2,2) with creatures
  state.grid.cells[2][2].civilization = { stage: 0 };
  state.grid.cells[2][2].creatures.push(createCreature('cow', 2, 2));

  // Run 3 ticks with forced advancement
  for (let t = 0; t < 3; t++) {
    withFixedRng(0, () => {
      tick();
    });
  }

  // Civ should have advanced
  assert.ok(state.grid.cells[2][2].civilization.stage >= 1,
    `Civ should have advanced (stage ${state.grid.cells[2][2].civilization.stage}) after 3 ticks`);

  // Grid should still be valid
  assert.strictEqual(state.grid.cells.length, 5, 'Grid height preserved');
  assert.strictEqual(state.grid.cells[0].length, 5, 'Grid width preserved');

  console.log('  T36  tick() runs full simulation cycle: PASS');
})();

// --- T37: hasAnyCivilization / hasAnyCreatures helpers ---
(function testHelperPredicates() {
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = buildGrid(3, 3, 'grassland');

  assert.strictEqual(hasAnyCivilization(), false, 'Empty grid: no civilizations');
  assert.strictEqual(hasAnyCreatures(), false, 'Empty grid: no creatures');

  // Add a civ
  state.grid.cells[1][1].civilization = { stage: 0 };
  assert.strictEqual(hasAnyCivilization(), true, 'Grid with civ: hasAnyCivilization = true');
  assert.strictEqual(hasAnyCreatures(), false, 'Grid with civ only: no creatures');

  // Add a creature
  state.grid.cells[0][0].creatures.push(createCreature('fish', 0, 0));
  assert.strictEqual(hasAnyCivilization(), true, 'Still has civ');
  assert.strictEqual(hasAnyCreatures(), true, 'Grid with creature: hasAnyCreatures = true');

  // Clear civs
  state.grid.cells = buildGrid(3, 3, 'grassland');
  state.grid.cells[1][1].creatures.push(createCreature('cow', 1, 1));
  assert.strictEqual(hasAnyCivilization(), false, 'No civs after clear');
  assert.strictEqual(hasAnyCreatures(), true, 'Still has creatures');

  console.log('  T37  helper predicates work correctly: PASS');
})();

console.log('\n✅ All simulation tests passed!');
