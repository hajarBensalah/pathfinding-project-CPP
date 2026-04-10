import { state } from './state.js';
import { CELL, CELL_SIZE } from './constants.js';

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export function gs(g)   { return g === 1 ? state.gridState1 : state.gridState2; }
export function par(g)  { return g === 1 ? state.parents1   : state.parents2;   }
export function ctx(g)  { return g === 1 ? state.ctx1       : state.ctx2;       }
export function rows(g) { return g === 1 ? state.ROWS1 : state.ROWS2; }
export function cols(g) { return g === 1 ? state.COLS1 : state.COLS2; }

export function setCell(col, row, cellState, g) {
    const s = gs(g);
    if (s && s[row]) s[row][col] = cellState;
}

export function initGridState(g) {
    const R = g === 1 ? state.ROWS1 : state.ROWS2;
    const C = g === 1 ? state.COLS1 : state.COLS2;
    const gs2  = Array.from({length:R}, () => Array(C).fill(CELL.EMPTY));
    const par2 = Array.from({length:R}, () => Array(C).fill(null));
    gs2[state.startPos.row][state.startPos.col] = CELL.START;
    gs2[state.goalPos.row][state.goalPos.col]   = CELL.GOAL;
    if (g === 1) { state.gridState1 = gs2; state.parents1 = par2; }
    else         { state.gridState2 = gs2; state.parents2 = par2; }
}

export function syncWallsToGrid2() {
    const R = Math.min(state.ROWS1, state.ROWS2), C = Math.min(state.COLS1, state.COLS2);
    for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++)
            state.gridState2[r][c] = state.gridState1[r][c] === CELL.WALL ? CELL.WALL : CELL.EMPTY;

    const s  = clampToWalkable(state.startPos, 2);
    const g2 = clampToWalkable(state.goalPos,  2);
    state.startPos = s;
    state.goalPos  = g2;

    clearStartGoal(1); clearStartGoal(2);
    state.gridState1[state.startPos.row][state.startPos.col] = CELL.START;
    state.gridState1[state.goalPos.row][state.goalPos.col]   = CELL.GOAL;
    state.gridState2[state.startPos.row][state.startPos.col] = CELL.START;
    state.gridState2[state.goalPos.row][state.goalPos.col]   = CELL.GOAL;
}

export function clearStartGoal(g) {
    const s = gs(g); if (!s) return;
    for (let r = 0; r < rows(g); r++)
        for (let c = 0; c < cols(g); c++)
            if (s[r][c] === CELL.START || s[r][c] === CELL.GOAL)
                s[r][c] = CELL.EMPTY;
}

// Find nearest walkable cell to a position within a given grid
export function clampToWalkable(pos, g) {
    const R = rows(g), C = cols(g);
    const s = gs(g);
    if (!s) return pos;

    // First clamp to grid bounds (leave 1 cell margin)
    let row = Math.max(1, Math.min(R - 2, pos.row));
    let col = Math.max(1, Math.min(C - 2, pos.col));

    if (s[row][col] !== CELL.WALL) return { row, col };

    // BFS outward from clamped position to find nearest non-wall cell
    const visited = new Set();
    const queue = [{ row, col }];
    visited.add(`${row},${col}`);
    while (queue.length) {
        const cur = queue.shift();
        if (s[cur.row]?.[cur.col] !== CELL.WALL) return { row: cur.row, col: cur.col };
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nr = cur.row + dr, nc = cur.col + dc;
            const key = `${nr},${nc}`;
            if (nr >= 1 && nr < R-1 && nc >= 1 && nc < C-1 && !visited.has(key)) {
                visited.add(key);
                queue.push({ row: nr, col: nc });
            }
        }
    }
    return { row, col }; // fallback
}

export function resizeCanvases() {
    const area  = document.getElementById('gridsArea');
    const areaW = area.clientWidth  - 28;
    const areaH = area.clientHeight - 48;
    const n   = state.mode === 'compare' ? 2 : 1;
    const gap = state.mode === 'compare' ? 12 : 0;
    const gW  = Math.floor((areaW - gap * (n - 1)) / n);
    const gH  = state.mode === 'single'
        ? Math.min(areaH, Math.floor(gW * 0.5))
        : areaH;

    // In compare mode shrink cell size so both grids fit comfortably
    const cs = state.mode === 'compare' ? 14 : CELL_SIZE;

    state.COLS1 = state.COLS2 = Math.floor(gW / cs);
    state.ROWS1 = state.ROWS2 = Math.floor(gH / cs);
    state.canvas1.width  = state.canvas2.width  = state.COLS1 * cs;
    state.canvas1.height = state.canvas2.height = state.ROWS1 * cs;

    // Store active cell size for drawing
    state.activeCellSize = cs;
}
