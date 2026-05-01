// TerraMoji — Renderer

const gridEl = document.getElementById('grid');
const tooltipEl = document.getElementById('inspect-tooltip');

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

      // Render priority: landmark > cactus > creature > nothing (base terrain)
      const landmark = BIOMES[cell.biome].landmark;
      const hasCreatures = cell.creatures && cell.creatures.length > 0;
      // Use the first creature's emoji from the expanded roster (not the old BIOMES default)
      const creatureEmoji = hasCreatures ? cell.creatures[0].emoji : null;

      if (landmark) {
        div.textContent = landmark;
        // Overlay creature emoji centered on top of landmark
        if (hasCreatures) {
          const crSpan = document.createElement('span');
          crSpan.className = 'creature-overlay';
          crSpan.textContent = creatureEmoji;
          div.appendChild(crSpan);
        }
      }
      // Render cactus emoji on desert tiles
      else if (cell.cactus) {
        div.textContent = '🌵';
      }
      // Render creatures as emoji (from expanded CREATURE_TYPES roster)
      else if (hasCreatures) {
        div.textContent = creatureEmoji;
      }
      // No emoji on base terrain — CSS gradients/textures handle visuals

      gridEl.appendChild(div);
    }
  }
}

// --- Inspect Tooltip (T037) ---

function showInspectTooltip(row, col, cellDiv) {
  const cell = state.grid.cells[row][col];
  if (!cell) return;

  const biomeInfo = BIOMES[cell.biome];
  let html = '<div class="tooltip-panels">';

  // Biome panel
  const biomeName = cell.biome.charAt(0).toUpperCase() + cell.biome.slice(1);
  html += `<div class="tooltip-section"><div class="tooltip-label">Biome</div><div class="tooltip-biome">${biomeInfo.emoji} ${biomeName}</div></div>`;

  // Creature panel
  if (cell.creatures && cell.creatures.length > 0) {
    const groups = {};
    for (const cr of cell.creatures) {
      const key = cr.emoji;
      if (!groups[key]) groups[key] = { emoji: cr.emoji, name: cr.name || cr.emoji, count: 0 };
      groups[key].count++;
    }
    let creatureRows = '';
    for (const g of Object.values(groups)) {
      creatureRows += `<div class="tooltip-creature">${g.emoji} ${g.name} × ${g.count}</div>`;
    }
    html += `<div class="tooltip-section"><div class="tooltip-label">Creature</div>${creatureRows}</div>`;
  } else {
    html += `<div class="tooltip-section"><div class="tooltip-label">Creature</div><div class="tooltip-creature">none</div></div>`;
  }

  // Civilization panel
  if (cell.civilization) {
    html += `<div class="tooltip-section"><div class="tooltip-label">Civilization</div><div class="tooltip-civilization">🏛️ ${cell.civilization}</div></div>`;
  } else {
    html += `<div class="tooltip-section"><div class="tooltip-label">Civilization</div><div class="tooltip-civilization">none</div></div>`;
  }

  html += '</div>';
  tooltipEl.innerHTML = html;
  tooltipEl.classList.remove('hidden');

  // Position tooltip near the clicked cell
  const rect = cellDiv.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = rect.left;

  // Keep tooltip within viewport
  const tooltipRect = tooltipEl.getBoundingClientRect();
  if (left + tooltipRect.width > window.innerWidth - 8) {
    left = window.innerWidth - tooltipRect.width - 8;
  }
  if (top + tooltipRect.height > window.innerHeight - 8) {
    top = rect.top - tooltipRect.height - 8;
  }

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}

function hideTooltip() {
  tooltipEl.classList.add('hidden');
}
