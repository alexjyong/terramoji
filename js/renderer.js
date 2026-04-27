// TerraMoji — Renderer

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
      div.dataset.biome = cell.biome; // CSS selector hook for biome styles

      // Render landmark emoji for mountain/forest/jungle (permanent entities per Constitution II)
      const landmark = BIOMES[cell.biome].landmark;
      if (landmark) {
        div.textContent = landmark;
      }
      // Render cactus emoji on desert tiles
      else if (cell.cactus) {
        div.textContent = '🌵';
      }
      // Render creatures as emoji (entities remain emoji per constitution)
      else if (cell.creatures && cell.creatures.length > 0) {
        div.textContent = BIOMES[cell.biome].creature;
      }
      // No emoji on base terrain — CSS gradients/textures handle visuals

      gridEl.appendChild(div);
    }
  }
}
