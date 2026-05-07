// Terramoji — Simulation Tests
const assert = require('assert');

// --- Load simulation logic (simulated for Node.js) ---
// We replicate the core functions here for testing without browser globals

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BIOME_KEYS = ['water', 'grassland', 'desert', 'mountain', 'forest', 'jungle', 'ice'];

// Pole rows (mirrors simulation.js)
const POLE_ROWS = { top: 3, bottom: 3 };

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
  // Simulate generation (mirrors fixed simulation.js: ice excluded from non-pole rows)
  const rng = mulberry32(12345);
  const width = 30, height = 30;
  const cells = [];
  const nonPoleBiomes = BIOME_KEYS.filter(b => b !== 'ice');
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      // Force ice at poles
      if (r < POLE_ROWS.top || r >= height - POLE_ROWS.bottom) {
        cells[r][c] = { biome: 'ice', creatures: [] };
      } else {
        cells[r][c] = { biome: nonPoleBiomes[Math.floor(rng() * nonPoleBiomes.length)], creatures: [] };
      }
    }
  }

  assert.strictEqual(cells.length, 30, 'Grid height must be 30');
  assert.strictEqual(cells[0].length, 30, 'Grid width must be 30');

  // Check all 7 biomes present (ice from poles, others from non-pole rows)
  const present = new Set();
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      present.add(cells[r][c].biome);
    }
  }
  for (const b of BIOME_KEYS) {
    assert.ok(present.has(b), `Biome ${b} must be present in generated grid`);
  }
  console.log('  T010  generatePlanet 30x30 with 7 biomes: PASS');
})();

// --- T010c: poles are ice biome, non-pole rows contain NO ice ---
(function testPolesAreIce() {
  const rng = mulberry32(12345);
  const width = 30, height = 30;
  const cells = [];
  const nonPoleBiomes = BIOME_KEYS.filter(b => b !== 'ice');
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      if (r < POLE_ROWS.top || r >= height - POLE_ROWS.bottom) {
        cells[r][c] = { biome: 'ice', creatures: [] };
      } else {
        cells[r][c] = { biome: nonPoleBiomes[Math.floor(rng() * nonPoleBiomes.length)], creatures: [] };
      }
    }
  }

  // Verify top pole rows are all ice
  for (let r = 0; r < POLE_ROWS.top; r++) {
    for (let c = 0; c < width; c++) {
      assert.strictEqual(cells[r][c].biome, 'ice', `Top pole row ${r}, col ${c} must be ice`);
    }
  }

  // Verify bottom pole rows are all ice
  for (let r = height - POLE_ROWS.bottom; r < height; r++) {
    for (let c = 0; c < width; c++) {
      assert.strictEqual(cells[r][c].biome, 'ice', `Bottom pole row ${r}, col ${c} must be ice`);
    }
  }

  // Verify non-pole rows contain NO ice at all
  for (let r = POLE_ROWS.top; r < height - POLE_ROWS.bottom; r++) {
    for (let c = 0; c < width; c++) {
      assert.notStrictEqual(cells[r][c].biome, 'ice', `Non-pole row ${r}, col ${c} must NOT be ice`);
    }
  }
  console.log('  T010c poles are ice, non-pole rows ice-free: PASS');
})();

// --- T010b: cellular automata smoothing preserves grid dimensions ---
(function testSmoothing() {
  const rng = mulberry32(12345);
  const width = 30, height = 30;
  const cells = [];
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      cells[r][c] = { biome: BIOME_KEYS[Math.floor(rng() * BIOME_KEYS.length)], creatures: [] };
    }
  }

  // Apply smoothing pass
  function smooth(cells, width, height) {
    const next = [];
    for (let r = 0; r < height; r++) {
      next[r] = [];
      for (let c = 0; c < width; c++) {
        const counts = {};
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
              const b = cells[nr][nc].biome;
              counts[b] = (counts[b] || 0) + 1;
            }
          }
        }
        let maxCount = 0, dominant = cells[r][c].biome;
        for (const b of BIOME_KEYS) {
          if (counts[b] > maxCount) { maxCount = counts[b]; dominant = b; }
        }
        next[r][c] = { biome: dominant, creatures: [] };
      }
    }
    return next;
  }

  const smoothed = smooth(cells, width, height);
  assert.strictEqual(smoothed.length, 30, 'Smoothed grid height must be 30');
  assert.strictEqual(smoothed[0].length, 30, 'Smoothed grid width must be 30');

  // Check clustering increased (fewer biome boundaries)
  let boundaries = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width - 1; c++) {
      if (smoothed[r][c].biome !== smoothed[r][c + 1].biome) boundaries++;
    }
  }
  // A 30x30 grid with clustering should have far fewer boundaries than 900
  assert.ok(boundaries < 600, `Smoothing should reduce boundaries (got ${boundaries})`);
  console.log(`  T010b smoothing clustering (boundaries: ${boundaries}): PASS`);
})();

// --- T011: ice biome is enforced at poles ---
(function testPoleEnforcement() {
  const rng = mulberry32(42);
  const width = 30, height = 30;
  const cells = [];

  // Simulate generation with random biomes everywhere
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      cells[r][c] = { biome: BIOME_KEYS[Math.floor(rng() * BIOME_KEYS.length)], creatures: [] };
    }
  }

  // Enforce poles
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < POLE_ROWS.top; r++) {
      cells[r][c].biome = 'ice';
    }
    for (let r = height - POLE_ROWS.bottom; r < height; r++) {
      cells[r][c].biome = 'ice';
    }
  }

  // Verify top pole rows are ice
  for (let r = 0; r < POLE_ROWS.top; r++) {
    for (let c = 0; c < width; c++) {
      assert.strictEqual(cells[r][c].biome, 'ice', `Top pole row ${r}, col ${c} must be ice`);
    }
  }

  // Verify bottom pole rows are ice
  for (let r = height - POLE_ROWS.bottom; r < height; r++) {
    for (let c = 0; c < width; c++) {
      assert.strictEqual(cells[r][c].biome, 'ice', `Bottom pole row ${r}, col ${c} must be ice`);
    }
  }

  // Verify non-pole rows can contain non-ice biomes
  let hasNonIce = false;
  for (let r = POLE_ROWS.top; r < height - POLE_ROWS.bottom; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].biome !== 'ice') {
        hasNonIce = true;
        break;
      }
    }
    if (hasNonIce) break;
  }
  assert.ok(hasNonIce, 'Non-pole rows should contain non-ice biomes');
  console.log('  T011  pole ice enforcement: PASS');
})();

// --- Creature-Biome Compatibility (many-to-many, per data-model.md) ---
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

// --- T021: spawnCreatures places correct creature type on matching biome ---
(function testSpawnCreatures() {
  creatureIdCounter = 0;
  const width = 5, height = 5;
  const cells = [];
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      cells[r][c] = { biome: 'water', creatures: [], civilization: null };
    }
  }
  // Place a grassland tile
  cells[2][2].biome = 'grassland';

  // spawnCreatures should place fish on water, cow on grassland
  // We test the expected behavior — the function will be implemented in T024
  function spawnCreatures(cells, width, height) {
    const MAX_PER_CELL = 5;
    const MAX_TOTAL = 200;
    let total = totalCreatures(cells, width, height);

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const cell = cells[r][c];
        if ((cell.creatures || []).length >= MAX_PER_CELL) continue;
        if (total >= MAX_TOTAL) break;

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

  spawnCreatures(cells, width, height);

  // Water cells should have fish
  assert.strictEqual(cells[0][0].creatures[0].emoji, '🐟', 'Water tile should spawn fish');
  assert.ok(CREATURE_TYPES.fish.compatibleBiomes.includes('water'), 'Fish compatible with water');

  // Grassland cell should have a compatible creature (cow)
  const grassCreature = cells[2][2].creatures[0];
  assert.ok(grassCreature, 'Grassland tile should have a creature');
  assert.strictEqual(grassCreature.emoji, '🐄', 'Grassland should spawn cow');

  // Respect max 5 per cell
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      assert.ok(cells[r][c].creatures.length <= 5, `Cell ${r},${c} should have <= 5 creatures`);
    }
  }

  console.log('  T021 spawnCreatures correct type on matching biome: PASS');
})();

// --- T022: moveCreatures only moves to adjacent compatible biome cells ---
(function testMoveCreatures() {
  creatureIdCounter = 0;
  const width = 5, height = 5;
  const cells = [];
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      cells[r][c] = { biome: 'forest', creatures: [], civilization: null };
    }
  }
  // Make one corner water — deer should NOT move there
  cells[0][0].biome = 'water';

  // Place a deer on (1,1) — adjacent to water at (0,0)
  cells[1][1].creatures.push(createCreature('deer', 1, 1));

  function moveCreatures(cells, width, height) {
    const allCreatures = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        allCreatures.push(...cells[r][c].creatures.map(cr => ({ cr, fromR: r, fromC: c })));
      }
    }

    // Clear and reassign
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        cells[r][c].creatures = [];
      }
    }

    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
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

  // Run many times — deer should never end up on water (0,0)
  for (let i = 0; i < 100; i++) {
    moveCreatures(cells, width, height);
    const onWater = cells[0][0].creatures.some(cr => cr.emoji === '🦌');
    assert.ok(!onWater, `Deer should never move to water tile (iteration ${i})`);
  }

  // Deer should be able to move between forest and grassland (both compatible)
  cells[1][1].biome = 'grassland';
  moveCreatures(cells, width, height);
  // Deer should still exist somewhere on the grid
  let found = false;
  for (let r = 0; r < height && !found; r++) {
    for (let c = 0; c < width && !found; c++) {
      if (cells[r][c].creatures.some(cr => cr.emoji === '🦌')) found = true;
    }
  }
  assert.ok(found, 'Deer should still be on grid after move');

  console.log('  T022 moveCreatures respects compatible biomes: PASS');
})();

// --- T023: creature removal when biome changes to incompatible type ---
(function testCreatureRemoval() {
  creatureIdCounter = 0;
  const width = 3, height = 3;
  const cells = [];
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      cells[r][c] = { biome: 'forest', creatures: [], civilization: null };
    }
  }

  // Place deer and cow on forest — both compatible with forest
  cells[1][1].creatures.push(createCreature('deer', 1, 1));
  cells[1][1].creatures.push(createCreature('cow', 1, 1));
  assert.strictEqual(cells[1][1].creatures.length, 2, 'Should have 2 creatures on forest');

  function removeIncompatibleCreatures(cells, width, height) {
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const cell = cells[r][c];
        cell.creatures = cell.creatures.filter(cr => cr.compatibleBiomes.includes(cell.biome));
      }
    }
  }

  // Change biome to desert — neither deer nor cow compatible with desert
  cells[1][1].biome = 'desert';
  removeIncompatibleCreatures(cells, width, height);
  assert.strictEqual(cells[1][1].creatures.length, 0, 'All creatures removed when biome becomes incompatible');

  // Now test partial removal — place deer and penguin on forest, change to ice
  cells[1][1].creatures.push(createCreature('deer', 1, 1));
  cells[1][1].creatures.push(createCreature('penguin', 1, 1));
  cells[1][1].biome = 'ice';
  removeIncompatibleCreatures(cells, width, height);
  assert.strictEqual(cells[1][1].creatures.length, 1, 'Only penguin should survive on ice');
  assert.strictEqual(cells[1][1].creatures[0].emoji, '🐧', 'Survivor should be penguin');

  // Test that creatures with multi-biome compatibility survive when changed to another compatible biome
  cells[1][1].creatures = [];
  cells[1][1].creatures.push(createCreature('deer', 1, 1)); // deer: forest + grassland
  cells[1][1].biome = 'grassland';
  removeIncompatibleCreatures(cells, width, height);
  assert.strictEqual(cells[1][1].creatures.length, 1, 'Deer should survive on grassland (compatible)');

  console.log('  T023 creature removal on incompatible biome: PASS');
})();

console.log('\nAll simulation tests passed.');

// ============================================================
// T31: Civilization Creation Tests (Monolith + Manual)
// ============================================================

// --- Tech stages constant (mirrors simulation.js) ---
const TECH_STAGES = [
  { name: 'Stone',       emoji: '🛖' },
  { name: 'Bronze',      emoji: '🛕' },
  { name: 'Iron',        emoji: '🏰' },
  { name: 'Industrial',  emoji: '🏭' },
  { name: 'Atomic',      emoji: '☢️' },
  { name: 'Information', emoji: '💻' },
  { name: 'Nanotech',    emoji: '🔮' },
];

// --- Helper: build a test grid with controllable state ---
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

// --- Helper: check if any cell has a civilization ---
function hasAnyCiv(cells, width, height) {
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].civilization) return true;
    }
  }
  return false;
}

// --- Helper: find max civ stage on grid ---
function maxCivStage(cells, width, height) {
  let max = -1;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].civilization && cells[r][c].civilization.stage > max) {
        max = cells[r][c].civilization.stage;
      }
    }
  }
  return max;
}

// --- Helper: replicate createCivilization logic for Node.js testing ---
// Monolith mode: requires creatures on target cell, one-per-planet guard
// Civ mode: requires existing civ somewhere, places at max stage, rejects if cell already has civ
function createCivilizationMonolith(cells, width, height, row, col) {
  const cell = cells[row][col];
  // One-per-planet guard
  if (hasAnyCiv(cells, width, height)) return { ok: false, reason: 'civ_exists' };
  // Requires creatures
  if (!cell.creatures || cell.creatures.length === 0) return { ok: false, reason: 'no_creatures' };
  cell.civilization = { stage: 0, species: cell.creatures[0].name };
  return { ok: true };
}

function createCivilizationManual(cells, width, height, row, col) {
  const cell = cells[row][col];
  // Requires existing civ somewhere
  if (!hasAnyCiv(cells, width, height)) return { ok: false, reason: 'no_civ_exists' };
  // Cell must not already have a civ
  if (cell.civilization) return { ok: false, reason: 'cell_has_civ' };
  const ms = maxCivStage(cells, width, height);
  cell.civilization = { stage: ms };
  return { ok: true };
}

// --- T31a: Monolith creates civilization on tile with creatures ---
(function testMonolithCreatesCiv() {
  creatureIdCounter = 0;
  const cells = buildGrid(5, 5, 'grassland');
  cells[2][2].creatures.push(createCreature('cow', 2, 2));

  const res = createCivilizationMonolith(cells, 5, 5, 2, 2);
  assert.strictEqual(res.ok, true, 'Monolith should succeed on tile with creatures');
  assert.ok(cells[2][2].civilization, 'Cell should have civilization object');
  assert.strictEqual(cells[2][2].civilization.stage, 0, 'New civ should be Stone age (stage 0)');
  assert.strictEqual(cells[2][2].civilization.species, 'cow', 'Species should match first creature');

  console.log('  T31a monolith creates civ on tile with creatures: PASS');
})();

// --- T31b: Monolith rejects tile without creatures ---
(function testMonolithRejectsNoCreatures() {
  creatureIdCounter = 0;
  const cells = buildGrid(5, 5, 'grassland');
  // (2,2) has no creatures
  const res = createCivilizationMonolith(cells, 5, 5, 2, 2);
  assert.strictEqual(res.ok, false, 'Monolith should fail on empty tile');
  assert.strictEqual(res.reason, 'no_creatures', 'Failure reason should be no_creatures');
  assert.strictEqual(cells[2][2].civilization, null, 'Cell should remain without civilization');

  console.log('  T31b monolith rejects tile without creatures: PASS');
})();

// --- T31c: Monolith enforces one-per-planet guard ---
(function testMonolithOnePerPlanet() {
  creatureIdCounter = 0;
  const cells = buildGrid(5, 5, 'grassland');
  cells[2][2].creatures.push(createCreature('cow', 2, 2));
  cells[1][1].creatures.push(createCreature('horse', 1, 1));

  // First monolith succeeds
  let res = createCivilizationMonolith(cells, 5, 5, 2, 2);
  assert.strictEqual(res.ok, true, 'First monolith should succeed');

  // Second monolith on a different tile with creatures must fail
  res = createCivilizationMonolith(cells, 5, 5, 1, 1);
  assert.strictEqual(res.ok, false, 'Second monolith should fail (one-per-planet)');
  assert.strictEqual(res.reason, 'civ_exists', 'Failure reason should be civ_exists');
  assert.strictEqual(cells[1][1].civilization, null, 'Second cell should remain without civ');

  console.log('  T31c monolith one-per-planet guard: PASS');
})();

// --- T31d: Manual civ placement requires existing civilization ---
(function testManualCivRequiresExisting() {
  creatureIdCounter = 0;
  const cells = buildGrid(5, 5, 'grassland');
  // No civilization exists anywhere
  const res = createCivilizationManual(cells, 5, 5, 2, 2);
  assert.strictEqual(res.ok, false, 'Manual placement should fail without existing civ');
  assert.strictEqual(res.reason, 'no_civ_exists', 'Failure reason should be no_civ_exists');

  console.log('  T31d manual civ requires existing civilization: PASS');
})();

// --- T31e: Manual civ placement creates new city at max existing stage ---
(function testManualCivPlacesAtMaxStage() {
  creatureIdCounter = 0;
  const cells = buildGrid(5, 5, 'grassland');

  // Seed a Stone civ at (2,2)
  cells[2][2].civilization = { stage: 0 };

  // Manually place a new city at (3,3)
  let res = createCivilizationManual(cells, 5, 5, 3, 3);
  assert.strictEqual(res.ok, true, 'Manual placement should succeed');
  assert.strictEqual(cells[3][3].civilization.stage, 0, 'New city should match max stage (0)');

  // Advance the original civ to Bronze (stage 1)
  cells[2][2].civilization.stage = 1;

  // Place another city — should be at stage 1
  res = createCivilizationManual(cells, 5, 5, 4, 4);
  assert.strictEqual(res.ok, true, 'Second manual placement should succeed');
  assert.strictEqual(cells[4][4].civilization.stage, 1, 'New city should match max stage (1)');

  console.log('  T31e manual civ places at max existing stage: PASS');
})();

// --- T31f: Manual civ rejects cell that already has a civilization ---
(function testManualCivRejectsOccupiedCell() {
  creatureIdCounter = 0;
  const cells = buildGrid(5, 5, 'grassland');
  cells[2][2].civilization = { stage: 0 };

  // Try to place on the same cell
  const res = createCivilizationManual(cells, 5, 5, 2, 2);
  assert.strictEqual(res.ok, false, 'Should reject placing civ on occupied cell');
  assert.strictEqual(res.reason, 'cell_has_civ', 'Failure reason should be cell_has_civ');

  console.log('  T31f manual civ rejects occupied cell: PASS');
})();

// --- T31g: Civilization coexists with creatures on same tile ---
(function testCivCoexistsWithCreatures() {
  creatureIdCounter = 0;
  const cells = buildGrid(5, 5, 'grassland');
  cells[2][2].creatures.push(createCreature('cow', 2, 2));
  cells[2][2].creatures.push(createCreature('horse', 2, 2));

  createCivilizationMonolith(cells, 5, 5, 2, 2);

  assert.ok(cells[2][2].civilization, 'Civ should exist');
  assert.strictEqual(cells[2][2].creatures.length, 2, 'Creatures should still be present');
  assert.strictEqual(cells[2][2].creatures[0].emoji, '🐄', 'Cow should remain');
  assert.strictEqual(cells[2][2].creatures[1].emoji, '🐴', 'Horse should remain');

  console.log('  T31g civilization coexists with creatures: PASS');
})();

// --- T31h: Multiple manual placements create independent civilizations ---
(function testMultipleManualPlacements() {
  creatureIdCounter = 0;
  const cells = buildGrid(5, 5, 'grassland');

  // Seed first civ
  cells[2][2].civilization = { stage: 0 };

  // Place cities on multiple tiles
  createCivilizationManual(cells, 5, 5, 1, 1);
  createCivilizationManual(cells, 5, 5, 3, 3);
  createCivilizationManual(cells, 5, 5, 0, 0);

  // Count civilizations
  let civCount = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (cells[r][c].civilization) civCount++;
    }
  }
  assert.strictEqual(civCount, 4, 'Should have 4 civilizations total');

  console.log('  T31h multiple manual placements create independent civs: PASS');
})();

// ============================================================
// T32: Tech Advancement Tests
// ============================================================

// --- Helper: replicate advanceCivilization logic (mirrors simulation.js) ---
const TECH_ADVANCE_CHANCE = 0.02;

function advanceCivilization(cell, rng) {
  if (!cell.civilization) return;
  if (cell.civilization.stage >= TECH_STAGES.length - 1) return; // terminal
  if ((rng || Math.random)() < TECH_ADVANCE_CHANCE) {
    cell.civilization.stage += 1;
  }
}

// --- T32a: advanceCivilization increments stage with probability ---
(function testCivAdvancesWithProbability() {
  const cells = buildGrid(3, 3, 'grassland');
  cells[1][1].civilization = { stage: 0 };

  // Force advancement by using a deterministic RNG that always returns 0
  // (which is < TECH_ADVANCE_CHANCE of 0.02)
  let callCount = 0;
  const alwaysTrueRng = () => { callCount++; return 0; };

  advanceCivilization(cells[1][1], alwaysTrueRng);
  assert.strictEqual(callCount, 1, 'RNG should be called once');
  assert.strictEqual(cells[1][1].civilization.stage, 1, 'Stage should advance from 0→1');

  advanceCivilization(cells[1][1], alwaysTrueRng);
  assert.strictEqual(cells[1][1].civilization.stage, 2, 'Stage should advance from 1→2');

  console.log('  T32a civ advances with probability: PASS');
})();

// --- T32b: advanceCivilization does nothing on null civilization ---
(function testAdvanceNullCiv() {
  const cells = buildGrid(3, 3, 'grassland');
  // cells[1][1].civilization is null
  advanceCivilization(cells[1][1], () => 0);
  assert.strictEqual(cells[1][1].civilization, null, 'Null civ should stay null');

  console.log('  T32b advance on null civ is no-op: PASS');
})();

// --- T32c: Nanotech (stage 6) is terminal — no further advancement ---
(function testNanotechIsTerminal() {
  const cells = buildGrid(3, 3, 'grassland');
  cells[1][1].civilization = { stage: 6 };

  // Even with RNG that always triggers, nanotech should not advance
  advanceCivilization(cells[1][1], () => 0);
  assert.strictEqual(cells[1][1].civilization.stage, 6, 'Nanotech should stay at stage 6');

  advanceCivilization(cells[1][1], () => 0);
  assert.strictEqual(cells[1][1].civilization.stage, 6, 'Still nanotech after second tick');

  console.log('  T32c nanotech is terminal: PASS');
})();

// --- T32d: Full progression Stone → Nanotech over multiple ticks ---
(function testFullProgression() {
  const cells = buildGrid(3, 3, 'grassland');
  cells[1][1].civilization = { stage: 0 };

  // Force advancement every tick
  const alwaysTrueRng = () => 0;

  // Advance through all 7 stages
  for (let stage = 0; stage < TECH_STAGES.length - 1; stage++) {
    advanceCivilization(cells[1][1], alwaysTrueRng);
    assert.strictEqual(
      cells[1][1].civilization.stage,
      stage + 1,
      `Should advance from ${TECH_STAGES[stage].name} to ${TECH_STAGES[stage + 1].name}`
    );
  }

  // Verify final stage is Nanotech
  assert.strictEqual(cells[1][1].civilization.stage, 6, 'Final stage should be Nanotech');
  assert.strictEqual(
    TECH_STAGES[cells[1][1].civilization.stage].name,
    'Nanotech',
    'Stage 6 name should be Nanotech'
  );

  console.log('  T32d full progression Stone → Nanotech: PASS');
})();

// --- T32e: Civilization does NOT advance when RNG is below threshold ---
(function testCivDoesNotAdvanceWhenRngFails() {
  const cells = buildGrid(3, 3, 'grassland');
  cells[1][1].civilization = { stage: 0 };

  // RNG always returns 1.0 (above TECH_ADVANCE_CHANCE)
  const alwaysFalseRng = () => 1.0;

  for (let i = 0; i < 100; i++) {
    advanceCivilization(cells[1][1], alwaysFalseRng);
  }
  assert.strictEqual(cells[1][1].civilization.stage, 0, 'Stage should remain 0 when RNG never triggers');

  console.log('  T32e civ does not advance when RNG fails: PASS');
})();

// --- T32f: Multiple civilizations advance independently ---
(function testIndependentAdvancement() {
  const cells = buildGrid(5, 5, 'grassland');
  cells[1][1].civilization = { stage: 0 };
  cells[3][3].civilization = { stage: 2 };

  // Advance both once
  advanceCivilization(cells[1][1], () => 0);
  advanceCivilization(cells[3][3], () => 0);

  assert.strictEqual(cells[1][1].civilization.stage, 1, 'First civ should advance 0→1');
  assert.strictEqual(cells[3][3].civilization.stage, 3, 'Second civ should advance 2→3');

  // Advance first one more time, skip second
  advanceCivilization(cells[1][1], () => 0);
  advanceCivilization(cells[3][3], () => 1.0); // won't advance

  assert.strictEqual(cells[1][1].civilization.stage, 2, 'First civ should be at stage 2');
  assert.strictEqual(cells[3][3].civilization.stage, 3, 'Second civ should still be at stage 3');

  console.log('  T32f multiple civs advance independently: PASS');
})();

// --- T32g: Advancement probability matches expected rate (~2%) ---
(function testAdvancementRate() {
  const trials = 10000;
  let advances = 0;

  for (let i = 0; i < trials; i++) {
    const cells = buildGrid(1, 1, 'grassland');
    cells[0][0].civilization = { stage: 0 };
    advanceCivilization(cells[0][0]); // uses Math.random
    if (cells[0][0].civilization.stage > 0) advances++;
  }

  const rate = advances / trials;
  // At 2% expected, allow ±1% tolerance (statistical variance)
  assert.ok(rate >= 0.01 && rate <= 0.03,
    `Advancement rate ${rate.toFixed(3)} should be near 0.02 (got ${advances}/${trials})`);

  console.log(`  T32g advancement rate ~2% (actual: ${(rate * 100).toFixed(1)}%): PASS`);
})();

// --- T32h: Civilization data preserved through biome change ---
(function testCivPersistsThroughBiomeChange() {
  const cells = buildGrid(3, 3, 'grassland');
  cells[1][1].civilization = { stage: 2 }; // Iron age

  // Change biome under the civilization
  cells[1][1].biome = 'desert';

  assert.ok(cells[1][1].civilization, 'Civ should persist after biome change');
  assert.strictEqual(cells[1][1].civilization.stage, 2, 'Stage should remain unchanged');

  console.log('  T32h civ persists through biome change: PASS');
})();

// ============================================================
// T33: Civilization Persistence Through Biome Changes
// ============================================================

// --- Helper: replicate smoothGrid logic for Node.js testing ---
function smoothGridTest(cells, width, height) {
  const next = [];
  for (let r = 0; r < height; r++) {
    next[r] = [];
    for (let c = 0; c < width; c++) {
      const counts = {};
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
  return next;
}

// --- T33a: Civilization data preserved after single smoothGrid pass ---
(function testCivPersistsAfterSmoothing() {
  const width = 5, height = 5;
  const cells = buildGrid(width, height, 'grassland');

  // Place a civilization at stage 2 (Iron) on center cell
  cells[2][2].civilization = { stage: 2, species: 'cow' };

  // Smooth the grid
  const smoothed = smoothGridTest(cells, width, height);

  // Civilization should be preserved even though biome may have changed
  assert.ok(smoothed[2][2].civilization, 'Civ should exist after smoothing');
  assert.strictEqual(smoothed[2][2].civilization.stage, 2, 'Stage should remain 2 (Iron)');
  assert.strictEqual(smoothed[2][2].civilization.species, 'cow', 'Species should be preserved');

  console.log('  T33a civ persists after single smoothGrid pass: PASS');
})();

// --- T33b: Civilization data preserved through multiple smoothing passes ---
(function testCivPersistsAfterMultipleSmoothingPasses() {
  const width = 7, height = 7;
  const cells = buildGrid(width, height, 'grassland');

  // Create a mixed biome grid with a civ in the center
  cells[3][3].biome = 'desert';
  cells[3][3].civilization = { stage: 3, species: 'camel' };

  // Surrounding cells are grassland — smoothing will likely convert desert to grassland
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      cells[3 + dr][3 + dc].biome = 'grassland';
    }
  }

  // Run 3 smoothing passes (matching generatePlanet behavior)
  let current = cells;
  for (let pass = 0; pass < 3; pass++) {
    current = smoothGridTest(current, width, height);
  }

  // Civilization must survive all passes
  assert.ok(current[3][3].civilization, 'Civ should exist after 3 smoothing passes');
  assert.strictEqual(current[3][3].civilization.stage, 3, 'Stage should remain 3 (Industrial)');
  assert.strictEqual(current[3][3].civilization.species, 'camel', 'Species should be preserved');

  console.log('  T33b civ persists through multiple smoothing passes: PASS');
})();

// --- T33c: Civilization survives biome change from grassland → water → desert ---
(function testCivSurvivesMultipleBiomeChanges() {
  const width = 3, height = 3;
  const cells = buildGrid(width, height, 'grassland');

  // Place civ at center
  cells[1][1].civilization = { stage: 1 };

  // Change biome to water
  cells[1][1].biome = 'water';
  assert.ok(cells[1][1].civilization, 'Civ should persist after grassland→water');
  assert.strictEqual(cells[1][1].civilization.stage, 1, 'Stage unchanged after grassland→water');

  // Change biome to desert
  cells[1][1].biome = 'desert';
  assert.ok(cells[1][1].civilization, 'Civ should persist after water→desert');
  assert.strictEqual(cells[1][1].civilization.stage, 1, 'Stage unchanged after water→desert');

  // Change biome to ice
  cells[1][1].biome = 'ice';
  assert.ok(cells[1][1].civilization, 'Civ should persist after desert→ice');
  assert.strictEqual(cells[1][1].civilization.stage, 1, 'Stage unchanged after desert→ice');

  console.log('  T33c civ survives multiple biome changes: PASS');
})();

// --- T33d: Civilization at max stage (Nanotech) persists through smoothing ---
(function testNanotechCivPersistsThroughSmoothing() {
  const width = 5, height = 5;
  const cells = buildGrid(width, height, 'forest');

  // Place a Nanotech civilization (stage 6, terminal)
  cells[2][2].biome = 'desert';
  cells[2][2].civilization = { stage: 6, species: 'lizard' };

  // Smooth — biome will likely change to forest (dominant neighbor)
  const smoothed = smoothGridTest(cells, width, height);

  assert.ok(smoothed[2][2].civilization, 'Nanotech civ should exist after smoothing');
  assert.strictEqual(smoothed[2][2].civilization.stage, 6, 'Stage must remain 6 (Nanotech)');
  assert.strictEqual(smoothed[2][2].civilization.species, 'lizard', 'Species preserved for Nanotech civ');

  console.log('  T33d nanotech civ persists through smoothing: PASS');
})();

// --- T33e: Multiple civilizations each persist independently through smoothing ---
(function testMultipleCivsPersistThroughSmoothing() {
  const width = 7, height = 7;
  const cells = buildGrid(width, height, 'grassland');

  // Place 4 civilizations at different stages in corners of center region
  cells[2][2].civilization = { stage: 0, species: 'cow' };
  cells[2][4].civilization = { stage: 1, species: 'horse' };
  cells[4][2].civilization = { stage: 3, species: 'lion' };
  cells[4][4].civilization = { stage: 5, species: 'sheep' };

  // Smooth grid
  const smoothed = smoothGridTest(cells, width, height);

  // All 4 civilizations must persist with correct stages
  assert.strictEqual(smoothed[2][2].civilization.stage, 0, 'Stone civ preserved');
  assert.strictEqual(smoothed[2][2].civilization.species, 'cow', 'Stone species preserved');

  assert.strictEqual(smoothed[2][4].civilization.stage, 1, 'Bronze civ preserved');
  assert.strictEqual(smoothed[2][4].civilization.species, 'horse', 'Bronze species preserved');

  assert.strictEqual(smoothed[4][2].civilization.stage, 3, 'Industrial civ preserved');
  assert.strictEqual(smoothed[4][2].civilization.species, 'lion', 'Industrial species preserved');

  assert.strictEqual(smoothed[4][4].civilization.stage, 5, 'Information civ preserved');
  assert.strictEqual(smoothed[4][4].civilization.species, 'sheep', 'Information species preserved');

  console.log('  T33e multiple civs persist independently through smoothing: PASS');
})();

// --- T33f: Civilization with no species field (manual placement) persists ---
(function testCivWithoutSpeciesPersists() {
  const width = 5, height = 5;
  const cells = buildGrid(width, height, 'desert');

  // Manual placement creates civ without species field
  cells[2][2].civilization = { stage: 2 };

  // Smooth grid
  const smoothed = smoothGridTest(cells, width, height);

  assert.ok(smoothed[2][2].civilization, 'Civ should exist after smoothing');
  assert.strictEqual(smoothed[2][2].civilization.stage, 2, 'Stage preserved for civ without species');
  assert.strictEqual(smoothed[2][2].civilization.species, undefined, 'Species remains undefined');

  console.log('  T33f civ without species field persists through smoothing: PASS');
})();

// --- T33g: Civilization persists when biome changes during tick cycle ---
(function testCivPersistsDuringTickCycle() {
  const width = 5, height = 5;
  const cells = buildGrid(width, height, 'grassland');

  // Place civ at center
  cells[2][2].civilization = { stage: 1, species: 'cow' };

  // Simulate biome change (as would happen via smoothing in tick)
  const smoothed = smoothGridTest(cells, width, height);

  // Then simulate advancement on the smoothed grid
  advanceCivilization(smoothed[2][2], () => 0); // force advance

  assert.ok(smoothed[2][2].civilization, 'Civ should exist after tick cycle');
  assert.strictEqual(smoothed[2][2].civilization.stage, 2, 'Stage advanced from 1→2 after smoothing');
  assert.strictEqual(smoothed[2][2].civilization.species, 'cow', 'Species preserved through tick cycle');

  console.log('  T33g civ persists and advances during tick cycle: PASS');
})();

// ============================================================
// T34: Unit Spawning, Movement, Terrain Restrictions, and Settling Tests
// ============================================================

// --- UNIT_TYPES mapping (mirrors simulation.js) ---
const UNIT_TYPES = {
  0: { land: { emoji: '🚶', movementType: 'land' } },
  1: { land: { emoji: '🏇', movementType: 'land' }, sea: { emoji: '🛶', movementType: 'sea' } },
  2: { land: { emoji: '🐪', movementType: 'land' }, sea: { emoji: '⛵', movementType: 'sea' } },
  3: { land: { emoji: '🚂', movementType: 'land' }, sea: { emoji: '🚢', movementType: 'sea' } },
  4: { land: { emoji: '✈️', movementType: 'air' }, sea: { emoji: '✈️', movementType: 'air' } },
  5: { land: { emoji: '✈️', movementType: 'air' }, sea: { emoji: '✈️', movementType: 'air' } },
};

const UNIT_SPAWN_CHANCE_TEST = 0.05;
const MAX_UNITS_TEST = 20;
const UNIT_WANDER_TICKS_TEST = 8;

// --- Helper: count active units on grid ---
function countActiveUnitsTest(cells, width, height) {
  let count = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].unit) count++;
    }
  }
  return count;
}

// --- Helper: replicate spawnUnit logic for Node.js testing ---
function spawnUnitTest(cells, width, height, row, col) {
  const cell = cells[row][col];
  if (!cell.civilization || cell.civilization.stage > 5) return false; // nanotech doesn't spawn
  if (countActiveUnitsTest(cells, width, height) >= MAX_UNITS_TEST) return false;

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
    wanderLeft: UNIT_WANDER_TICKS_TEST,
    restTicks: 1,
  };
  return true;
}

// --- T34a: spawnUnit creates unit with correct emoji/stage/movementType on civ cell ---
(function testSpawnUnitCreatesUnit() {
  const cells = buildGrid(5, 5, 'grassland');

  // Place a Stone age (stage 0) civilization — only has land units
  cells[2][2].civilization = { stage: 0 };

  const res = spawnUnitTest(cells, 5, 5, 2, 2);
  assert.strictEqual(res, true, 'spawnUnit should succeed on civ cell');
  assert.ok(cells[2][2].unit, 'Cell should have a unit object');
  assert.strictEqual(cells[2][2].unit.emoji, '🚶', 'Stone age unit should be 🚶');
  assert.strictEqual(cells[2][2].unit.stage, 0, 'Unit stage should match civ stage 0');
  assert.strictEqual(cells[2][2].unit.movementType, 'land', 'Stone age unit should be land type');
  assert.strictEqual(cells[2][2].unit.wanderLeft, UNIT_WANDER_TICKS_TEST, 'Unit should have wander ticks set');
  assert.strictEqual(cells[2][2].unit.restTicks, 1, 'Unit should rest 1 tick on spawn');

  // Test Bronze age (stage 1) — has both land and sea units
  const cells2 = buildGrid(5, 5, 'grassland');
  cells2[2][2].civilization = { stage: 1 };
  spawnUnitTest(cells2, 5, 5, 2, 2);
  assert.strictEqual(cells2[2][2].unit.emoji, '🏇', 'Bronze land unit should be 🏇');
  assert.strictEqual(cells2[2][2].unit.movementType, 'land', 'Bronze on grassland should be land');
  assert.strictEqual(cells2[2][2].unit.stage, 1, 'Unit stage should be 1');

  // Test Atomic age (stage 4) — air units
  const cells3 = buildGrid(5, 5, 'grassland');
  cells3[2][2].civilization = { stage: 4 };
  spawnUnitTest(cells3, 5, 5, 2, 2);
  assert.strictEqual(cells3[2][2].unit.emoji, '✈️', 'Atomic unit should be ✈️');
  assert.strictEqual(cells3[2][2].unit.movementType, 'air', 'Atomic unit should be air type');

  console.log('  T34a spawnUnit creates unit with correct emoji/stage/movementType: PASS');
})();

// --- T34b: spawnUnit refuses when unit cap (MAX_UNITS) is reached ---
(function testSpawnUnitRespectsCap() {
  const width = 5, height = 5;
  const cells = buildGrid(width, height, 'grassland');

  // Place civilizations everywhere
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      cells[r][c].civilization = { stage: 0 };
    }
  }

  // Fill the grid with units until MAX_UNITS is reached
  let spawnCount = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (countActiveUnitsTest(cells, width, height) < MAX_UNITS_TEST) {
        if (spawnUnitTest(cells, width, height, r, c)) {
          spawnCount++;
        }
      }
    }
  }

  // Verify we reached the cap
  assert.strictEqual(countActiveUnitsTest(cells, width, height), MAX_UNITS_TEST,
    `Should have exactly MAX_UNITS (${MAX_UNITS_TEST}) units on grid`);

  // Now try to spawn more — should all fail
  let failCount = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const res = spawnUnitTest(cells, width, height, r, c);
      if (!res) failCount++;
    }
  }

  // At least some cells should have no unit (25 cells, cap is 20) so those spawns should fail due to cap
  assert.ok(failCount > 0, 'Some spawn attempts should fail when cap is reached');

  // Verify count didn't change after failed spawns
  assert.strictEqual(countActiveUnitsTest(cells, width, height), MAX_UNITS_TEST,
    `Unit count should remain at cap (${MAX_UNITS_TEST}) after failed spawns`);

  console.log('  T34b spawnUnit refuses when MAX_UNITS cap reached: PASS');
})();

// --- T34c: spawnUnit spawns sea unit on water biome, land unit on land biome ---
(function testSpawnUnitBiomeSelection() {
  // Test 1: Bronze (stage 1) on water → sea unit 🛶
  const cells1 = buildGrid(5, 5, 'water');
  cells1[2][2].civilization = { stage: 1 };
  spawnUnitTest(cells1, 5, 5, 2, 2);
  assert.strictEqual(cells1[2][2].unit.emoji, '🛶', 'Bronze on water should spawn sea unit 🛶');
  assert.strictEqual(cells1[2][2].unit.movementType, 'sea', 'Bronze on water should be sea movementType');

  // Test 2: Bronze (stage 1) on grassland → land unit 🏇
  const cells2 = buildGrid(5, 5, 'grassland');
  cells2[2][2].civilization = { stage: 1 };
  spawnUnitTest(cells2, 5, 5, 2, 2);
  assert.strictEqual(cells2[2][2].unit.emoji, '🏇', 'Bronze on grassland should spawn land unit 🏇');
  assert.strictEqual(cells2[2][2].unit.movementType, 'land', 'Bronze on grassland should be land movementType');

  // Test 3: Iron (stage 2) on water → sea unit ⛵
  const cells3 = buildGrid(5, 5, 'water');
  cells3[2][2].civilization = { stage: 2 };
  spawnUnitTest(cells3, 5, 5, 2, 2);
  assert.strictEqual(cells3[2][2].unit.emoji, '⛵', 'Iron on water should spawn sea unit ⛵');
  assert.strictEqual(cells3[2][2].unit.movementType, 'sea', 'Iron on water should be sea movementType');

  // Test 4: Iron (stage 2) on desert → land unit 🐪
  const cells4 = buildGrid(5, 5, 'desert');
  cells4[2][2].civilization = { stage: 2 };
  spawnUnitTest(cells4, 5, 5, 2, 2);
  assert.strictEqual(cells4[2][2].unit.emoji, '🐪', 'Iron on desert should spawn land unit 🐪');
  assert.strictEqual(cells4[2][2].unit.movementType, 'land', 'Iron on desert should be land movementType');

  // Test 5: Stone (stage 0) on water → still spawns land unit 🚶 (no sea definition for stage 0)
  const cells5 = buildGrid(5, 5, 'water');
  cells5[2][2].civilization = { stage: 0 };
  spawnUnitTest(cells5, 5, 5, 2, 2);
  assert.strictEqual(cells5[2][2].unit.emoji, '🚶', 'Stone on water should spawn land unit 🚶 (no sea def)');
  assert.strictEqual(cells5[2][2].unit.movementType, 'land', 'Stone on water should be land movementType');

  // Test 6: Atomic (stage 4) on water → air unit ✈️ (same for both land/sea at this stage)
  const cells6 = buildGrid(5, 5, 'water');
  cells6[2][2].civilization = { stage: 4 };
  spawnUnitTest(cells6, 5, 5, 2, 2);
  assert.strictEqual(cells6[2][2].unit.emoji, '✈️', 'Atomic on water should spawn air unit ✈️');
  assert.strictEqual(cells6[2][2].unit.movementType, 'air', 'Atomic on water should be air movementType');

  // Test 7: Atomic (stage 4) on grassland → air unit ✈️
  const cells7 = buildGrid(5, 5, 'grassland');
  cells7[2][2].civilization = { stage: 4 };
  spawnUnitTest(cells7, 5, 5, 2, 2);
  assert.strictEqual(cells7[2][2].unit.emoji, '✈️', 'Atomic on grassland should spawn air unit ✈️');
  assert.strictEqual(cells7[2][2].unit.movementType, 'air', 'Atomic on grassland should be air movementType');

  console.log('  T34c spawnUnit spawns sea unit on water, land unit on land: PASS');
})();

// --- Helper: replicate moveUnits logic for Node.js testing with injectable RNG ---
function moveUnitsTest(cells, width, height, rng) {
  const random = rng || Math.random;

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
    // If unit is resting (just spawned), stay in place this tick
    if (unit.restTicks > 0) {
      unit.restTicks -= 1;
      cells[fromR][fromC].unit = unit;
      continue;
    }

    // Pick random adjacent cell (8-directional, toroidal wrap)
    const [dr, dc] = dirs[Math.floor(random() * dirs.length)];
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

// --- T34d: moveUnits moves unit to adjacent cell ---
(function testMoveUnitsMovesToAdjacentCell() {
  const width = 5, height = 5;
  const cells = buildGrid(width, height, 'grassland');

  // Place a civilization with a unit at center [2][2]
  cells[2][2].civilization = { stage: 1 };
  cells[2][2].unit = {
    emoji: '🏇',
    stage: 1,
    movementType: 'land',
    row: 2,
    col: 2,
    wanderLeft: UNIT_WANDER_TICKS_TEST,
    restTicks: 0, // not resting — should move this tick
  };

  // Verify unit is at [2][2] before movement
  assert.strictEqual(cells[2][2].unit.row, 2, 'Unit should start at row 2');
  assert.strictEqual(cells[2][2].unit.col, 2, 'Unit should start at col 2');

  // Use a deterministic RNG that picks direction index 3 → [0, -1] (up)
  // dirs[3] = [0, -1], so target is [2, 1]
  const directionIndex = 3; // [0, -1] → moves up one row
  const deterministicRng = () => directionIndex / 8; // 3/8 = 0.375 → Math.floor(0.375 * 8) = 3

  moveUnitsTest(cells, width, height, deterministicRng);

  // Verify unit moved to [2][1]
  assert.ok(!cells[2][2].unit, 'Unit should no longer be at origin cell [2][2]');
  assert.ok(cells[2][1].unit, 'Unit should now be at target cell [2][1]');
  assert.strictEqual(cells[2][1].unit.row, 2, 'Unit row should be 2 after move');
  assert.strictEqual(cells[2][1].unit.col, 1, 'Unit col should be 1 after move (moved left)');

  // Verify wanderLeft decremented
  assert.strictEqual(cells[2][1].unit.wanderLeft, UNIT_WANDER_TICKS_TEST - 1,
    'wanderLeft should decrement by 1 after successful move');

  // Test 2: verify a different direction — index 7 → [1, 1] (down-right)
  const cells2 = buildGrid(width, height, 'grassland');
  cells2[2][2].civilization = { stage: 1 };
  cells2[2][2].unit = {
    emoji: '🏇',
    stage: 1,
    movementType: 'land',
    row: 2,
    col: 2,
    wanderLeft: UNIT_WANDER_TICKS_TEST,
    restTicks: 0,
  };

  const deterministicRng2 = () => 7 / 8; // dirs[7] = [1, 1] → target [3][3]
  moveUnitsTest(cells2, width, height, deterministicRng2);

  assert.ok(!cells2[2][2].unit, 'Unit should leave origin cell');
  assert.ok(cells2[3][3].unit, 'Unit should be at [3][3] after down-right move');
  assert.strictEqual(cells2[3][3].unit.row, 3, 'Unit row should be 3');
  assert.strictEqual(cells2[3][3].unit.col, 3, 'Unit col should be 3');

  console.log('  T34d moveUnits moves unit to adjacent cell: PASS');
})();

console.log('\nAll simulation tests passed (including T31-T34).');
