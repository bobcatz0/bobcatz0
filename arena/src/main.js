import { ArenaScene } from './game/ArenaScene.js';

const canvas = document.getElementById('game');
const winEl = document.getElementById('winbanner');
const scene = new ArenaScene(canvas, {
  debugEl: document.getElementById('debug'),
  hudEl: document.getElementById('hud'),
  winEl,
  resetBtn: document.getElementById('resetBtn'),
});

// Both reset buttons (the always-visible one and the one in the win banner).
document.getElementById('rematchBtn')?.addEventListener('click', () => scene.combat.reset());

scene.start();

// Exposed for automated testing / tinkering in the console.
window.__arena = scene;
