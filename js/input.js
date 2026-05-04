// TerraMoji — Input Handling

document.getElementById('btn-new-planet').addEventListener('click', () => {
  creatureIdCounter = 0;
  generatePlanet();
  spawnCreatures();
  startSimulation();
  state.isPaused = false;
  updatePauseButton();
  renderGrid();
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

// --- Biome Selection (T018) ---

function deselectAllTools() {
  state.selectedBiome = null;
  state.inspectMode = false;
  state.monolithMode = false;
  state.civMode = false;
  updateInspectButton();
  updateBiomeButtonSelection();
  updateCivButtons();
}

document.querySelectorAll('.biome-buttons button').forEach((button) => {
  button.addEventListener('click', () => {
    deselectAllTools();
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
  }
});

// --- Civilization Placement Tools (T11/T12/T13) ---

const monolithBtn = document.getElementById('btn-monolith');
const civBtn = document.getElementById('btn-civ');

monolithBtn.addEventListener('click', () => {
  deselectAllTools();
  state.monolithMode = true;
  updateCivButtons();
  hideTooltip();
});

civBtn.addEventListener('click', () => {
  deselectAllTools();
  state.civMode = true;
  updateCivButtons();
  hideTooltip();
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

// --- Grid Cell Click Handler (T019b) + Drag-to-Paint (T020b) ---

// Track whether the user is currently dragging across cells
let isPainting = false;
let renderPending = false;
let inspectJustShown = false; // track if we just showed a tooltip this mousedown/touchstart

gridEl.addEventListener('mousedown', (e) => {
  const cellDiv = e.target.closest('.cell');
  if (!cellDiv) return;
  handleCellInteraction(cellDiv);
});

// Also handle touchstart for mobile — fires before touchmove
gridEl.addEventListener('touchstart', (e) => {
  const cellDiv = e.target.closest('.cell');
  if (!cellDiv) return;
  handleCellInteraction(cellDiv);
}, { passive: true });

function handleCellInteraction(cellDiv) {
  // Inspect mode (T037) — show tooltip, skip painting
  if (state.inspectMode) {
    const row = parseInt(cellDiv.dataset.row, 10);
    const col = parseInt(cellDiv.dataset.col, 10);
    showInspectTooltip(row, col, cellDiv);
    inspectJustShown = true;
    return;
  }

  // Monolith mode — create civilization only if cell has creatures
  if (state.monolithMode) {
    const row = parseInt(cellDiv.dataset.row, 10);
    const col = parseInt(cellDiv.dataset.col, 10);
    const cell = state.grid.cells[row][col];
    if (cell.creatures && cell.creatures.length > 0) {
      createCivilization(row, col);
      renderGrid();
    }
    return;
  }

  // Civ placement mode — create new city (requires existing civ on planet)
  if (state.civMode) {
    const row = parseInt(cellDiv.dataset.row, 10);
    const col = parseInt(cellDiv.dataset.col, 10);
    createCivilization(row, col);
    renderGrid();
    return;
  }

  if (!state.selectedBiome) return;
  isPainting = true;
  paintCell(cellDiv);
}

// If the user moves after an inspect tap, dismiss the tooltip so it doesn't
// show stale info while the highlight drags across other cells.
gridEl.addEventListener('mousemove', (e) => {
  if (inspectJustShown) {
    inspectJustShown = false;
    hideTooltip(); // dismiss — content would be stale
  }

  if (!isPainting) return;
  const cellDiv = e.target.closest('.cell');
  if (!cellDiv) return;
  paintCell(cellDiv);
});

// Stop painting when mouse button is released anywhere on the page
document.addEventListener('mouseup', () => {
  isPainting = false;
  inspectJustShown = false; // reset so next tap works cleanly
});

// Also dismiss tooltip on touchmove (mobile drag after inspect tap)
gridEl.addEventListener('touchmove', () => {
  if (inspectJustShown) {
    inspectJustShown = false;
    hideTooltip();
  }
}, { passive: true });

// Reset flag on touchend too
document.addEventListener('touchend', () => {
  inspectJustShown = false;
});

function paintCell(cellDiv) {
  const row = parseInt(cellDiv.dataset.row, 10);
  const col = parseInt(cellDiv.dataset.col, 10);
  changeCellBiome(row, col, state.selectedBiome);
  scheduleRender();
}

// Throttled re-render for smooth drag painting — uses requestAnimationFrame
// so that a fast drag triggers only one re-render per frame instead of
// one per cell hovered over.
function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderGrid();
    renderPending = false;
  });
}
