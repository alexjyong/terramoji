// Terramoji — Input Dismissal Regression Tests
// Verifies that tooltip dismissal behaves correctly and does not flicker.
// These tests guard against regressions from T41 (tooltip flicker fix).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ */
/* Read input.js source and check for known-bad patterns               */
/* ------------------------------------------------------------------ */

const inputSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'input.js'), 'utf8');

// --- T41a: No global document.pointerdown handler that dismisses tooltip ---
// The broken code had: document.addEventListener('pointerdown', ...) that checked
// tooltip visibility and hid it on any outside tap. This caused the tooltip to
// show then immediately hide on the same tap event.
(function testNoGlobalPointerdownDismiss() {
  // There should be no document.pointerdown listener for tooltip dismissal.
  // The only document.pointerdown usage should not exist — grid uses gridEl.pointerdown.
  const matches = inputSource.match(/document\.addEventListener\s*\(\s*['"]pointerdown['"]/g);
  assert.ok(
    !matches || matches.length === 0,
    'Should not have document.addEventListener("pointerdown") for tooltip dismiss — causes flicker on mobile'
  );
  console.log('  T41a no global pointerdown tooltip dismiss: PASS');
})();

// --- T41b: No tooltipEl click handler that dismisses tooltip ---
// This handler was added during T41 but caused click-to-dismiss on the tooltip
// itself, which fires immediately after pointerdown on mobile.
(function testNoTooltipClickDismiss() {
  const hasTooltipClick = /tooltipEl\.addEventListener\s*\(\s*['"]click['"]/.test(inputSource);
  assert.ok(
    !hasTooltipClick,
    'Should not have tooltipEl.click handler — causes immediate dismiss on mobile tap'
  );
  console.log('  T41b no tooltip click dismiss handler: PASS');
})();

// --- T41c: No inspectJustShown flag that dismisses on pointermove micro-movements ---
// The inspectJustShown flag was meant to dismiss stale tooltips during drag, but
// pointermove fires on tiny finger jitters on mobile, causing instant dismissal.
(function testNoInspectJustShown() {
  const hasFlag = /inspectJustShown/.test(inputSource);
  assert.ok(
    !hasFlag,
    'Should not have inspectJustShown flag — causes flicker from pointermove micro-movements on mobile'
  );
  console.log('  T41c no inspectJustShown flag: PASS');
})();

// --- T41d: Tooltip dismissal only via Escape key ---
// The working main branch only dismissed the tooltip via Escape key.
// Tool handlers (biome, monolith, civ, inspect toggle) call hideTooltip() as a side
// effect of switching tools, which is fine.
(function testEscapeKeyDismissExists() {
  const hasEscape = /document\.addEventListener\s*\(\s*['"]keydown['"]/.test(inputSource) &&
                    /Escape/.test(inputSource) &&
                    /hideTooltip/.test(inputSource);
  assert.ok(
    hasEscape,
    'Should have Escape key handler that calls hideTooltip'
  );
  console.log('  T41d Escape key dismiss exists: PASS');
})();

// --- T41e: Grid uses pointerdown (not mousedown) for mobile compatibility ---
// This branch switched from mousedown to pointerdown for touch support.
// Verify pointerdown is used on gridEl.
(function testGridUsesPointerdown() {
  const hasGridPointerdown = /gridEl\.addEventListener\s*\(\s*['"]pointerdown['"]/.test(inputSource);
  assert.ok(
    hasGridPointerdown,
    'Grid should use pointerdown for mobile touch compatibility'
  );
  console.log('  T41e grid uses pointerdown: PASS');
})();

// --- T41f: Grid does not use mousedown (old main branch approach) ---
(function testGridNoMousedown() {
  const hasMousedown = /gridEl\.addEventListener\s*\(\s*['"]mousedown['"]/.test(inputSource);
  assert.ok(
    !hasMousedown,
    'Grid should not use mousedown — switched to pointerdown for mobile'
  );
  console.log('  T41f grid does not use mousedown: PASS');
})();

// --- T41g: hideTooltip() is called by tool switchers (biome, monolith, civ, inspect) ---
// When switching tools, the tooltip should be hidden. This is the intended dismiss path.
(function testToolSwitchersHideTooltip() {
  const lines = inputSource.split('\n');
  let biomeHideTooltip = false;
  let monolithHideTooltip = false;
  let civHideTooltip = false;
  let inspectHideTooltip = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Check biome button handler context
    if (line.includes('biome-buttons') && line.includes('forEach')) {
      // Look for hideTooltip in next 10 lines
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('hideTooltip')) { biomeHideTooltip = true; break; }
      }
    }
    if (line.includes('monolithBtn') && line.includes('addEventListener')) {
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('hideTooltip')) { monolithHideTooltip = true; break; }
      }
    }
    if (line.includes('civBtn') && line.includes('addEventListener')) {
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('hideTooltip')) { civHideTooltip = true; break; }
      }
    }
    if (line.includes('inspectBtn') && line.includes('addEventListener')) {
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('hideTooltip')) { inspectHideTooltip = true; break; }
      }
    }
  }

  assert.ok(biomeHideTooltip, 'Biome button handler should call hideTooltip');
  assert.ok(monolithHideTooltip, 'Monolith button handler should call hideTooltip');
  assert.ok(civHideTooltip, 'Civ button handler should call hideTooltip');
  assert.ok(inspectHideTooltip, 'Inspect button handler should call hideTooltip');
  console.log('  T41g tool switchers hide tooltip: PASS');
})();

console.log('\n✅ All input dismissal tests passed!');
