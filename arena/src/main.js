import { ArenaScene } from './game/ArenaScene.js';

const canvas = document.getElementById('game');
const scene = new ArenaScene(canvas, {
  debugEl: document.getElementById('debug'),
  hudEl: document.getElementById('hud'),
});
scene.start();

// Exposed for automated testing / tinkering in the console.
window.__arena = scene;
