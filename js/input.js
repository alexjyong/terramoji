// TerraMoji — Input Handling

document.getElementById('btn-new-planet').addEventListener('click', () => {
  creatureIdCounter = 0;
  generatePlanet();
  spawnCreatures();
  startSimulation();
  state.isPaused = false;
  updatePauseButton();
  renderGrid();
  hideCivPicker();
});

document.getElementById('btn-pause').addEventListener('click', () => {
  state.isPaused = !state.isPaused;
  updatePauseButton();
});

function updatePauseButton() {
  const btn = document.getElementById('btn-pause');
  if (state.isPaused) {
    btn.textContent = '▶️ Resume';
  } else {
    btn.textContent = '⏸️ Pause';
  }
}

// --- Deselect All Tools ---

function deselectAllTools() {
  state.selectedBiome = null;
  state.selectedCivStage = null;
  state.inspectMode = false;
  state.monolithMode = false;
  state.civMode = false;
  updateInspectButton();
  updateBiomeButtonSelection();
  updateCivButtons();
}

// --- Biome Selection (T018) ---

document.querySelectorAll('.biome-buttons button').forEach((button) => {
  button.addEventListener('click', () => {
    deselectAllTools();
    hideCivPicker();
    const biome = button.dataset.biome;
    state.selectedBiome = biome;
    updateBiomeButtonSelection();
    hideTooltip();
  });
});

function updateBiomeButtonSelection() {
  document.querySelectorAll('.biome-buttons button').forEach((button) => {
    if (button.dataset.biome === state.selectedBiome) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// --- Inspect Tool Mode (T036) ---

const inspectBtn = document.getElementById('btn-inspect');

inspectBtn.addEventListener('click', () => {
  deselectAllTools();
  hideCivPicker();
  state.inspectMode = !state.inspectMode;
  updateInspectButton();
  hideTooltip();
});

function updateInspectButton() {
  if (state.inspectMode) {
    inspectBtn.classList.add('active');
  } else {
    inspectBtn.classList.remove('active');
  }
}

// Dismiss tooltip on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideTooltip();
    hideCivPicker();
  }
});

// Dismiss tooltip when tapping it
tooltipEl.addEventListener('click', () => {
  hideTooltip();
});

// --- Civilization Placement Tools (T11/T12/T13) ---

const monolithBtn = document.getElementById('btn-monolith');
const civBtn = document.getElementById('btn-civ');
const civPickerEl = document.getElementById('civ-picker');
const civPickerStagesEl = document.getElementById('civ-picker-stages');
const civCloseBtn = document.getElementById('btn-civ-close');

monolithBtn.addEventListener('click', () => {
  deselectAllTools();
  hideCivPicker();
  state.monolithMode = true;
  updateCivButtons();
  hideTooltip();
});

// T39b: Civ button opens the civ picker instead of entering placement mode directly
civBtn.addEventListener('click', () => {
  deselectAllTools();
  hideTooltip();
  showCivPicker();
});

// Close button hides the picker
civCloseBtn.addEventListener('click', () => {
  hideCivPicker();
  deselectAllTools();
});

function updateCivButtons() {
  if (state.monolithMode) {
    monolithBtn.classList.add('active');
  } else {
    monolithBtn.classList.remove('active');
  }
  if (state.civMode) {
    civBtn.classList.add('active');
  } else {
    civBtn.classList.remove('active');
  }
}

// --- T39b: Civ Picker ---

function showCivPicker() {
  // Scan the grid for all active tech stages
  const activeStages = new Set();
  const { cells, width, height } = state.grid;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].civilization) {
        activeStages.add(cells[r][c].civilization.stage);
      }
    }
  }

  // Build stage buttons
  civPickerStagesEl.innerHTML = '';
  for (let s = 0; s < TECH_STAGES.length; s++) {
    const tech = TECH_STAGES[s];
    const btn = document.createElement('button');
    btn.textContent = `${tech.emoji} ${tech.name}`;
    btn.className = 'civ-stage-btn';
    if (activeStages.has(s)) {
      btn.classList.add('active');
      btn.addEventListener('click', () => {
        state.selectedCivStage = s;
        state.civMode = true;
        hideCivPicker();
        updateCivButtons();
        showStatus(`${tech.emoji} Placing ${tech.name} cities — tap a tile`, 'info');
      });
    } else {
      btn.classList.add('disabled');
      btn.disabled = true;
      btn.title = `Not yet reached`;
    }
    civPickerStagesEl.appendChild(btn);
  }

  // Show picker
  civPickerEl.classList.remove('hidden');
}

function hideCivPicker() {
  civPickerEl.classList.add('hidden');
}

// --- Grid Cell Click Handler (T019b) + Drag-to-Paint (T020b) ---

// Track whether the user is currently dragging across cells
let isPainting = false;
let renderPending = false;
let inspectJustShown = false;

gridEl.addEventListener('pointerdown', (e) => {
  const cellDiv = e.target.closest('.cell');
  if (!cellDiv) return;
  e.preventDefault();
  handleCellInteraction(cellDiv);
});

function handleCellInteraction(cellDiv) {
  // Inspect mode (T037) — show tooltip, skip painting
  if (state.inspectMode) {
    const row = parseInt(cellDiv.dataset.row, 10);
    const col = parseInt(cellDiv.dataset.col, 10);
    showInspectTooltip(row, col, cellDiv);
    inspectJustShown = true;
    return;
  }

  // Monolith mode
  if (state.monolithMode) {
    const row = parseInt(cellDiv.dataset.row, 10);
    const col = parseInt(cellDiv.dataset.col, 10);
    createCivilization(row, col); // handles advance, found, or error internally
    renderGrid();
    return;
  }

  // Civ placement mode (picker-selected stage)
  if (state.civMode && state.selectedCivStage !== null) {
    const row = parseInt(cellDiv.dataset.row, 10);
    const col = parseInt(cellDiv.dataset.col, 10);
    if (createCivilizationAtStage(row, col, state.selectedCivStage)) {
      renderGrid();
      // Exit placement mode after successful placement
      state.civMode = false;
      state.selectedCivStage = null;
      updateCivButtons();
    }
    return;
  }

  // Also handle legacy civMode (without picker) for backward compat
  if (state.civMode) {
    const row = parseInt(cellDiv.dataset.row, 10);
    const col = parseInt(cellDiv.dataset.col, 10);
    createCivilization(row, col);
    renderGrid();
    return;
  }

  // Biome painting
  if (!state.selectedBiome) return;
  isPainting = true;
  paintCell(cellDiv);
}

// Drag-to-paint: only fire while actively painting
// If user drags after an inspect tap, dismiss stale tooltip
gridEl.addEventListener('pointermove', (e) => {
  if (inspectJustShown) {
    inspectJustShown = false;
    hideTooltip(); // dismiss — content would be stale
  }

  if (!isPainting) return;
  const cellDiv = e.target.closest('.cell');
  if (!cellDiv) return;
  paintCell(cellDiv);
});

// Stop painting when pointer is released anywhere on the page
document.addEventListener('pointerup', () => {
  isPainting = false;
  inspectJustShown = false; // reset so next tap works cleanly
});

function paintCell(cellDiv) {
  const row = parseInt(cellDiv.dataset.row, 10);
  const col = parseInt(cellDiv.dataset.col, 10);
  changeCellBiome(row, col, state.selectedBiome);
  scheduleRender();
}

// Throttled re-render for smooth drag painting — uses requestAnimationFrame
function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderGrid();
    renderPending = false;
  });
}
