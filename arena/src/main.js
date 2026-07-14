import { ArenaScene } from './game/ArenaScene.js';
import { TuningPanel } from './game/TuningPanel.js';

const canvas = document.getElementById('game');
const loadingEl = document.getElementById('loading');

const scene = new ArenaScene(canvas, {
  debugEl: document.getElementById('debug'),
  hudEl: document.getElementById('hud'),
  winEl: document.getElementById('winbanner'),
  resetBtn: document.getElementById('resetBtn'),
  debugChk: document.getElementById('debugChk'),
  rigChk: document.getElementById('rigChk'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  zoomResetBtn: document.getElementById('zoomResetBtn'),
  zoomLabel: document.getElementById('zoomLabel'),
});

// Rematch button on the win banner restarts the FT20 match.
document.getElementById('rematchBtn')?.addEventListener('click', () => scene.combat.reset(scene.simTime));

// Dev-only playtest tuning panel (toggle button; or open with #tune in the URL).
const tuning = new TuningPanel(scene, {
  panelEl: document.getElementById('tuningPanel'),
  toggleBtn: document.getElementById('tuneBtn'),
});

// Hold the Diggerz loading screen until the real assets are ready, then start.
scene.ready.finally(() => {
  if (loadingEl) {
    loadingEl.style.opacity = '0';
    setTimeout(() => { loadingEl.style.display = 'none'; }, 350);
  }
  scene.start();
});

// Exposed for automated testing / tinkering in the console.
window.__arena = scene;
window.__tuning = tuning;
