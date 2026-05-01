// TerraMoji — Renderer Integration Tests
// Verifies state change → DOM update cycle (T032)
const assert = require('assert');

/* ------------------------------------------------------------------ */
/* Minimal DOM shim so renderer logic can run in Node.js               */
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

  // Mock classList API (used by renderer for tooltip show/hide)
  classList = {
    add: (c) => { this._classes.add(c); this.className = Array.from(this._classes).join(' '); },
    remove: (c) => { this._classes.delete(c); this.className = Array.from(this._classes).join(' '); },
    toggle: (c) => { this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c); this.className = Array.from(this._classes).join(' '); },
    contains: (c) => this._classes.has(c),
  };

  // innerHTML setter must clear children (renderGrid does gridEl.innerHTML = '')
  set innerHTML(v) {
    this._innerHTML = v;
    if (v === '') this.children = [];
  }
  get innerHTML() { return this._innerHTML || ''; }

  setAttribute(key, val) { this._attributes[key] = val; }
  getAttribute(key) { return this._attributes[key]; }

  appendChild(child) { this.children.push(child); }
  removeChild(child) { this.children = this.children.filter(c => c !== child); }

  closest(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      if (this.className.includes(cls)) return this;
    }
    return null;
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, bottom: 24, right: 24, width: 24, height: 24 };
  }
}

class MockDocument {
  constructor() { this._elements = {}; }
  getElementById(id) { return this._elements[id] || null; }
  createElement(tag) { return new MockElement(tag); }
  querySelectorAll(selector) { return []; }
  addEventListener() {}
}

// Wire up globals
global.document = new MockDocument();
global.window = { innerWidth: 800, innerHeight: 600 };
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);

/* ------------------------------------------------------------------ */
/* Load simulation + renderer modules by eval-ing their source         */
/* ------------------------------------------------------------------ */

const fs = require('fs');
const path = require('path');

// Create mock DOM elements that the scripts expect
const gridEl = new MockElement('div');
gridEl.id = 'grid';
global.document._elements['grid'] = gridEl;

const tooltipEl = new MockElement('div');
tooltipEl.id = 'inspect-tooltip';
tooltipEl.className = 'inspect-tooltip hidden';
global.document._elements['inspect-tooltip'] = tooltipEl;

// Mock querySelectorAll for biome buttons
global.document.querySelectorAll = function (sel) {
  if (sel.includes('.biome-buttons')) return [];
  return [];
};

// Mock addEventListener on document (input.js registers handlers we don't need)
global.document.addEventListener = () => {};

// Load simulation + renderer modules inside an IIFE so that `const`/`let`/`function`
// bindings are captured and returned as an object (avoids Node.js eval scoping issues).
function loadModules() {
  const gridElRef = gridEl;
  const tooltipElRef = tooltipEl;

  // simulation.js
  const simCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'simulation.js'), 'utf8');
  // renderer.js
  const rendCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'renderer.js'), 'utf8');

  // Replace `const state` → `const _state` so we can grab it after eval
  // Actually: wrap in an IIFE that returns the symbols we need.
  const wrapped = `
    (function() {
      ${simCode}
      ${rendCode}
      return { state, BIOMES, BIOME_KEYS, POLE_ROWS, CREATURE_TYPES,
               mulberry32, generatePlanet, enforcePoles, smoothGrid,
               spawnCreatures, moveCreatures, tick, startSimulation,
               removeIncompatibleCreatures, changeCellBiome, createCreature,
               totalCreatures, creatureIdCounter,
               renderGrid, showInspectTooltip, hideTooltip };
    })()
  `;
  return eval(wrapped);
}

const {
  state, BIOMES, BIOME_KEYS, POLE_ROWS, CREATURE_TYPES,
  mulberry32, generatePlanet, enforcePoles, smoothGrid,
  spawnCreatures, moveCreatures, tick, startSimulation,
  removeIncompatibleCreatures, changeCellBiome, createCreature,
  totalCreatures: _totalCreatures, creatureIdCounter: _cid,
  renderGrid, showInspectTooltip, hideTooltip,
} = loadModules();


/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

// --- T032-a: renderGrid creates correct number of cell elements ---
(function testRenderGridCellCount() {
  // Generate a planet (populates state.grid.cells)
  generatePlanet();
  renderGrid();

  assert.strictEqual(gridEl.children.length, 900, 'Grid should have 30×30 = 900 cells');
  console.log('  T032-a renderGrid creates 900 cell elements: PASS');
})();

// --- T032-b: each cell div has data-biome attribute matching state ---
(function testCellDataBiomeAttribute() {
  gridEl.innerHTML = ''; // clear any leftover cells from prior tests
  generatePlanet();
  renderGrid();

  // Verify cell count matches before iterating
  assert.strictEqual(gridEl.children.length, state.grid.cells.length * state.grid.cells[0].length,
    'DOM child count must match grid cell count');

  for (let r = 0; r < state.grid.height; r++) {
    for (let c = 0; c < state.grid.width; c++) {
      const idx = r * state.grid.width + c;
      const expectedBiome = state.grid.cells[r][c].biome;
      const actualBiome = gridEl.children[idx].dataset.biome;
      assert.strictEqual(
        actualBiome, expectedBiome,
        `Cell [${r}][${c}] (idx ${idx}) data-biome should be ${expectedBiome}, got ${actualBiome}`
      );
    }
  }

  // Also verify grid dimensions are set on the container
  assert.ok(gridEl.style.gridTemplateColumns.includes('30'), 'Grid columns style should reference 30');
  assert.ok(gridEl.style.gridTemplateRows.includes('30'), 'Grid rows style should reference 30');

  console.log('  T032-b cell data-biome matches state: PASS');
})();

// --- T032-c: changing state and re-rendering updates DOM ---
(function testStateChangeUpdatesDom() {
  generatePlanet();
  renderGrid();

  // Change cell [5][5] from whatever it is to desert
  const originalBiome = state.grid.cells[5][5].biome;
  changeCellBiome(5, 5, 'desert');
  assert.strictEqual(state.grid.cells[5][5].biome, 'desert', 'State should reflect new biome');

  renderGrid();
  const cellIndex = 5 * 30 + 5;
  assert.strictEqual(
    gridEl.children[cellIndex].dataset.biome,
    'desert',
    'DOM cell [5][5] should update to desert after re-render'
  );
  console.log('  T032-c state change → DOM update cycle: PASS');
})();

// --- T032-d: pole cells render as ice biome ---
(function testPoleCellsRenderAsIce() {
  generatePlanet();
  renderGrid();

  // Top 3 rows should be ice
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 30; c++) {
      const idx = r * 30 + c;
      assert.strictEqual(
        gridEl.children[idx].dataset.biome,
        'ice',
        `Top pole cell [${r}][${c}] should render as ice`
      );
    }
  }

  // Bottom 3 rows should be ice
  for (let r = 27; r < 30; r++) {
    for (let c = 0; c < 30; c++) {
      const idx = r * 30 + c;
      assert.strictEqual(
        gridEl.children[idx].dataset.biome,
        'ice',
        `Bottom pole cell [${r}][${c}] should render as ice`
      );
    }
  }
  console.log('  T032-d pole cells render as ice: PASS');
})();

// --- T032-e: creature presence is reflected in DOM ---
(function testCreaturesRenderedInDom() {
  generatePlanet();
  spawnCreatures();
  renderGrid();

  // Find at least one cell that has creatures and verify the DOM reflects it
  let foundCreatureCell = false;
  for (let r = 0; r < 30 && !foundCreatureCell; r++) {
    for (let c = 0; c < 30 && !foundCreatureCell; c++) {
      const cell = state.grid.cells[r][c];
      if (cell.creatures && cell.creatures.length > 0) {
        const idx = r * 30 + c;
        const domCell = gridEl.children[idx];
        // Cell should have creature emoji in textContent or a creature-overlay child
        // Check against all 25 creature emojis from the expanded roster
        const allEmojis = Object.values(CREATURE_TYPES).map(ct => ct.emoji);
        const hasCreatureText = allEmojis.some(emoji => domCell.textContent.includes(emoji));
        const hasOverlay = domCell.children.some(ch => ch.className === 'creature-overlay');
        assert.ok(
          hasCreatureText || hasOverlay,
          `DOM cell [${r}][${c}] should display creature emoji`
        );
        foundCreatureCell = true;
      }
    }
  }
  assert.ok(foundCreatureCell, 'At least one creature cell should exist after spawnCreatures');
  console.log('  T032-e creatures reflected in DOM: PASS');
})();

// --- T032-f: tick → re-render cycle updates DOM after creature movement ---
(function testTickUpdatesDom() {
  generatePlanet();
  spawnCreatures();
  renderGrid();

  // Record biome of a non-pole cell before tick
  const testR = 10, testC = 10;
  const biomeBefore = state.grid.cells[testR][testC].biome;

  // Run one tick manually (without interval)
  tick();

  // Re-render happens inside tick(), but verify DOM still matches state
  const idx = testR * 30 + testC;
  assert.strictEqual(
    gridEl.children[idx].dataset.biome,
    state.grid.cells[testR][testC].biome,
    'DOM should match state after tick'
  );
  console.log('  T032-f tick → re-render cycle: PASS');
})();

// --- T032-g: inspect tooltip shows correct biome info ---
(function testInspectTooltipContent() {
  generatePlanet();
  renderGrid();

  // Pick a known cell
  const testR = 15, testC = 15;
  const cellDiv = gridEl.children[testR * 30 + testC];
  const expectedBiome = state.grid.cells[testR][testC].biome;
  const expectedBiomeCapitalized = expectedBiome.charAt(0).toUpperCase() + expectedBiome.slice(1);

  showInspectTooltip(testR, testC, cellDiv);

  // Tooltip should contain the capitalized biome name (how renderer formats it)
  assert.ok(
    tooltipEl.innerHTML.includes(expectedBiomeCapitalized),
    `Tooltip should contain biome name "${expectedBiomeCapitalized}", got: ${tooltipEl.innerHTML.slice(0, 100)}`
  );

  // Tooltip should also contain the biome emoji
  const biomeEmoji = BIOMES[expectedBiome].emoji;
  assert.ok(
    tooltipEl.innerHTML.includes(biomeEmoji),
    'Tooltip should contain biome emoji'
  );

  assert.ok(
    !tooltipEl.className.includes('hidden'),
    'Tooltip should be visible after showInspectTooltip'
  );

  hideTooltip();
  assert.ok(
    tooltipEl.className.includes('hidden'),
    'Tooltip should be hidden after hideTooltip'
  );

  console.log('  T032-g inspect tooltip content: PASS');
})();

console.log('\nAll renderer integration tests passed.');
