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
               TECH_STAGES, UNIT_TYPES,
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
  TECH_STAGES, UNIT_TYPES,
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

// --- T3: all 25 creature types display correctly in inspect tooltip ---
(function testAllCreatureTypesInTooltip() {
  // Verify that every creature type in CREATURE_TYPES can be placed on a
  // compatible cell and will display its correct emoji + name in the tooltip.

  // Create a minimal 1×25 grid so we can place one creature per cell
  const orig = { ...state.grid };
  state.grid.width = 1;
  state.grid.height = Object.keys(CREATURE_TYPES).length;
  state.grid.cells = [];

  const creatureNames = Object.keys(CREATURE_TYPES);
  for (let i = 0; i < creatureNames.length; i++) {
    const name = creatureNames[i];
    const ct = CREATURE_TYPES[name];
    // Pick the first compatible biome for this creature
    const biome = ct.compatibleBiomes[0];
    const cell = { biome, creatures: [], civilization: null };
    cell.creatures.push(createCreature(name, i, 0));
    state.grid.cells[i] = [cell];
  }

  // Render the grid (creates DOM cells)
  renderGrid();

  let passCount = 0;
  for (let i = 0; i < creatureNames.length; i++) {
    const name = creatureNames[i];
    const ct = CREATURE_TYPES[name];
    const cellDiv = gridEl.children[i];

    showInspectTooltip(i, 0, cellDiv);

    // Tooltip must contain the creature emoji
    assert.ok(
      tooltipEl.innerHTML.includes(ct.emoji),
      `Tooltip for ${name} should contain emoji ${ct.emoji}`
    );

    // Tooltip must contain the creature name (lowercase, as stored)
    assert.ok(
      tooltipEl.innerHTML.includes(name),
      `Tooltip for ${name} should contain name "${name}"`
    );

    passCount++;
  }

  // Restore original grid
  state.grid = orig;

  assert.strictEqual(
    passCount,
    creatureNames.length,
    `All ${creatureNames.length} creature types should display in tooltip`
  );

  console.log(`  T3 all ${creatureNames.length} creature types in tooltip: PASS`);
})();

// --- T36a: civilization emoji renders on cell as main content ---
(function testCivEmojiRendersOnCell() {
  // Set up a small grid with civilizations at known stages
  const orig = { ...state.grid };
  state.grid.width = 5;
  state.grid.height = 5;
  state.grid.cells = [];

  for (let r = 0; r < 5; r++) {
    state.grid.cells[r] = [];
    for (let c = 0; c < 5; c++) {
      state.grid.cells[r][c] = { biome: 'grassland', creatures: [], civilization: null, unit: null };
    }
  }

  // Place civilizations at different stages
  const civPlacements = [
    { r: 0, c: 0, stage: 0 }, // Stone 🛖
    { r: 1, c: 1, stage: 2 }, // Iron 🏰
    { r: 2, c: 2, stage: 4 }, // Atomic ☢️
    { r: 3, c: 3, stage: 6 }, // Nanotech 🔮
  ];

  for (const { r, c, stage } of civPlacements) {
    state.grid.cells[r][c].civilization = { stage };
  }

  renderGrid();

  // Verify each civ cell renders the correct tech emoji as main textContent
  for (const { r, c, stage } of civPlacements) {
    const idx = r * 5 + c;
    const expectedEmoji = TECH_STAGES[stage].emoji;
    const cellDiv = gridEl.children[idx];
    assert.strictEqual(
      cellDiv.textContent,
      expectedEmoji,
      `Cell [${r}][${c}] with stage ${stage} (${TECH_STAGES[stage].name}) should render emoji ${expectedEmoji}`
    );
  }

  // Verify a cell without civilization does NOT show a civ emoji
  const emptyIdx = 4 * 5 + 4; // [4][4] has no civ
  const emptyCell = gridEl.children[emptyIdx];
  assert.strictEqual(emptyCell.textContent, '', 'Non-civ cell should have no textContent');

  // Restore original grid
  state.grid = orig;

  console.log('  T36a civilization emoji renders on cell: PASS');
})();

// --- T36b: render priority — civilization > landmark > cactus ---
(function testRenderPriorityCivOverLandmark() {
  const orig = { ...state.grid };
  state.grid.width = 4;
  state.grid.height = 4;
  state.grid.cells = [];

  for (let r = 0; r < 4; r++) {
    state.grid.cells[r] = [];
    for (let c = 0; c < 4; c++) {
      state.grid.cells[r][c] = { biome: 'grassland', creatures: [], civilization: null, unit: null };
    }
  }

  // Cell [0][0]: mountain with civ — civ emoji should be main content, landmark as overlay
  state.grid.cells[0][0].biome = 'mountain';
  state.grid.cells[0][0].civilization = { stage: 1 };

  // Cell [0][1]: mountain without civ — landmark should be main content
  state.grid.cells[0][1].biome = 'mountain';

  // Cell [1][0]: desert with cactus and civ — civ emoji main, cactus as overlay
  state.grid.cells[1][0].biome = 'desert';
  state.grid.cells[1][0].cactus = true;
  state.grid.cells[1][0].civilization = { stage: 2 };

  // Cell [1][1]: desert with cactus, no civ — cactus should be main content
  state.grid.cells[1][1].biome = 'desert';
  state.grid.cells[1][1].cactus = true;

  renderGrid();

  // [0][0]: civ on mountain — main text is civ emoji, landmark in overlay span
  const cellCivMountain = gridEl.children[0];
  assert.ok(cellCivMountain.textContent.includes(TECH_STAGES[1].emoji),
    'Civ emoji should appear in textContent on mountain');
  // Landmark should appear as a creature-overlay child span
  const hasLandmarkOverlay = cellCivMountain.children.some(
    ch => ch.className === 'creature-overlay' && ch.textContent === '🏔️'
  );
  assert.ok(hasLandmarkOverlay, 'Mountain landmark should render as overlay span under civ');

  // [0][1]: mountain without civ — landmark is main content
  const cellMountain = gridEl.children[1];
  assert.strictEqual(cellMountain.textContent, '🏔️',
    'Mountain landmark should be main content when no civ present');

  // [1][0]: civ on desert with cactus — civ emoji main, cactus as overlay
  const cellCivCactus = gridEl.children[4];
  assert.ok(cellCivCactus.textContent.includes(TECH_STAGES[2].emoji),
    'Civ emoji should appear in textContent on cactus tile');
  const hasCactusOverlay = cellCivCactus.children.some(
    ch => ch.className === 'creature-overlay' && ch.textContent === '🌵'
  );
  assert.ok(hasCactusOverlay, 'Cactus should render as overlay span under civ');

  // [1][1]: cactus without civ — cactus is main content
  const cellCactus = gridEl.children[5];
  assert.strictEqual(cellCactus.textContent, '🌵',
    'Cactus emoji should be main content when no civ present');

  // Restore original grid
  state.grid = orig;

  console.log('  T36b render priority civ > landmark > cactus: PASS');
})();

// --- T36c: unit emoji renders as overlay span on cell ---
(function testUnitEmojiRendersAsOverlay() {
  const orig = { ...state.grid };
  state.grid.width = 4;
  state.grid.height = 4;
  state.grid.cells = [];

  for (let r = 0; r < 4; r++) {
    state.grid.cells[r] = [];
    for (let c = 0; c < 4; c++) {
      state.grid.cells[r][c] = { biome: 'grassland', creatures: [], civilization: null, unit: null };
    }
  }

  // Cell [0][0]: civ with a unit — unit should appear as unit-overlay span
  state.grid.cells[0][0].civilization = { stage: 1 };
  state.grid.cells[0][0].unit = { emoji: '🏇', stage: 1, movementType: 'land', row: 0, col: 0, wanderLeft: 8, restTicks: 0 };

  // Cell [0][1]: no civ but has a unit — unit overlay should still render
  state.grid.cells[0][1].unit = { emoji: '🛶', stage: 2, movementType: 'sea', row: 0, col: 1, wanderLeft: 8, restTicks: 0 };

  // Cell [1][0]: civ with no unit — no unit-overlay span
  state.grid.cells[1][0].civilization = { stage: 3 };

  // Cell [1][1]: empty cell — nothing rendered

  renderGrid();

  // [0][0]: civ + unit — main content is civ emoji, unit in overlay span
  const cellCivUnit = gridEl.children[0];
  assert.ok(cellCivUnit.textContent.includes(TECH_STAGES[1].emoji),
    'Cell should contain civ emoji');
  const hasUnitOverlay = cellCivUnit.children.some(
    ch => ch.className === 'unit-overlay' && ch.textContent === '🏇'
  );
  assert.ok(hasUnitOverlay, 'Unit emoji should render as unit-overlay span');

  // [0][1]: no civ but has unit — unit overlay still present
  const cellNoCivUnit = gridEl.children[1];
  const hasUnitOverlay2 = cellNoCivUnit.children.some(
    ch => ch.className === 'unit-overlay' && ch.textContent === '🛶'
  );
  assert.ok(hasUnitOverlay2, 'Unit overlay should render even without civ on cell');

  // [1][0]: civ with no unit — no unit-overlay span
  const cellCivNoUnit = gridEl.children[4];
  const hasUnitOverlay3 = cellCivNoUnit.children.some(
    ch => ch.className === 'unit-overlay'
  );
  assert.ok(!hasUnitOverlay3, 'Cell with civ but no unit should have no unit-overlay');

  // [1][1]: empty — no overlays at all
  const cellEmpty = gridEl.children[5];
  assert.strictEqual(cellEmpty.children.length, 0, 'Empty cell should have no child spans');

  // Restore original grid
  state.grid = orig;

  console.log('  T36c unit emoji renders as overlay span: PASS');
})();

// --- T36d: inspect tooltip shows correct tech stage name + emoji for civilization cell ---
(function testInspectTooltipCivInfo() {
  const orig = { ...state.grid };
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = [];

  for (let r = 0; r < 3; r++) {
    state.grid.cells[r] = [];
    for (let c = 0; c < 3; c++) {
      state.grid.cells[r][c] = { biome: 'grassland', creatures: [], civilization: null, unit: null };
    }
  }

  // Place civilizations at various stages
  const civTests = [
    { r: 0, c: 0, stage: 0, name: 'Stone', emoji: '🛖' },
    { r: 0, c: 1, stage: 3, name: 'Industrial', emoji: '🏭' },
    { r: 0, c: 2, stage: 6, name: 'Nanotech', emoji: '🔮' },
  ];

  for (const { r, c, stage } of civTests) {
    state.grid.cells[r][c].civilization = { stage, species: 'cow' };
  }

  renderGrid();

  // Verify tooltip shows correct tech info for each civ
  for (const { r, c, name, emoji } of civTests) {
    const idx = r * 3 + c;
    const cellDiv = gridEl.children[idx];
    showInspectTooltip(r, c, cellDiv);

    assert.ok(
      tooltipEl.innerHTML.includes(emoji),
      `Tooltip for stage ${civTests.indexOf({r,c})} should contain tech emoji ${emoji}`
    );
    assert.ok(
      tooltipEl.innerHTML.includes(name),
      `Tooltip should contain tech stage name "${name}"`
    );
    assert.ok(
      tooltipEl.innerHTML.includes(`Stage ${state.grid.cells[r][c].civilization.stage}`),
      'Tooltip should show the stage number'
    );

    hideTooltip();
  }

  // Verify cell without civ shows "none" for civilization
  const emptyIdx = 1 * 3 + 1; // [1][1] has no civ
  const emptyCellDiv = gridEl.children[emptyIdx];
  showInspectTooltip(1, 1, emptyCellDiv);
  assert.ok(
    tooltipEl.innerHTML.includes('none'),
    'Tooltip should show "none" for civilization when no civ exists'
  );
  hideTooltip();

  // Restore original grid
  state.grid = orig;

  console.log('  T36d inspect tooltip shows tech stage name + emoji: PASS');
})();

// --- T36e: inspect tooltip shows unit info (emoji + originating civ stage) when unit present ---
(function testInspectTooltipUnitInfo() {
  const orig = { ...state.grid };
  state.grid.width = 3;
  state.grid.height = 3;
  state.grid.cells = [];

  for (let r = 0; r < 3; r++) {
    state.grid.cells[r] = [];
    for (let c = 0; c < 3; c++) {
      state.grid.cells[r][c] = { biome: 'grassland', creatures: [], civilization: null, unit: null };
    }
  }

  // Cell [0][0]: civ with a land unit at stage 1 (Bronze)
  state.grid.cells[0][0].civilization = { stage: 1, species: 'cow' };
  state.grid.cells[0][0].unit = {
    emoji: '🏇', stage: 1, movementType: 'land',
    row: 0, col: 0, wanderLeft: 8, restTicks: 0,
  };

  // Cell [0][1]: civ with a sea unit at stage 3 (Industrial)
  state.grid.cells[0][1].biome = 'water';
  state.grid.cells[0][1].civilization = { stage: 3, species: 'fish' };
  state.grid.cells[0][1].unit = {
    emoji: '🚢', stage: 3, movementType: 'sea',
    row: 0, col: 1, wanderLeft: 5, restTicks: 0,
  };

  // Cell [1][0]: civ with an air unit at stage 4 (Atomic)
  state.grid.cells[1][0].civilization = { stage: 4, species: 'bird' };
  state.grid.cells[1][0].unit = {
    emoji: '✈️', stage: 4, movementType: 'air',
    row: 1, col: 0, wanderLeft: 3, restTicks: 0,
  };

  // Cell [1][1]: no unit — should not show Mobile Unit section
  state.grid.cells[1][1].civilization = { stage: 2 };

  renderGrid();

  // Test [0][0]: tooltip shows unit emoji + "Bronze unit"
  const cell0 = gridEl.children[0];
  showInspectTooltip(0, 0, cell0);
  assert.ok(tooltipEl.innerHTML.includes('🏇'), 'Tooltip should contain unit emoji 🏇');
  assert.ok(tooltipEl.innerHTML.includes('Bronze unit'), 'Tooltip should show "Bronze unit"');
  assert.ok(tooltipEl.innerHTML.includes('Mobile Unit'), 'Tooltip should have Mobile Unit section');
  hideTooltip();

  // Test [0][1]: tooltip shows sea unit emoji + "Industrial unit"
  const cell1 = gridEl.children[1];
  showInspectTooltip(0, 1, cell1);
  assert.ok(tooltipEl.innerHTML.includes('🚢'), 'Tooltip should contain unit emoji 🚢');
  assert.ok(tooltipEl.innerHTML.includes('Industrial unit'), 'Tooltip should show "Industrial unit"');
  hideTooltip();

  // Test [1][0]: tooltip shows air unit emoji + "Atomic unit"
  const cell2 = gridEl.children[3];
  showInspectTooltip(1, 0, cell2);
  assert.ok(tooltipEl.innerHTML.includes('✈️'), 'Tooltip should contain unit emoji ✈️');
  assert.ok(tooltipEl.innerHTML.includes('Atomic unit'), 'Tooltip should show "Atomic unit"');
  hideTooltip();

  // Test [1][1]: no unit — should not have Mobile Unit section with unit info
  const cell3 = gridEl.children[4];
  showInspectTooltip(1, 1, cell3);
  assert.ok(!tooltipEl.innerHTML.includes('Mobile Unit'),
    'Tooltip should not show Mobile Unit section when no unit present');
  hideTooltip();

  // Restore original grid
  state.grid = orig;

  console.log('  T36e inspect tooltip shows unit info: PASS');
})();

console.log('\nAll renderer integration tests passed.');
