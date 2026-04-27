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
