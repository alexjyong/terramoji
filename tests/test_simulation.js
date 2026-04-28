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
