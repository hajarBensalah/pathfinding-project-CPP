import { state } from './state.js';
import { CELL } from './constants.js';
import { clampToWalkable, syncWallsToGrid2 } from './grid.js';
import { drawGrid } from './renderer.js';
import { resetVisuals } from './ui.js';

export function generateMaze(type) {
    if (state.isRunning) return;
    resetVisuals();
    if (type === 'binary')    binaryTree();
    if (type === 'recursive') recursiveDivision();

    // After maze generation on grid1, clamp start/goal to walkable cells
    const s = clampToWalkable(state.startPos, 1);
    const g = clampToWalkable(state.goalPos,  1);
    // Make sure they don't land on the same cell
    state.startPos = s;
    state.goalPos  = (g.row === s.row && g.col === s.col)
        ? clampToWalkable({ row: state.ROWS1 - 2, col: state.COLS1 - 2 }, 1)
        : g;

    state.gridState1[state.startPos.row][state.startPos.col] = CELL.START;
    state.gridState1[state.goalPos.row][state.goalPos.col]   = CELL.GOAL;

    if (state.mode === 'compare' || state.mode === 'benchmark') {
        syncWallsToGrid2();
        drawGrid(2);
    }
    drawGrid(1);
}

function binaryTree() {
    const R = state.ROWS1, C = state.COLS1;
    for (let r=0;r<R;r++) for(let c=0;c<C;c++) state.gridState1[r][c] = CELL.WALL;
    for (let r=1;r<R;r+=2) {
        for (let c=1;c<C;c+=2) {
            state.gridState1[r][c] = CELL.EMPTY;
            const opts = [];
            if (r-2 > 0) opts.push('up');
            if (c+2 < C-1) opts.push('right');
            if (!opts.length) continue;
            const dir = opts[Math.floor(Math.random()*opts.length)];
            if (dir==='up') state.gridState1[r-1][c] = CELL.EMPTY;
            else            state.gridState1[r][c+1] = CELL.EMPTY;
        }
    }
    // generateMaze() will place start/goal after clamping
}

function recursiveDivision() {
    const R = state.ROWS1, C = state.COLS1;
    for (let r=0;r<R;r++) for(let c=0;c<C;c++) state.gridState1[r][c]=CELL.EMPTY;
    for (let r=0;r<R;r++) { state.gridState1[r][0]=CELL.WALL; state.gridState1[r][C-1]=CELL.WALL; }
    for (let c=0;c<C;c++) { state.gridState1[0][c]=CELL.WALL; state.gridState1[R-1][c]=CELL.WALL; }
    divide(1,1,R-2,C-2);
    // generateMaze() will place start/goal after clamping
}

function divide(rS,cS,rE,cE) {
    const h=rE-rS, w=cE-cS;
    if(h<2||w<2) return;
    const horiz = h>w ? true : w>h ? false : Math.random()<0.5;
    if(horiz){
        const wR = rS+1+2*Math.floor(Math.random()*Math.floor(h/2));
        const pC = cS+2*Math.floor(Math.random()*Math.ceil(w/2));
        for(let c=cS;c<=cE;c++) if(c!==pC) state.gridState1[wR][c]=CELL.WALL;
        divide(rS,cS,wR-1,cE); divide(wR+1,cS,rE,cE);
    } else {
        const wC = cS+1+2*Math.floor(Math.random()*Math.floor(w/2));
        const pR = rS+2*Math.floor(Math.random()*Math.ceil(h/2));
        for(let r=rS;r<=rE;r++) if(r!==pR) state.gridState1[r][wC]=CELL.WALL;
        divide(rS,cS,rE,wC-1); divide(rS,wC+1,rE,cE);
    }
}

export function clearWalls() {
    if (state.isRunning) return;
    [state.gridState1, state.gridState2].forEach((gs2, idx) => {
        if (!gs2) return;
        const R = idx===0?state.ROWS1:state.ROWS2, C = idx===0?state.COLS1:state.COLS2;
        for(let r=0;r<R;r++) for(let c=0;c<C;c++) if(gs2[r][c]===CELL.WALL) gs2[r][c]=CELL.EMPTY;
    });
    drawGrid(1); if (state.mode==='compare') drawGrid(2);
}
