// Emoji Earth — Renderer

const gridEl = document.getElementById('grid');

function renderGrid() {
  const { cells, width, height } = state.grid;
  if (!cells || cells.length === 0) return;

  // Set grid dimensions
  gridEl.style.gridTemplateColumns = `repeat(${width}, 24px)`;
  gridEl.style.gridTemplateRows = `repeat(${height}, 24px)`;

  // Clear existing cells
  gridEl.innerHTML = '';

  // Create cell elements
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = cells[r][c];
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.row = r;
      div.dataset.col = c;
      div.style.backgroundColor = BIOMES[cell.biome].color;
      div.textContent = BIOMES[cell.biome].emoji;
      gridEl.appendChild(div);
    }
  }
}
