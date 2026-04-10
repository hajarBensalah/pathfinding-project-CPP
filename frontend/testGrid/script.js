/* ============================================
   PATHFINDER — ENTRY POINT
   Boots the app and wires HTML onclick handlers
   ============================================ */

import { state } from './state.js';
import { resizeCanvases, initGridState } from './grid.js';
import { drawGrid } from './renderer.js';
import { attachEvents } from './events.js';
import { setMode, selectAlgo, selectHeuristic, selectSpeed, selectTool,
         stopVisualization, resetAll } from './ui.js';
import { generateMaze, clearWalls } from './maze.js';
import { startVisualization } from './modes.js';

// Expose functions called from HTML onclick attributes
window.setMode            = setMode;
window.selectAlgo         = selectAlgo;
window.selectHeuristic    = selectHeuristic;
window.selectSpeed        = selectSpeed;
window.selectTool         = selectTool;
window.generateMaze       = generateMaze;
window.clearWalls         = clearWalls;
window.startVisualization = startVisualization;
window.stopVisualization  = stopVisualization;
window.resetAll           = resetAll;

// ============================================
// BOOT
// ============================================
window.addEventListener('load', () => {
    state.canvas1 = document.getElementById('gridCanvas1');
    state.ctx1    = state.canvas1.getContext('2d');
    state.canvas2 = document.getElementById('gridCanvas2');
    state.ctx2    = state.canvas2.getContext('2d');
    resizeCanvases();
    state.startPos = { row: Math.floor(state.ROWS1 / 2), col: 2 };
    state.goalPos  = { row: Math.floor(state.ROWS1 / 2), col: state.COLS1 - 3 };
    initGridState(1);
    drawGrid(1);
    attachEvents(state.canvas1, 1);
    attachEvents(state.canvas2, 2);
    window.addEventListener('resize', onResize);
});

function onResize() {
    resizeCanvases();
    initGridState(1);
    if (state.mode === 'compare') initGridState(2);
    drawGrid(1);
    if (state.mode === 'compare') drawGrid(2);
}
