// TerraMoji — Input Handling

document.getElementById('btn-new-planet').addEventListener('click', () => {
  generatePlanet();
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

document.querySelectorAll('.biome-buttons button').forEach((button) => {
  button.addEventListener('click', () => {
    const biome = button.dataset.biome;
    state.selectedBiome = biome;
    updateBiomeButtonSelection();
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

// --- Grid Cell Click Handler (T019b) + Drag-to-Paint (T020b) ---

let isPainting = false;
let renderPending = false;

gridEl.addEventListener('mousedown', (e) => {
  const cellDiv = e.target.closest('.cell');
  if (!cellDiv || !state.selectedBiome) return;
  isPainting = true;
  paintCell(cellDiv);
});

gridEl.addEventListener('mouseover', (e) => {
  if (!isPainting) return;
  const cellDiv = e.target.closest('.cell');
  if (!cellDiv) return;
  paintCell(cellDiv);
});

document.addEventListener('mouseup', () => {
  isPainting = false;
});

function paintCell(cellDiv) {
  const row = parseInt(cellDiv.dataset.row, 10);
  const col = parseInt(cellDiv.dataset.col, 10);
  changeCellBiome(row, col, state.selectedBiome);
  scheduleRender();
}

// Throttled re-render for smooth drag painting
function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderGrid();
    renderPending = false;
  });
}
