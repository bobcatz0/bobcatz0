import { ArenaScene } from './game/ArenaScene.js';

const canvas = document.getElementById('game');
const loadingEl = document.getElementById('loading');
const winEl = document.getElementById('winbanner');

const scene = new ArenaScene(canvas, {
  debugEl: document.getElementById('debug'),
  hudEl: document.getElementById('hud'),
  winEl,
  resetBtn: document.getElementById('resetBtn'),
  debugChk: document.getElementById('debugChk'),
});

document.getElementById('rematchBtn')?.addEventListener('click', () => scene.combat.reset(scene.simTime));

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
