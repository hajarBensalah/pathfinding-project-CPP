import { state } from './state.js';
import { CELL } from './constants.js';
import { gs, ctx, rows, cols, setCell } from './grid.js';
import { drawCell } from './renderer.js';

export function attachEvents(canvas, g) {
    canvas.addEventListener('mousedown', e => onDown(e, g));
    canvas.addEventListener('mousemove', e => onMove(e, g));
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); const c = mCell(e,canvas,g); if(c) eraseCell(c,g); });
    window.addEventListener('mouseup', () => { state.drawingWalls = false; state.draggingWhat = null; });
}

function mCell(e, canvas, g) {
    const cs = state.activeCellSize;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cs);
    const row = Math.floor((e.clientY - rect.top)  / cs);
    if (row < 0 || row >= rows(g) || col < 0 || col >= cols(g)) return null;
    return { row, col };
}

export function onDown(e, g) {
    if (state.isRunning) return;
    const canvas = g === 1 ? state.canvas1 : state.canvas2;
    const cell = mCell(e, canvas, g);
    if (!cell) return;
    const cellState = gs(g)[cell.row][cell.col];
    if (cellState === CELL.START)      { state.draggingWhat = 'start'; }
    else if (cellState === CELL.GOAL)  { state.draggingWhat = 'goal';  }
    else                               { state.drawingWalls = true; paintCell(cell.col, cell.row); }
}

export function onMove(e, g) {
    if (state.isRunning) return;
    const canvas = g === 1 ? state.canvas1 : state.canvas2;
    const cell = mCell(e, canvas, g);
    if (!cell) return;
    const {row, col} = cell;

    if (state.draggingWhat) {
        const s = gs(g)[row][col];
        if (s === CELL.WALL || s === CELL.START || s === CELL.GOAL) return;

        if (state.draggingWhat === 'start') {
            // clear old from both grids
            const old = state.startPos;
            [1,2].forEach(gg => {
                const gs2 = gs(gg); if (!gs2 || !gs2[old.row]) return;
                gs2[old.row][old.col] = CELL.EMPTY;
                drawCell(ctx(gg), old.col, old.row, CELL.EMPTY);
            });
            state.startPos = {row, col};
            [1,2].forEach(gg => {
                const gs2 = gs(gg); if (!gs2 || !gs2[row]) return;
                gs2[row][col] = CELL.START;
                drawCell(ctx(gg), col, row, CELL.START);
            });
        } else {
            const old = state.goalPos;
            [1,2].forEach(gg => {
                const gs2 = gs(gg); if (!gs2 || !gs2[old.row]) return;
                gs2[old.row][old.col] = CELL.EMPTY;
                drawCell(ctx(gg), old.col, old.row, CELL.EMPTY);
            });
            state.goalPos = {row, col};
            [1,2].forEach(gg => {
                const gs2 = gs(gg); if (!gs2 || !gs2[row]) return;
                gs2[row][col] = CELL.GOAL;
                drawCell(ctx(gg), col, row, CELL.GOAL);
            });
        }
    } else if (state.drawingWalls) {
        paintCell(col, row);
    }
}

export function paintCell(col, row) {
    const cellState = gs(1)[row] ? gs(1)[row][col] : null;
    if (cellState === CELL.START || cellState === CELL.GOAL) return;
    const newState = state.selectedTool === 'wall' ? CELL.WALL : CELL.EMPTY;
    // paint both grids when in compare/bench so they stay in sync
    const grids = (state.mode === 'compare' || state.mode === 'benchmark') ? [1,2] : [1];
    grids.forEach(g => {
        const gs2 = gs(g); if (!gs2 || !gs2[row] || col >= cols(g)) return;
        gs2[row][col] = newState;
        drawCell(ctx(g), col, row, newState);
    });
}

export function eraseCell(cell, g) {
    const {col, row} = cell;
    const cellState = gs(g)[row][col];
    if (cellState === CELL.START || cellState === CELL.GOAL) return;
    setCell(col, row, CELL.EMPTY, g);
    drawCell(ctx(g), col, row, CELL.EMPTY);
}
