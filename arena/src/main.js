import { ArenaScene } from './game/ArenaScene.js';

const canvas = document.getElementById('game');
const winEl = document.getElementById('winbanner');
const scene = new ArenaScene(canvas, {
  debugEl: document.getElementById('debug'),
  hudEl: document.getElementById('hud'),
  winEl,
  resetBtn: document.getElementById('resetBtn'),
  debugChk: document.getElementById('debugChk'),
});

// The reset button inside the win banner.
document.getElementById('rematchBtn')?.addEventListener('click', () => scene.combat.reset(scene.simTime));

scene.start();

// Exposed for automated testing / tinkering in the console.
window.__arena = scene;
