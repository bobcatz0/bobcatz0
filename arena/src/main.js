import { ArenaScene } from './game/ArenaScene.js';

const canvas = document.getElementById('game');
const loadingEl = document.getElementById('loading');

const scene = new ArenaScene(canvas, {
  debugEl: document.getElementById('debug'),
  hudEl: document.getElementById('hud'),
  resetBtn: document.getElementById('resetBtn'),
  debugChk: document.getElementById('debugChk'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  zoomResetBtn: document.getElementById('zoomResetBtn'),
  zoomLabel: document.getElementById('zoomLabel'),
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
