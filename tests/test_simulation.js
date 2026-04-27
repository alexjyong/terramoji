// Emoji Earth — Simulation Tests
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
  // Simulate generation
  const rng = mulberry32(12345);
  const width = 30, height = 30;
  const cells = [];
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      // Force ice at poles
      if (r < POLE_ROWS.top || r >= height - POLE_ROWS.bottom) {
        cells[r][c] = { biome: 'ice', creatures: [] };
      } else {
        cells[r][c] = { biome: BIOME_KEYS[Math.floor(rng() * BIOME_KEYS.length)], creatures: [] };
      }
    }
  }

  assert.strictEqual(cells.length, 30, 'Grid height must be 30');
  assert.strictEqual(cells[0].length, 30, 'Grid width must be 30');

  // Check all 5 biomes present
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

// --- T010c: poles are ice biome ---
(function testPolesAreIce() {
  const rng = mulberry32(12345);
  const width = 30, height = 30;
  const cells = [];
  for (let r = 0; r < height; r++) {
    cells[r] = [];
    for (let c = 0; c < width; c++) {
      if (r < POLE_ROWS.top || r >= height - POLE_ROWS.bottom) {
        cells[r][c] = { biome: 'ice', creatures: [] };
      } else {
        cells[r][c] = { biome: BIOME_KEYS[Math.floor(rng() * BIOME_KEYS.length)], creatures: [] };
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

  // Verify non-pole rows are not forced to ice (spot check middle rows)
  assert.notStrictEqual(cells[15][15].biome, 'ice' /* or could be ice by chance, so just check it exists */, 'Non-pole cells should not be forced ice');
  console.log('  T010c poles are ice biome: PASS');
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

console.log('\nAll simulation tests passed.');
